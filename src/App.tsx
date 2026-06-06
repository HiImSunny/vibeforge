import { useState } from "react";
import "./App.css";
import FileTree from "./components/FileTree";
import TerminalPane from "./components/TerminalPane";

/**
 * Vibeforge — Phase 0/1 shell + Phase 2 real PTY terminals
 *
 * 2x2 grid of real xterm + portable-pty terminals.
 * Topbar agent buttons (claude/codex/gemini/aider) now spawn real PTYs with the matching command (allow-listed in Rust).
 * + New opens default shell PTY.
 * Follows UI design (calm technical, agent accent borders, dense purposeful, no slop) + AGENT.md.
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

type TerminalSlot = {
  id: number;
  title: string;
  accent: string;
  command: string | null; // passed to TerminalPane → create_terminal (validated in Rust)
  restartKey: number;     // increment to force PTY kill + recreate for this slot id
};

const INITIAL_TITLES = ["1 • shell", "2 • shell", "3 • shell", "4 • shell"];
const INITIAL_ACCENTS = ["general", "general", "general", "general"];

export default function VibeforgeShell() {
  const [activePane, setActivePane] = useState(0);
  const [launched, setLaunched] = useState<string[]>([]);
  const [status, setStatus] = useState("2 projects • 0 running agents • structured workflow active");

  // Phase 2: 4 fixed slots driven by state so we can retarget them with real agent commands.
  const [slots, setSlots] = useState<TerminalSlot[]>(() =>
    [0, 1, 2, 3].map((i) => ({
      id: i,
      title: INITIAL_TITLES[i],
      accent: INITIAL_ACCENTS[i],
      command: null, // default shell (powershell on Win via Rust)
      restartKey: 0,
    }))
  );

  function launchAgent(agent: Agent) {
    // Target preference: active pane if it is "general"/free, else first general slot, else active.
    const isFree = (s: TerminalSlot) => !s.command || s.accent === "general";
    let target = activePane;
    if (!isFree(slots[activePane])) {
      const freeIdx = slots.findIndex(isFree);
      if (freeIdx !== -1) target = freeIdx;
    }

    setSlots((prev) =>
      prev.map((s, idx) =>
        idx === target
          ? {
              ...s,
              title: `${agent.label} • live`,
              accent: agent.accent,
              command: agent.id, // e.g. "claude" — Rust allow-list will accept
              restartKey: s.restartKey + 1,
            }
          : s
      )
    );

    if (!launched.includes(agent.id)) {
      const next = [...launched, agent.id];
      setLaunched(next);
      setStatus(`${next.length} agents active • ${agent.label} spawned in pane ${target}`);
    } else {
      setStatus(`${launched.length} agents active • ${agent.label} re-spawned in pane ${target}`);
    }
  }

  function spawnNewTerminal() {
    // Pick active or first slot; reset it to a fresh default shell PTY.
    const target = activePane;
    setSlots((prev) =>
      prev.map((s, idx) =>
        idx === target
          ? {
              ...s,
              title: `${s.id + 1} • shell`,
              accent: "general",
              command: null,
              restartKey: s.restartKey + 1,
            }
          : s
      )
    );
    setStatus(`New shell PTY in pane ${target}`);
  }

  function closePane(i: number) {
    // Explicit close: kill the PTY for this slot (via restartKey) and reset to a clean default shell.
    // This makes the ✕ button actually terminate the session (real kill_terminal call inside TerminalPane effect).
    setSlots((prev) =>
      prev.map((s, idx) =>
        idx === i
          ? {
              ...s,
              title: `${i + 1} • shell`,
              accent: "general",
              command: null,
              restartKey: s.restartKey + 1,
            }
          : s
      )
    );
    setStatus(`Closed pane ${i} (PTY killed, fresh shell ready)`);
  }

  function selectPane(i: number) {
    setActivePane(i);
  }

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
            <span style={{ color: "var(--vf-muted)" }}>• 2×2 grid • real PTY (xterm + portable-pty)</span>
            <div style={{ flex: 1 }} />
            <button className="vf-btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={spawnNewTerminal}>
              + New
            </button>
          </div>

          <div className="vf-terminal-grid">
            {slots.map((slot) => {
              const i = slot.id;
              return (
                <div
                  key={`${i}-${slot.restartKey}`} // stable per slot but remount outer on restart if needed
                  className={`vf-pane ${activePane === i ? "active" : ""}`}
                  onClick={() => selectPane(i)}
                >
                  <TerminalPane
                    id={i}
                    title={slot.title}
                    accent={slot.accent}
                    command={slot.command}
                    restartKey={slot.restartKey}
                    onData={() => {
                      if (launched.length > 0) {
                        setStatus(`${launched.length} agents • input to pane ${i}`);
                      }
                    }}
                    onClose={() => closePane(i)}
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
        <span style={{ marginLeft: "auto", fontSize: 10 }}>Windows • portable • real PTY (Phase 2)</span>
      </div>
    </div>
  );
}

