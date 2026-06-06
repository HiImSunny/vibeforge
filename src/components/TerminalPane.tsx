import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

/**
 * TerminalPane — Phase 2 real PTY-backed terminal (xterm + portable-pty)
 *
 * - Real xterm.js (v6) + FitAddon.
 * - Themed to Vibeforge calm technical palette.
 * - On mount (or command/restartKey change): creates a real PTY via Tauri (default powershell or explicit allowed command).
 * - Bidirectional: onData → write_to_terminal; "terminal-output" events → term.write (PTY provides echo).
 * - Resize: fit + resize_terminal on window and container size changes.
 * - Cleanup: unlisten + kill_terminal + dispose on unmount or re-spawn.
 * - Follows FileTree patterns + UI design (calm, dense, agent accents, purposeful, hit areas).
 *
 * Security: only controlled commands (see Rust allow-list in lib.rs). Never arbitrary user strings as program.
 */

interface TerminalPaneProps {
  id: number | string;
  title?: string;
  accent?: string; // "claude" | "codex" | "gemini" | "general"
  /** Optional explicit command to spawn (must be in Rust allow-list: powershell.exe, claude, aider, etc.). null/undefined = default shell. */
  command?: string | null;
  /** Bump this to force kill + re-create the PTY for the same id (used by parent when launching agents into existing slots). */
  restartKey?: number;
  onData?: (data: string) => void;
  onClose?: () => void;
}

export default function TerminalPane({ id, title, accent = "general", command, restartKey, onData, onClose }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "var(--vf-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace)",
      fontSize: 12,
      lineHeight: 1.35,
      theme: {
        background: "#0a0c10", // --vf-bg
        foreground: "#a3aab6", // matches .vf-pane-body
        cursor: "#c5c9d1",
        selectionBackground: "rgba(47, 58, 71, 0.6)",
        black: "#0e1015",
        red: "#e06c75",
        green: "#7be38f",
        yellow: "#e5c07b",
        blue: "#9ec1ff",
        magenta: "#d0a6ff",
        cyan: "#56b6c2",
        white: "#e6e8eb",
        brightBlack: "#4b5563",
        brightRed: "#e06c75",
        brightGreen: "#7be38f",
        brightYellow: "#e5c07b",
        brightBlue: "#9ec1ff",
        brightMagenta: "#d0a6ff",
        brightCyan: "#56b6c2",
        brightWhite: "#e6e8eb",
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitRef.current = fitAddon;

    const paneId = String(id);
    const spawnCommand = command ?? null;

    // === Real PTY wiring ===
    // Spawn (or re-spawn) a controlled PTY. command is validated against allow-list in Rust (lib.rs).
    // Only allow-listed program names (powershell.exe, claude, aider, ...) or default shell.
    invoke("create_terminal", { id: paneId, command: spawnCommand }).catch((e: any) => {
      console.error("create_terminal failed", e);
      // Better error state: visible, colored, actionable message inside the terminal.
      term.write(`\r\n\x1b[31m[PTY spawn failed: ${e}]\x1b[0m\r\n`);
      term.write(`\r\nYou can:\r\n  • Click ✕ then + New (or an agent button) to try again\r\n  • Ensure the agent CLI (claude, aider, ...) is in PATH if launching one\r\n`);
    });

    // Listen for output from our specific PTY and feed it to xterm.
    let unlisten: UnlistenFn | undefined;
    (async () => {
      unlisten = await listen<{ id: string; data: string }>("terminal-output", (event) => {
        const payload = event.payload;
        if (payload.id === paneId && termRef.current) {
          termRef.current.write(payload.data);
        }
      });
    })();

    // Keystrokes go to the real PTY. The PTY (shell or agent) is responsible for echo and output.
    term.onData((data) => {
      invoke("write_to_terminal", { id: paneId, data }).catch((e: any) => {
        console.warn("write_to_terminal failed", e);
      });
      onData?.(data);
    });

    // Reliable fit + resize to PTY. Call after fit so cols/rows are up-to-date.
    const fitAndResize = () => {
      try {
        fitAddon.fit();
        if (termRef.current) {
          const cols = termRef.current.cols;
          const rows = termRef.current.rows;
          invoke("resize_terminal", { id: paneId, cols, rows }).catch(() => {});
        }
      } catch {
        // ignore transient fit/resize races
      }
    };

    // Global window resize (covers app window changes)
    const handleWindowResize = () => {
      // rAF to let layout settle
      requestAnimationFrame(fitAndResize);
    };
    window.addEventListener("resize", handleWindowResize);

    // Per-pane container resize (grid pane size changes, splits later, etc.)
    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(fitAndResize);
      });
      ro.observe(containerRef.current);
    }

    // Initial fit + first resize notification (after xterm has painted)
    requestAnimationFrame(() => {
      fitAndResize();
    });

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      if (ro) {
        try { ro.disconnect(); } catch {}
      }
      if (unlisten) unlisten();
      // Kill the PTY on unmount or before re-spawn (best effort)
      invoke("kill_terminal", { id: paneId }).catch(() => {});
      try {
        term.dispose();
      } catch {}
      termRef.current = null;
      fitRef.current = null;
    };
  }, [id, onData, command, restartKey]);

  // Expose a way for parent to write output (used when real PTY streams chunks back)
  // For the stub slice we don't call it from outside yet.
  (window as any).__vfWriteToPane = (paneId: number | string, chunk: string) => {
    if (String(paneId) === String(id) && termRef.current) {
      termRef.current.write(chunk);
    }
  };

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    onClose?.();
  }

  const accentClass = accent === "claude" ? "claude" : accent === "codex" ? "codex" : accent === "gemini" ? "gemini" : "";

  return (
    <div className="vf-pane" data-pane-id={id}>
      <div className="vf-pane-header">
        <span className="label" style={{ fontFamily: "var(--vf-mono, ui-monospace, monospace)" }}>
          {title || `${id} • shell`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {accentClass && <span className={`vf-badge ${accentClass}`} style={{ fontSize: 9 }}>{accent}</span>}
          <button
            className="vf-btn"
            style={{ fontSize: 10, padding: "1px 6px", minHeight: 20, minWidth: 20, border: "none", background: "transparent" }}
            onClick={handleClose}
            title="Close terminal (kills PTY)"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="vf-pane-body"
        style={{ padding: 0, background: "#0a0c10", overflow: "hidden" }}
        onClick={() => termRef.current?.focus()}
      />
    </div>
  );
}
