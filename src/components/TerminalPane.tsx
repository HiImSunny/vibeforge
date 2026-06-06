import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

/**
 * TerminalPane — Phase 2 foundation (stub PTY / local echo first)
 *
 * - Real xterm.js instance (v6) + FitAddon.
 * - Themed to Vibeforge calm technical palette (CSS vars + explicit).
 * - onData callback for parent to forward to real PTY write (Phase 2 later).
 * - Local echo for immediate interactivity in this slice (until real Rust PTY wired).
 * - Follows FileTree.tsx patterns: clean hooks, no slop, documented.
 * - Polish per make-interfaces-feel-better + UI design plan (hit areas, mono, calm).
 *
 * Next (subsequent slice on this plan): replace local echo with real Tauri invoke + event stream from Rust PTY manager.
 */

interface TerminalPaneProps {
  id: number | string;
  title?: string;
  accent?: string; // "claude" | "codex" | "gemini" | "general"
  onData?: (data: string) => void;
  onClose?: () => void;
}

export default function TerminalPane({ id, title, accent = "general", onData, onClose }: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const [isFocused, setIsFocused] = useState(false);

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

    // Local echo for this slice (immediate feedback, no real PTY yet)
    // When real PTY arrives, parent will pass onData that writes to Rust, and we will receive chunks via callback prop or event.
    term.onData((data) => {
      // Echo locally for now
      term.write(data);

      // Forward to parent (will become the real PTY write path)
      onData?.(data);
    });

    // Focus visual is primarily driven by the outer .vf-pane.active class (from parent click).
    // xterm shows its own cursor when it has keyboard focus. We call focus() on wrapper click.

    // Initial prompt hint (stub)
    term.write("\r\n$ vibeforge terminal (local echo — real PTY in next slice)\r\n> ");

    termRef.current = term;
    fitRef.current = fitAddon;

    // Fit on window resize (Tauri webview or user drag)
    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {
        // ignore transient
      }
    };
    window.addEventListener("resize", handleResize);

    // Initial fit after mount
    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {}
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      try {
        term.dispose();
      } catch {}
      termRef.current = null;
      fitRef.current = null;
    };
  }, [onData]);

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
    <div className={`vf-pane ${isFocused ? "active" : ""}`} data-pane-id={id}>
      <div className="vf-pane-header">
        <span className="label" style={{ fontFamily: "var(--vf-mono, ui-monospace, monospace)" }}>
          {title || `${id} • (stub)`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {accentClass && <span className={`vf-badge ${accentClass}`} style={{ fontSize: 9 }}>{accent}</span>}
          <button
            className="vf-btn"
            style={{ fontSize: 10, padding: "1px 6px", minHeight: 20, minWidth: 20, border: "none", background: "transparent" }}
            onClick={handleClose}
            title="Close terminal (stub — real kill in PTY slice)"
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
