import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";

/**
 * TerminalPane — Phase 2 real PTY viewer (xterm + portable-pty)
 *
 * - Pure viewer for an existing ptyId (PTY creation/kill is managed by parent list).
 * - Real xterm.js (v6) + FitAddon.
 * - Themed to Vibeforge calm technical palette.
 * - Bidirectional: onData → write_to_terminal; "terminal-output" events → term.write.
 * - Resize with fit + resize_terminal.
 * - Reports activity to parent via onActivity.
 * - Follows UI design + make-interfaces-feel-better.
 *
 * Lifecycle: Mount = attach listener. Unmount (when not focused) does not kill the PTY.
 */

interface TerminalPaneProps {
  /** The PTY id (string key) used in Rust PtyManager. This terminal must already have been created via create_terminal before mounting the viewer. */
  ptyId: string;
  title?: string;
  accent?: string; // "claude" | "codex" | "gemini" | "general"
  onData?: (data: string) => void;
  onClose?: () => void;
  /** Called when new output arrives (for activity indication in parent list). */
  onActivity?: (ptyId: string) => void;
}

export default function TerminalPane({ ptyId, title, accent = "general", onData, onClose, onActivity }: TerminalPaneProps) {
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

    const sessionPtyId = ptyId;

    // PTY creation is handled by the parent App (when adding a new session to the list).
    // This component is now a pure viewer for an existing ptyId.

    // Listen for output from this specific PTY.
    let unlisten: UnlistenFn | undefined;
    (async () => {
      unlisten = await listen<{ id: string; data: string }>("terminal-output", (event) => {
        const payload = event.payload;
        if (payload.id === sessionPtyId && termRef.current) {
          termRef.current.write(payload.data);
          onActivity?.(sessionPtyId);
        }
      });
    })();

    // Keystrokes go to the real PTY.
    term.onData((data) => {
      invoke("write_to_terminal", { id: sessionPtyId, data }).catch((e: any) => {
        console.warn("write_to_terminal failed", e);
      });
      onData?.(data);
    });

    const fitAndResize = () => {
      try {
        fitAddon.fit();
        if (termRef.current) {
          const cols = termRef.current.cols;
          const rows = termRef.current.rows;
          invoke("resize_terminal", { id: sessionPtyId, cols, rows }).catch(() => {});
        }
      } catch {}
    };

    const handleWindowResize = () => {
      requestAnimationFrame(fitAndResize);
    };
    window.addEventListener("resize", handleWindowResize);

    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => requestAnimationFrame(fitAndResize));
      ro.observe(containerRef.current);
    }

    requestAnimationFrame(fitAndResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      if (ro) { try { ro.disconnect(); } catch {} }
      if (unlisten) unlisten();
      // Kill is explicit from the terminal list in parent (do not kill on viewer unmount).
      try { term.dispose(); } catch {}
      termRef.current = null;
      fitRef.current = null;
    };
  }, [ptyId, onData, onActivity]);

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    onClose?.();
  }

  const accentClass = accent === "claude" ? "claude" : accent === "codex" ? "codex" : accent === "gemini" ? "gemini" : "";

  return (
    <div className="vf-pane" data-pty-id={ptyId}>
      {/* Viewer Header — closer to Stitch mock (Active badge + name) */}
      <div className="h-6 shrink-0 border-b-grid flex items-center px-md bg-surface-container gap-sm">
        <span className="px-xs bg-primary-container text-on-primary-container text-[10px] rounded border-grid uppercase font-bold tracking-wider">Active</span>
        <span className="font-label-md text-label-md text-on-surface">{title || `${ptyId} • shell`}</span>
        {accentClass && <span className={`vf-badge ${accentClass}`} style={{ fontSize: 9, marginLeft: 'auto' }}>{accent}</span>}
        <button
          className="vf-btn"
          style={{ fontSize: 10, padding: "1px 6px", minHeight: 20, minWidth: 20, border: "none", background: "transparent", marginLeft: 4 }}
          onClick={handleClose}
          title="Close terminal (kills PTY)"
        >
          ✕
        </button>
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
