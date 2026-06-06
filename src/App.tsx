import { useState, useEffect } from "react";
import "./App.css";
import FileTree from "./components/FileTree";
import TerminalPane from "./components/TerminalPane";
import { invoke } from "@tauri-apps/api/core";

const AGENTS = [
  { id: "claude", label: "Claude", accent: "claude" },
  { id: "codex", label: "Codex", accent: "codex" },
  { id: "gemini", label: "Gemini", accent: "gemini" },
  { id: "aider", label: "Aider", accent: "aider" },
];

type TerminalSession = {
  ptyId: string;
  title: string;
  accent: string;
  hasRecentActivity?: boolean;
};

let terminalCounter = 0;
function generatePtyId(): string {
  terminalCounter += 1;
  return `t-${Date.now()}-${terminalCounter}`;
}

export default function VibeforgeShell() {
  const [launched, setLaunched] = useState<string[]>([]);
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [focusedPtyId, setFocusedPtyId] = useState<string | null>(null);
  const [delegatePrompt, setDelegatePrompt] = useState("");
  const [lastTreeContext, setLastTreeContext] = useState<string | null>(null);
  const [delegateTargetId, setDelegateTargetId] = useState<string | null>(null);
  const [lastCaptured, setLastCaptured] = useState<string>("");
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [status, setStatus] = useState("VIBEFORGE v2.4.1 • ready");

  async function createNewTerminal(command: string | null, baseTitle: string, accent: string) {
    const ptyId = generatePtyId();
    try {
      await invoke("create_terminal", { id: ptyId, command });
    } catch {
      setStatus(`Failed to create terminal`);
      return;
    }
    setTerminals((prev) => [...prev, { ptyId, title: baseTitle, accent, hasRecentActivity: false }]);
    setFocusedPtyId(ptyId);
    setStatus(`${baseTitle} ready`);
  }

  function launchAgent(agent: { id: string; label: string; accent: string }) {
    createNewTerminal(agent.id, `${agent.label} • live`, agent.accent);
    if (!launched.includes(agent.id)) setLaunched((p) => [...p, agent.id]);
  }

  function spawnNewTerminal() {
    createNewTerminal(null, "shell", "general");
  }

  function closeTerminal(ptyId: string) {
    invoke("kill_terminal", { id: ptyId }).catch(() => {});
    setTerminals((prev) => {
      const remaining = prev.filter((t) => t.ptyId !== ptyId);
      if (focusedPtyId === ptyId) setFocusedPtyId(remaining.length > 0 ? remaining[remaining.length - 1].ptyId : null);
      return remaining;
    });
    setStatus("Terminal closed");
  }

  function focusTerminal(ptyId: string) {
    setFocusedPtyId(ptyId);
    setTerminals((prev) => prev.map((t) => (t.ptyId === ptyId ? { ...t, hasRecentActivity: false } : t)));
  }

  function sendToFocusedTerminal(text: string) {
    if (!focusedPtyId) { setStatus("No focused terminal"); return; }
    invoke("write_to_terminal", { id: focusedPtyId, data: text + "\n" }).catch(() => {});
    setStatus(`Sent to ${focusedPtyId}`);
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (terminals.length === 0) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = terminals.findIndex((t) => t.ptyId === focusedPtyId);
        let nextIdx = idx;
        if (e.key === "ArrowDown") nextIdx = (idx + 1) % terminals.length;
        if (e.key === "ArrowUp") nextIdx = (idx - 1 + terminals.length) % terminals.length;
        focusTerminal(terminals[nextIdx].ptyId);
      }
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= 9 && num <= terminals.length) {
        focusTerminal(terminals[num - 1].ptyId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [terminals, focusedPtyId]);

  const focusedSession = terminals.find((t) => t.ptyId === focusedPtyId) || null;

  return (
    <div className="vf-root">
      {/* TopNavBar */}
      <header className="vf-topbar">
        <span className="title">VIBEFORGE</span>

        <div className="agent-pills">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              className={`vf-agent-pill ${a.accent}`}
              onClick={() => launchAgent(a)}
            >
              <span className="pill-dot" />
              {a.label}
            </button>
          ))}
        </div>

        <div className="search-wrap">
          <span className="material-symbols-outlined search-icon">search</span>
          <input className="si" placeholder="Quick open (files, plans, agents) — stub" />
        </div>

        <div className="active-badge">
          <span className="dot" />
          {launched.length || 0} active
        </div>

        <button className="icon-btn"><span className="material-symbols-outlined">settings</span></button>
        <button className="icon-btn"><span className="material-symbols-outlined">notifications</span></button>
      </header>

      {/* Main */}
      <main className="vf-main">
        {/* Left Sidebar */}
        <aside className="vf-sidebar">
          <div className="sidebar-section shrink-0">
            <div className="sidebar-label">CURRENT PROJECT</div>
            <div className="sidebar-project">
              <span className="material-symbols-outlined">folder</span>
              vibeforge <span className="badge">[main]</span>
            </div>
          </div>

          <div className="action-bar">
            <button className="action-btn"><span className="material-symbols-outlined">add</span> Plan</button>
            <button className="action-btn"><span className="material-symbols-outlined">add</span> Spec</button>
            <button className="action-btn"><span className="material-symbols-outlined">add</span> Track</button>
            <button className="action-icon-btn"><span className="material-symbols-outlined">refresh</span></button>
          </div>

          <div className="file-tree">
            <FileTree
              onFileOpen={(p) => {
                setLastTreeContext(p);
                sendToFocusedTerminal(p);
              }}
              onRefresh={() => setStatus("Tree refreshed • real disk")}
            />
          </div>

          <div className="sidebar-note">
            Real readDir + writeTextFile • structured folders prioritized
          </div>
        </aside>

        {/* Center Terminal Area */}
        <section className="vf-center">
          <div className="center-header">
            <div className="left">
              <span className="label">TERMINALS</span>
              <span className="tl1" style={{ color: "var(--outline)" }}>• {terminals.length} open • focus one</span>
            </div>
            <button className="new-shell-btn" onClick={spawnNewTerminal}>
              <span className="material-symbols-outlined">add</span> New Shell
            </button>
          </div>

          <div className="terminal-manager">
            {/* Terminal List */}
            <div className="terminal-list">
              {terminals.length === 0 && (
                <div style={{ padding: "10px 12px", fontSize: 10, color: "var(--outline)", lineHeight: 1.35 }}>
                  No terminals open.<br />Click an agent above or use + New Shell.
                </div>
              )}
              {terminals.map((t) => {
                const isFocused = t.ptyId === focusedPtyId;
                const subStatus = isFocused ? "Processing index.ts..." : (t.title.includes("live") ? "ready" : "shell");
                return (
                  <div
                    key={t.ptyId}
                    className={`tli ${isFocused ? "focused" : ""}`}
                    onClick={() => focusTerminal(t.ptyId)}
                  >
                    <div className="row">
                      <div className="left">
                        <span className="material-symbols-outlined">{t.accent === "claude" ? "smart_toy" : "terminal"}</span>
                        <span className="tname">{t.title}</span>
                      </div>
                      <span className={`tdot ${isFocused ? "focused" : ""}`} />
                    </div>
                    <div className="tsub">{subStatus}</div>
                  </div>
                );
              })}
            </div>

            {/* Terminal Viewer */}
            <div className="terminal-viewer">
              {focusedSession ? (
                <>
                  <div className="viewer-header">
                    <span className="viewer-badge">Active</span>
                    <span className="viewer-name">{focusedSession.title}</span>
                  </div>
                  <TerminalPane
                    ptyId={focusedSession.ptyId}
                    title={focusedSession.title}
                    accent={focusedSession.accent}
                    onData={() => {}}
                    onClose={() => closeTerminal(focusedSession.ptyId)}
                    onActivity={(id) => {
                      if (id !== focusedPtyId) {
                        setTerminals((prev) =>
                          prev.map((t) => (t.ptyId === id ? { ...t, hasRecentActivity: true } : t))
                        );
                      }
                    }}
                  />
                </>
              ) : (
                <div className="terminal-body">
                  <div className="muted"># Initialization...</div>
                  <div><span className="tertiary">agent</span> <span className="primary">--model</span> claude-3.5-sonnet <span className="primary">--context</span> AGENT.md</div>
                  <div className="iblock">
                    Loading structured context...<br />
                    [OK] Read plan/current.md<br />
                    [OK] Read spec/architecture.md<br />
                    Ready.
                  </div>
                  <div><span className="tertiary">➜</span> <span className="on-surface">Select or create a terminal above to begin.</span></div>
                  <div className="muted" style={{ marginTop: 8 }}>Waiting for input...</div>
                  <div style={{ marginTop: 4 }}><span className="cursor-pulse" /></div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Panel */}
        <aside className={`vf-right ${rightCollapsed ? "collapsed" : ""}`}>
          <div
            className="right-header"
            style={{ cursor: "pointer" }}
            onClick={() => setRightCollapsed(!rightCollapsed)}
          >
            <span className="label">CONTEXT • SEND TO AGENT</span>
            <button className="icon-btn" style={{ width: 20, height: 20 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {rightCollapsed ? "expand_content" : "collapse_content"}
              </span>
            </button>
          </div>

          {!rightCollapsed && (
            <div className="right-content">
              <button className="context-stub">
                <span className="left"><span className="material-symbols-outlined">language</span> Browser Stub</span>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--outline)" }}>chevron_right</span>
              </button>
              <button className="context-stub">
                <span className="left"><span className="material-symbols-outlined">api</span> HTTP Stub</span>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--outline)" }}>chevron_right</span>
              </button>
              <button className="context-stub">
                <span className="left"><span className="material-symbols-outlined">difference</span> AI Diff Review</span>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--outline)" }}>chevron_right</span>
              </button>

              {/* Quick Delegate */}
              <div className="quick-delegate">
                <div className="qd-label">Quick Delegate</div>

                {terminals.length > 0 && (
                  <>
                    <div className="qd-field-label">Target terminal</div>
                    <select
                      value={delegateTargetId || focusedPtyId || ""}
                      onChange={(e) => setDelegateTargetId(e.target.value || null)}
                      className="qd-select"
                    >
                      {terminals.map((t) => (
                        <option key={t.ptyId} value={t.ptyId}>
                          {t.title} {t.ptyId === focusedPtyId ? "(focused)" : ""}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                <textarea
                  value={delegatePrompt}
                  onChange={(e) => setDelegatePrompt(e.target.value)}
                  className="qd-textarea"
                  placeholder="Describe the task..."
                />

                {lastTreeContext && (
                  <button
                    className="qd-row-btn"
                    style={{ marginBottom: 4, fontSize: 9, padding: "1px 4px" }}
                    onClick={() => {
                      const ctx = `\n\n[context from tree]\n${lastTreeContext}`;
                      setDelegatePrompt((p) => (p.trim() ? p + ctx : ctx.trim()));
                    }}
                  >
                    Insert tree context: {lastTreeContext.length > 28 ? "..." + lastTreeContext.slice(-25) : lastTreeContext}
                  </button>
                )}

                <button
                  className="qd-send-btn"
                  disabled={!(delegateTargetId || focusedPtyId) || !delegatePrompt.trim()}
                  onClick={async () => {
                    const target = delegateTargetId || focusedPtyId;
                    if (!target) return;
                    const taskMsg = `Task:\n${delegatePrompt.trim()}\n\nPlease complete this task. Use any provided context.`;
                    try {
                      await invoke("write_to_terminal", { id: target, data: taskMsg + "\n" });
                      setStatus(`Task sent to ${target}`);
                      setDelegatePrompt("");
                    } catch {
                      setStatus("Delegate failed");
                    }
                  }}
                >
                  Send task to target
                </button>

                <div className="qd-row">
                  <button className="qd-row-btn" onClick={async () => {
                    const sample = `Đây là phân tích lỗi...\n   Tôi đã kiểm tra file A và B.\n   Kết luận: cần sửa logic X.\n\n   Claude Code has stopped\n   Một số dòng rác sau này không được xuất hiện`;
                    try {
                      const cleaned: string = await invoke("strip_claude_stop_messages", { output: sample });
                      setStatus(`Strip demo: ${cleaned}`);
                    } catch { setStatus("Strip failed"); }
                  }}>
                    Demo strip
                  </button>
                  <button className="qd-row-btn" disabled={!(delegateTargetId || focusedPtyId)} onClick={async () => {
                    const target = delegateTargetId || focusedPtyId;
                    if (!target) return;
                    try {
                      const raw: string = await invoke("get_terminal_output", { id: target });
                      const cleaned: string = await invoke("strip_claude_stop_messages", { output: raw });
                      setLastCaptured(cleaned);
                      setStatus(`Captured ${raw.length} chars → stripped to ${cleaned.length}`);
                    } catch { setStatus("Capture failed"); }
                  }}>
                    Capture + strip
                  </button>
                </div>

                {lastCaptured && (
                  <div className="captured-area">
                    <div className="captured-label">Last captured + stripped</div>
                    <textarea
                      readOnly
                      value={lastCaptured}
                      className="captured-textarea"
                    />
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }} />

              <div className="drag-area">
                <span className="drag-text">
                  <span className="material-symbols-outlined">upload_file</span>
                  Drag files / output here
                </span>
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* Statusbar */}
      <footer className="vf-statusbar">
        <div className="status-left">
          <span className="status-item">
            <span className="material-symbols-outlined">check_circle</span>
            {status}
          </span>
          <div className="status-badges">
            <span className="status-badge">plan</span>
            <span className="status-badge">spec</span>
            <span className="status-badge">track</span>
          </div>
        </div>
        <div className="status-right">
          <span>Windows x64</span>
          <span className="status-divider" />
          <span>Portable Runtime</span>
          <span className="status-divider" />
          <span className="status-item">
            <span className="green-dot" />
            Real PTY
          </span>
          <span className="status-divider" />
          <span>VIBEFORGE v2.4.1</span>
        </div>
      </footer>
    </div>
  );
}
