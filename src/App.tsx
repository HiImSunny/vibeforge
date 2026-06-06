import { useState } from "react";
import "./App.css";
import FileTree from "./components/FileTree";

/**
 * Vibeforge — Phase 0 shell + Phase 1 live file tree
 *
 * Now with real disk-backed tree (Phase 1) that prioritizes plan/spec/track/AGENT.md
 * and supports quick-create that writes actual files.
 */

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

  const terminalPanes = [
    { id: 0, title: "1 • claude-3.5-sonnet • idle", output: "$ vibeforge shell ready\n> plan/ and track/ visible in sidebar\n> send context from any pane (stub)\n" },
    { id: 1, title: "2 • (empty)", output: "Right-click → New Terminal (Phase 2)\nGrid / split / tabs coming in layout system.\n" },
    { id: 2, title: "3 • (empty)", output: "" },
    { id: 3, title: "4 • (empty)", output: "" },
  ];

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
            {terminalPanes.map((p, i) => (
              <div
                key={i}
                className={`vf-pane ${activePane === i ? "active" : ""}`}
                onClick={() => selectPane(i)}
              >
                <div className="vf-pane-header">
                  <span className="label">{p.title}</span>
                  <span style={{ fontSize: 10, color: "#4b5563" }}>{activePane === i ? "FOCUSED" : ""}</span>
                </div>
                <div className="vf-pane-body">
                  {p.output || "(empty — real output will stream here)"}
                  {i === 0 && launched.length > 0 && (
                    <div style={{ marginTop: 12, color: "#7be38f" }}>
                      {launched.map(l => `[${l}] agent ready to receive context`).join("\n")}
                    </div>
                  )}
                </div>
              </div>
            ))}
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

