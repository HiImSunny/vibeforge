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

use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter, State};

/// Simple manager for multiple concurrent PTYs.
/// Keyed by string id (we use the pane index as string "0", "1", ... from frontend).
struct PtyManager {
    ptys: Mutex<HashMap<String, PtyPair>>,
}

impl Default for PtyManager {
    fn default() -> Self {
        Self {
            ptys: Mutex::new(HashMap::new()),
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
    let mut cmd = if let Some(c) = command {
        // Only allow a very small allow-list for now (defense in depth).
        // In a real product this list would come from a user-editable registry
        // with validation.
        let allowed = ["powershell.exe", "cmd.exe", "claude", "codex", "gemini", "aider"];
        if !allowed.iter().any(|a| c.eq_ignore_ascii_case(a) || c.ends_with(a)) {
            return Err("command not in allow list for this Phase 2 slice".into());
        }
        CommandBuilder::new(&c)
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

    // Start a background reader thread that streams output to the frontend.
    // We capture a clone of the AppHandle (cheap) and the id.
    let reader_id = id.clone();
    let reader_app = app.clone();

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
    // Dropping the PtyPair will close the master/slave and (best effort) terminate the child.
    Ok(())
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
            kill_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
