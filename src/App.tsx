import { useState, useEffect } from "react";
import "./App.css";
import FileTree from "./components/FileTree";
import TerminalPane from "./components/TerminalPane";
import GlassPanel from "./components/GlassPanel";
import BrowserPanel from "./components/BrowserPanel";
import { invoke } from "@tauri-apps/api/core";

const AGENTS = [
  { id: "claude", label: "Claude", accent: "claude" },
  { id: "codex", label: "Codex", accent: "codex" },
  { id: "gemini", label: "Gemini", accent: "gemini" },
  { id: "aider", label: "Aider", accent: "aider" },
  { id: "opencode", label: "OpenCode", accent: "opencode" },
];

const EMPTY_LAUNCHERS = [
  ...AGENTS,
  { id: "shell", label: "New Shell", accent: "general" },
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState("browser");
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

  // Focus Mode toggle (Ctrl+\)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setFocusMode((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

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
  const sidebarEffectiveCollapsed = sidebarCollapsed || focusMode;
  const rightEffectiveCollapsed = rightCollapsed || focusMode;

  return (
    <div className="vf-root">
      {/* TopNavBar */}
      <header className="vf-topbar" aria-label="Vibeforge workspace navigation">
        <span className="title">VIBEFORGE</span>

        <div className="agent-pills">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              className={`vf-agent-pill ${a.accent}`}
              onClick={() => launchAgent(a)}
              aria-label={`Launch ${a.label} terminal`}
              title={`Launch ${a.label} terminal`}
            >
              <span className="pill-dot" />
              {a.label}
            </button>
          ))}
        </div>

        <div className="search-wrap">
          <span className="material-symbols-outlined search-icon">search</span>
          <input className="si" placeholder="Quick open: files, plans, agents" aria-label="Quick open files, plans, and agents" />
        </div>

        <div className="active-badge">
          <span className="dot" />
          {terminals.length} active
        </div>

        <button className="icon-btn" aria-label="Open settings" title="Open settings"><span className="material-symbols-outlined">settings</span></button>
        <button className="icon-btn" aria-label="Open notifications" title="Open notifications"><span className="material-symbols-outlined">notifications</span></button>
      </header>

      {/* Main */}
      <main className="vf-main">
        {/* Left Sidebar */}
        <aside className={`vf-sidebar${sidebarEffectiveCollapsed ? " collapsed" : ""}`} aria-label="Project files and structured workflow">
          {sidebarEffectiveCollapsed ? (
            /* Icon Rail */
            <div className="icon-rail">
              <button
                className="icon-rail-toggle"
                onClick={() => {
                  if (focusMode) setFocusMode(false);
                  else setSidebarCollapsed(false);
                }}
                aria-label="Expand sidebar"
                title="Expand sidebar"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              <div className="icon-rail-items">
                <button className="icon-rail-btn" aria-label="Project files" title="Project files">
                  <span className="material-symbols-outlined">folder</span>
                </button>
                <button className="icon-rail-btn" aria-label="Terminals" title="Terminals">
                  <span className="material-symbols-outlined">terminal</span>
                </button>
                <button className="icon-rail-btn" aria-label="New shell" title="New shell" onClick={spawnNewTerminal}>
                  <span className="material-symbols-outlined">add</span>
                </button>
                <div className="icon-rail-spacer" />
                <button className="icon-rail-btn" aria-label="Open settings" title="Open settings">
                  <span className="material-symbols-outlined">settings</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="sidebar-section shrink-0">
                <div className="sidebar-header-row">
                  <div className="sidebar-label">CURRENT PROJECT</div>
                  <button
                    className="sidebar-collapse-btn"
                    onClick={() => setSidebarCollapsed(true)}
                    aria-label="Collapse sidebar to icon rail"
                    title="Collapse sidebar (Ctrl+\)"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                </div>
                <div className="sidebar-project">
                  <span className="material-symbols-outlined">folder</span>
                  vibeforge <span className="badge">[main]</span>
                </div>
              </div>

          <div className="action-bar">
            <button className="action-btn" aria-label="Create plan"><span className="material-symbols-outlined">add</span> Plan</button>
            <button className="action-btn" aria-label="Create spec"><span className="material-symbols-outlined">add</span> Spec</button>
            <button className="action-btn" aria-label="Create track"><span className="material-symbols-outlined">add</span> Track</button>
            <button className="action-icon-btn" aria-label="Refresh project files" title="Refresh project files"><span className="material-symbols-outlined">refresh</span></button>
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
            </>
          )}
        </aside>

        {/* Center Terminal Area */}
        <section className="vf-center">
          <div className="center-header">
            <div className="left">
              <span className="label">TERMINALS</span>
              <span className="tl1" style={{ color: "var(--outline)" }}>• {terminals.length} open • focus one</span>
            </div>
            <button className="new-shell-btn" onClick={spawnNewTerminal} aria-label="Create new shell terminal">
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
                const hasActivity = !isFocused && t.hasRecentActivity;
                const subStatus = isFocused ? "Active • focused" : (t.title.includes("live") ? "ready" : "shell");
                const accentClass = t.accent || "general";
                return (
                  <button
                    key={t.ptyId}
                    type="button"
                    className={`tli ${isFocused ? `focused ${accentClass}` : ""}`}
                    onClick={() => focusTerminal(t.ptyId)}
                    aria-pressed={isFocused}
                    aria-label={`Focus ${t.title} terminal`}
                  >
                    <div className="row">
                      <div className="left">
                        <span className="material-symbols-outlined">{t.accent === "claude" ? "smart_toy" : "terminal"}</span>
                        <span className="tname">{t.title}</span>
                      </div>
                      <span className={`tdot ${isFocused ? "focused" : ""}`} />
                    </div>
                    <div className="tsub">{subStatus}</div>
                    {hasActivity && <span className="act-indicator pulsing" title="New output" />}
                  </button>
                );
              })}
            </div>

            {/* Terminal Viewer */}
            <div className="terminal-viewer">
              {focusedSession ? (
                <>
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
                <div className="empty-state-container">
                  <div className="empty-state-forge">Forge a New Session</div>
                  <div className="empty-state-sub">
                    Launch an agent or open a shell<br />to begin crafting with AI.
                  </div>

                  <div className="empty-state-arc">
                    {EMPTY_LAUNCHERS.filter(l => l.id !== "shell").map((l) => (
                      <button
                        key={l.id}
                        className={`empty-launcher ${l.accent}`}
                        onClick={() => {
                          if (l.id === "shell") spawnNewTerminal();
                          else launchAgent(l as typeof AGENTS[number]);
                        }}
                        aria-label={`Launch ${l.label}`}
                        title={`Launch ${l.label}`}
                      >
                        <span className="el-dot" />
                        {l.label}
                      </button>
                    ))}
                  </div>

                  <button
                    className="empty-shell-btn"
                    onClick={spawnNewTerminal}
                    aria-label="Open new system shell"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>terminal</span>
                    New Shell
                  </button>
                </div>              )}
            </div>
          </div>
        </section>

        {/* Right Panel Edge Toggle (visible when right panel collapsed) */}
        {rightEffectiveCollapsed && (
          <div className="right-edge-toggle" title="Expand context panel (Ctrl+\)">
            <button
              onClick={() => {
                if (focusMode) setFocusMode(false);
                else setRightCollapsed(false);
              }}
              aria-label="Expand context panel"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
          </div>
        )}

                {/* Right Panel */}
        <aside className={`vf-right${rightEffectiveCollapsed ? " collapsed" : ""}`} aria-label="Agent context panel">
          <GlassPanel intensity="medium" amberGlow className="right-panel-glass" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Right Panel Tab Header */}
          <div className="right-tab-header">
            <button
              className={"right-tab-btn" + (rightPanelTab === "context" ? " active" : "")}
              onClick={() => setRightPanelTab("context")}
              aria-label="Quick Delegate context panel"
              aria-pressed={rightPanelTab === "context"}
            >
              <span className="material-symbols-outlined">send</span>
              Context
            </button>
            <button
              className={"right-tab-btn" + (rightPanelTab === "browser" ? " active" : "")}
              onClick={() => setRightPanelTab("browser")}
              aria-label="Embedded browser panel"
              aria-pressed={rightPanelTab === "browser"}
            >
              <span className="material-symbols-outlined">language</span>
              Browser
            </button>
            <button
              className={"right-tab-btn" + (rightPanelTab === "http" ? " active" : "")}
              onClick={() => setRightPanelTab("http")}
              aria-label="HTTP client panel"
              aria-pressed={rightPanelTab === "http"}
            >
              <span className="material-symbols-outlined">api</span>
              HTTP
            </button>
            <button
              className={"right-tab-btn" + (rightPanelTab === "diff" ? " active" : "")}
              onClick={() => setRightPanelTab("diff")}
              aria-label="AI diff review panel"
              aria-pressed={rightPanelTab === "diff"}
            >
              <span className="material-symbols-outlined">difference</span>
              Diff
            </button>
            <button
              className="icon-btn"
              style={{ width: 24, height: 28, flexShrink: 0 }}
              onClick={() => setRightCollapsed(!rightCollapsed)}
              aria-label={rightEffectiveCollapsed ? "Expand context panel" : "Collapse context panel"}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {rightEffectiveCollapsed ? "expand_content" : "collapse_content"}
              </span>
            </button>
          </div>

          {!rightEffectiveCollapsed && (
            <div className="right-content">
              {rightPanelTab === "browser" && (
                <BrowserPanel
                  onSendToAI={sendToFocusedTerminal}
                  focusedTerminalName={focusedSession?.title || null}
                />
              )}

              {rightPanelTab === "http" && (
                <div style={{ padding: "12px", color: "var(--outline)", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span>HTTP Client - coming in Milestone 2</span>
                </div>
              )}

              {rightPanelTab === "diff" && (
                <div style={{ padding: "12px", color: "var(--outline)", fontFamily: "JetBrains Mono, monospace", fontSize: 11, textAlign: "center", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span>AI Diff Review - coming in Milestone 3</span>
                </div>
              )}

              {rightPanelTab === "context" && (
                <>
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
                      placeholder="Describe the task"
                      aria-label="Task prompt for selected terminal"
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
                        const sample = `Day la phan tich loi...\n   Toi da kiem tra file A va B.\n   Ket luan: can sua logic X.\n\n   Claude Code has stopped\n   Mot so dong rac sau nay khong duoc xuat hien`;
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
                          setStatus(`Captured ${raw.length} chars stripped to ${cleaned.length}`);
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
                </>
              )}
            </div>
          )}
          </GlassPanel>
        </aside>
      </main>

      {/* Statusbar */}
      <footer className={`vf-statusbar heat-${terminals.length >= 3 ? "3" : String(terminals.length)}`}>
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
