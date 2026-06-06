// Phase 2: Real PTY support for interactive terminals.
// Uses portable-pty for cross-platform PTY (ConPTY on Windows).
//
// SECURITY (per AGENT.md + security-review skill):
// - We only spawn controlled processes: default user shell (powershell.exe on Windows)
//   or the known agent binaries from the UI (claude, codex, gemini, aider).
// - No free-form command execution from user input or agent context yet.
// - PTY handles are kept in a process-local map; output is streamed only to the
//   requesting pane via Tauri events (never exposed globally without auth in future).
// - Kill on drop / explicit kill to avoid orphan processes.
// - For orchestration: stripping is read-only transformation on output; no new execution paths.

use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

/// Simple manager for multiple concurrent PTYs.
/// Keyed by string id (we use the pane index as string "0", "1", ... from frontend).
///
/// For orchestration foundation we also keep a bounded recent-output buffer per PTY
/// so the UI can later "capture" what an agent printed (for strip + review / re-use).
/// Buffers are only populated for terminals we created via the controlled allow-list path.
struct PtyManager {
    ptys: Mutex<HashMap<String, PtyPair>>,
    /// Bounded recent output (last ~16k chars) for capture + strip use cases.
    output_buffers: Mutex<HashMap<String, String>>,
}

impl Default for PtyManager {
    fn default() -> Self {
        Self {
            ptys: Mutex::new(HashMap::new()),
            output_buffers: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
fn create_terminal(
    app: AppHandle,
    state: State<'_, Arc<PtyManager>>,
    id: String,
    command: Option<String>,
) -> Result<(), String> {
    let pty_system = native_pty_system();

    // Reasonable default size; frontend will send resizes later.
    let pair = pty_system
        .openpty(PtySize {
            rows: 30,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("openpty failed: {e}"))?;

    // Choose a safe default shell.
    // On Windows we prefer powershell for a modern experience.
    // Later we can make this configurable or detect $env:COMSPEC.
    let cmd = if let Some(c) = command {
        // Only allow a very small allow-list for now (defense in depth).
        // In a real product this list would come from a user-editable registry
        // with validation.
        let allowed = ["powershell.exe", "cmd.exe", "claude", "codex", "gemini", "aider", "opencode"];
        if !allowed.iter().any(|a| c.eq_ignore_ascii_case(a) || c.ends_with(a)) {
            return Err("command not in allow list for this Phase 2 slice".into());
        }

        if cfg!(windows) && ["codex", "gemini", "aider", "opencode"].iter().any(|a| c.eq_ignore_ascii_case(a)) {
            // These agents are frequently installed via npm/pip on Windows and resolve to
            // .cmd shims in %APPDATA%\npm (or similar). Direct CreateProcessW on the shim
            // fails with "not a valid Win32 application" (os error 193).
            //
            // We launch via `cmd.exe /c <command>` so that Windows command processor + PATHEXT
            // can resolve the proper executable/script. This is safe because we only ever pass
            // names from our hard-coded allow-list (controlled paths only).
            //
            // Note: cmd.exe becomes the direct child of the PTY; the agent is its child.
            // This is acceptable for interactive REPL-style agents and matches how many
            // terminal emulators handle such tools on Windows.
            let mut cb = CommandBuilder::new("cmd.exe");
            cb.arg("/c");
            cb.arg(c);
            cb
        } else {
            CommandBuilder::new(&c)
        }
    } else if cfg!(windows) {
        let mut c = CommandBuilder::new("powershell.exe");
        c.arg("-NoLogo");
        // -NoProfile is nice for faster/cleaner start but can be surprising; keep simple for now.
        c
    } else {
        CommandBuilder::new("bash")
    };

    // Spawn the child process attached to the slave side of the PTY.
    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn failed: {e}"))?;

    // Store the master side so we can read/write/resize from the app.
    {
        let mut map = state.ptys.lock().map_err(|e| e.to_string())?;
        map.insert(id.clone(), pair);
    }

    // Also init the output buffer for this terminal (orchestration capture foundation).
    {
        let mut bufs = state.output_buffers.lock().map_err(|e| e.to_string())?;
        bufs.insert(id.clone(), String::new());
    }

    // Start a background reader thread that streams output to the frontend.
    // We capture a clone of the AppHandle (cheap) and the id.
    let reader_id = id.clone();
    let reader_app = app.clone();

    // Clone the Arc<PtyManager> so the reader thread can also update the output buffer.
    // This is safe: the thread only ever appends/truncates for IDs we created.
    let pty_mgr_for_reader: Arc<PtyManager> = state.inner().clone();

    // We need to clone the reader from the master we just stored.
    // Because the pair is now inside the Mutex, we extract a fresh reader here.
    let master_reader = {
        let mut map = state.ptys.lock().map_err(|e| e.to_string())?;
        let pair = map.get_mut(&reader_id).ok_or("pty disappeared right after create")?;
        pair.master
            .try_clone_reader()
            .map_err(|e| format!("clone reader: {e}"))?
    };

    thread::spawn(move || {
        let mut buf = [0u8; 8192];
        let mut reader = master_reader;

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    // Emit to any listeners (the specific TerminalPane will filter by id).
                    let _ = reader_app.emit(
                        "terminal-output",
                        serde_json::json!({
                            "id": reader_id,
                            "data": chunk
                        }),
                    );

                    // Orchestration foundation: also append to the bounded per-PTY buffer
                    // so we can later do "get recent output → strip" without touching the live xterm.
                    if let Ok(mut bufs) = pty_mgr_for_reader.output_buffers.lock() {
                        let entry = bufs.entry(reader_id.clone()).or_insert_with(String::new);
                        entry.push_str(&chunk);
                        // Bound memory: keep only the most recent ~16k chars per terminal.
                        const MAX: usize = 16384;
                        if entry.len() > MAX {
                            let start = entry.len() - (MAX / 2);
                            *entry = entry[start..].to_string();
                        }
                    }
                }
                Err(_) => break,
            }
        }
        // When the reader ends, we could optionally emit a "terminal-closed" event.
    });

    Ok(())
}

#[tauri::command]
fn write_to_terminal(
    state: State<'_, Arc<PtyManager>>,
    id: String,
    data: String,
) -> Result<(), String> {
    let mut map = state.ptys.lock().map_err(|e| e.to_string())?;
    if let Some(pair) = map.get_mut(&id) {
        let mut writer = pair
            .master
            .take_writer()
            .map_err(|e| format!("take_writer: {e}"))?;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| format!("pty write failed: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn resize_terminal(
    state: State<'_, Arc<PtyManager>>,
    id: String,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let mut map = state.ptys.lock().map_err(|e| e.to_string())?;
    if let Some(pair) = map.get_mut(&id) {
        pair.master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| format!("resize failed: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn kill_terminal(state: State<'_, Arc<PtyManager>>, id: String) -> Result<(), String> {
    let mut map = state.ptys.lock().map_err(|e| e.to_string())?;
    map.remove(&id);

    // Also drop the output buffer (orchestration capture).
    if let Ok(mut bufs) = state.output_buffers.lock() {
        bufs.remove(&id);
    }

    // Dropping the PtyPair will close the master/slave and (best effort) terminate the child.
    Ok(())
}

/// Orchestration foundation: strip common agent stop/termination messages
/// so captured output is clean for further use (e.g. pasting back, diff, delegation).
/// This is a pure transformation; no execution side effects.
///
/// SECURITY: read-only string transform on PTY output from controlled processes only.
/// No new spawn or FS paths introduced here. Expand phrases only from verified real samples.
#[tauri::command]
fn strip_claude_stop_messages(output: String) -> String {
    // Common stop/termination phrases from Claude Code (and similar agent CLIs).
    // Keep conservative + precise; add only after seeing real output.
    // Line-based scan for robustness across multi-line dumps (agents often end with a banner line).
    let stop_phrases = [
        "Claude Code has stopped",
        "Claude has stopped",
        "Claude Code has stopped.",
        "The command has stopped",
        "has stopped",
        "Session ended",
        "Agent stopped",
        "Task completed",
        "Execution finished",
        "╭─", // seen in some Claude TUI end states
    ];

    // Prefer line-aware truncate so we drop the stop banner + everything after it
    // even when output contains embedded newlines from the agent session.
    let lines: Vec<&str> = output.lines().collect();
    for (i, line) in lines.iter().enumerate() {
        if stop_phrases.iter().any(|p| line.contains(p)) {
            let kept = lines[..i].join("\n").trim_end().to_string();
            return kept + "\n[orchestration: stop message stripped]";
        }
    }

    // Fallback (no stop phrase found): return original (no marker).
    output
}

/// Orchestration foundation: return the recent captured output for a given terminal id.
/// This lets the UI (or future vibeforge-agent) retrieve what an agent actually printed
/// so we can run strip_claude_stop_messages on it after the agent finishes.
/// Pure read-only; only data that came from PTYs we created via the allow-listed path.
/// SECURITY: no execution, no FS, no mutation of live PTY — just a bounded view of already-emitted bytes.
#[tauri::command]
fn get_terminal_output(state: State<'_, Arc<PtyManager>>, id: String) -> Result<String, String> {
    let bufs = state.output_buffers.lock().map_err(|e| e.to_string())?;
    Ok(bufs.get(&id).cloned().unwrap_or_default())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::new(PtyManager::default()))
        .invoke_handler(tauri::generate_handler![
            create_terminal,
            write_to_terminal,
            resize_terminal,
            kill_terminal,
            strip_claude_stop_messages,
            get_terminal_output
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
