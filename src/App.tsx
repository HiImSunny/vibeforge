import { useState } from "react";
import "./App.css";
import FileTree from "./components/FileTree";
import TerminalPane from "./components/TerminalPane";

/**
 * Vibeforge — Phase 0 shell + Phase 1 live file tree
 *
 * Now with real disk-backed tree (Phase 1) that prioritizes plan/spec/track/AGENT.md
 * and supports quick-create that writes actual files.
 */

interface Agent {
  id: string;
  label: string;
  accent: string;
}

const AGENTS: Agent[] = [
  { id: "claude", label: "claude", accent: "claude" },
  { id: "codex", label: "codex", accent: "codex" },
  { id: "gemini", label: "gemini", accent: "gemini" },
  { id: "aider", label: "aider", accent: "general" },
];

export default function VibeforgeShell() {
  const [activePane, setActivePane] = useState(0);
  const [launched, setLaunched] = useState<string[]>([]);
  const [status, setStatus] = useState("2 projects • 0 running agents • structured workflow active");

  function launchAgent(agent: Agent) {
    if (!launched.includes(agent.id)) {
      setLaunched([...launched, agent.id]);
      setStatus(`${launched.length + 1} agents active • ${agent.label} thinking...`);
      // In real app this would send context + spawn PTY
    }
  }

  function selectPane(i: number) {
    setActivePane(i);
  }

  // Phase 2: real xterm-backed panes (local echo stub for this slice; real PTY + Rust manager next).
  // Titles and accents match the topbar launchers. onData forwards (currently echo only).
  const terminalSlots = [0, 1, 2, 3];

  return (
    <div className="vf-root">
      {/* Top bar — agent launchers + global affordances */}
      <div className="vf-topbar">
        <div className="title">VIBEFORGE</div>

        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {AGENTS.map((a) => (
            <button
              key={a.id}
              className={`vf-agent-btn ${a.accent}`}
              onClick={() => launchAgent(a)}
              title={`Launch ${a.label}`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <input
          className="vf-input"
          placeholder="Quick open (files, plans, agents) — stub"
          style={{ width: 260 }}
          onFocus={() => setStatus("Command palette will live here (Phase 4)")}
        />

        <div className="vf-badge" style={{ marginLeft: 8 }}>
          {launched.length} active
        </div>
      </div>

      <div className="vf-main">
        {/* Left sidebar — live file tree (Phase 1) with structured workflow first-class treatment */}
        <div className="vf-sidebar">
          <div className="vf-sidebar-header">CURRENT PROJECT</div>
          <div style={{ padding: "6px 10px", fontSize: 12, fontWeight: 500, borderBottom: "1px solid var(--vf-border)" }}>
            vibeforge <span className="vf-badge">main</span>
          </div>

          <div className="vf-sidebar-header" style={{ marginTop: 4 }}>STRUCTURED WORKFLOW + FILES (live)</div>

          <FileTree
            onFileOpen={(p) => setStatus(`Opened (stub): ${p}`)}
            onRefresh={() => setStatus("Tree refreshed • real disk")}
          />

          <div style={{ flex: 1 }} />

          <div style={{ padding: 8, fontSize: 10, color: "var(--vf-muted)", borderTop: "1px solid var(--vf-border)" }}>
            Real readDir + writeTextFile • structured folders prioritized • quick-create writes .md
          </div>
        </div>

        {/* Center — terminal grid (the heart) */}
        <div className="vf-center">
          <div className="vf-center-header">
            <span>TERMINALS</span>
            <span style={{ color: "var(--vf-muted)" }}>• grid • 4 slots • (Phase 2: real PTY + xterm.js + layouts)</span>
            <div style={{ flex: 1 }} />
            <button className="vf-btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => setStatus("New terminal (stub) — will open PTY")}>
              + New
            </button>
          </div>

          <div className="vf-terminal-grid">
            {terminalSlots.map((i) => {
              const titles = [
                "1 • claude-3.5-sonnet • idle",
                "2 • (shell)",
                "3 • (empty)",
                "4 • (empty)",
              ];
              const accents = ["claude", "general", "general", "general"];
              return (
                <div
                  key={i}
                  className={`vf-pane ${activePane === i ? "active" : ""}`}
                  onClick={() => selectPane(i)}
                >
                  <TerminalPane
                    id={i}
                    title={titles[i] || `${i} • (stub)`}
                    accent={accents[i] || "general"}
                    onData={(data) => {
                      // Stub: in next slice this will invoke Tauri command to write to real PTY.
                      // For now the component does local echo; we just surface activity.
                      if (i === 0 && launched.length > 0) {
                        setStatus(`${launched.length} agents • input sent to pane ${i}`);
                      }
                    }}
                    onClose={() => setStatus(`Closed pane ${i} (stub — real PTY kill later)`)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right panels — context tools (browser/http/diff stubs) */}
        <div className="vf-right">
          <div className="vf-panel-header">CONTEXT • SEND TO AGENT</div>

          <div className="vf-context-item">
            <div style={{ fontWeight: 500, marginBottom: 2 }}>Browser (stub)</div>
            <div style={{ fontSize: 11, color: "var(--vf-muted)" }}>localhost:1420 • 3 console msgs</div>
            <button className="vf-btn" style={{ marginTop: 6, fontSize: 11, padding: "4px 8px" }}>
              Send screenshot + console
            </button>
          </div>

          <div className="vf-context-item">
            <div style={{ fontWeight: 500, marginBottom: 2 }}>HTTP (stub)</div>
            <div style={{ fontSize: 11, color: "var(--vf-muted)" }}>GET /api/agents 200 • 14ms</div>
            <button className="vf-btn" style={{ marginTop: 6, fontSize: 11, padding: "4px 8px" }}>
              Send last response
            </button>
          </div>

          <div className="vf-context-item">
            <div style={{ fontWeight: 500, marginBottom: 2 }}>AI Diff Review (Phase 4)</div>
            <div style={{ fontSize: 11, color: "var(--vf-muted)" }}>0 pending changes</div>
            <button className="vf-btn" style={{ marginTop: 6, fontSize: 11, padding: "4px 8px" }} disabled>
              Review changes
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ padding: 10, fontSize: 10, color: "var(--vf-muted)", borderTop: "1px solid var(--vf-border)" }}>
            Drag files / terminal output / browser here to send context (future)
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="vf-statusbar">
        <span>{status}</span>
        <span className="vf-badge">plan/spec/track</span>
        <span style={{ marginLeft: "auto", fontSize: 10 }}>Windows • portable build target • Phase 0 shell</span>
      </div>
    </div>
  );
}

