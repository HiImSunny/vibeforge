import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import "@xterm/xterm/css/xterm.css";
import GlassPanel from "./GlassPanel";

/**
 * TerminalPane â€” Phase 2 real PTY viewer (xterm + portable-pty)
 *
 * - Pure viewer for an existing ptyId (PTY creation/kill is managed by parent list).
 * - Real xterm.js (v6) + FitAddon.
 * - Themed to Vibeforge calm technical palette.
 * - Bidirectional: onData â†’ write_to_terminal; "terminal-output" events â†’ term.write.
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
      fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: 12,
      lineHeight: 1.35,
      theme: {
        background: "#080c14", // --vf-bg
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

    const agentColorVar = accent ? `var(--mf-${accent})` : "var(--mf-amber)";

  return (
    <div className="vf-pane" data-pty-id={ptyId}>
      {/* Viewer Header — Midnight Forge glass chrome with agent accent */}
      <GlassPanel
        intensity="medium"
        border={false}
        amberGlow={accent === "general"}
        style={{
          height: 28,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          padding: "0 var(--md)",
          gap: "var(--sm)",
          borderBottom: "1px solid var(--glass-border)",
          borderLeft: `2px solid ${agentColorVar}`,
        }}
      >
        <span className="viewer-badge">Active</span>
        <span className="viewer-name">{title || `${ptyId} • shell`}</span>
        <span
          style={{
            marginLeft: "auto",
            width: 6, height: 6, borderRadius: "50%",
            backgroundColor: agentColorVar,
            boxShadow: `0 0 6px ${agentColorVar}`,
            flexShrink: 0,
          }}
        />
        <button
          className="vf-btn"
          style={{
            fontSize: 10, padding: "1px 6px", minHeight: 20, minWidth: 20,
            border: "1px solid var(--glass-border)", background: "transparent",
            color: "var(--outline)", cursor: "pointer", borderRadius: "var(--radius)",
          }}
          onClick={handleClose}
          title="Close terminal (kills PTY)"
          aria-label={`Close ${title || ptyId} terminal`}
        >
          ✕
        </button>
      </GlassPanel>


      <div
        ref={containerRef}
        className="vf-pane-body"
        style={{ padding: 0, background: "#080c14", overflow: "hidden" }}
        onClick={() => termRef.current?.focus()}
        role="application"
        aria-label={`${title || ptyId} terminal output`}
      />
    </div>
  );
}
