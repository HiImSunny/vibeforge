import { useState, useEffect } from "react";
import "./App.css";
import FileTree from "./components/FileTree";
import TerminalPane from "./components/TerminalPane";
import { invoke } from "@tauri-apps/api/core";

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

type TerminalSession = {
  ptyId: string;
  title: string;
  accent: string;
  hasRecentActivity?: boolean; // for subtle indicator in list when not focused
};

let terminalCounter = 0;
function generatePtyId(): string {
  terminalCounter += 1;
  return `t-${Date.now()}-${terminalCounter}`;
}

export default function VibeforgeShell() {
  const [launched, setLaunched] = useState<string[]>([]);
  const [status, setStatus] = useState("2 projects • 0 running agents • structured workflow active");

  // Dynamic list of terminals (unlimited). Only one is focused at a time.
  const [terminals, setTerminals] = useState<TerminalSession[]>([]);
  const [focusedPtyId, setFocusedPtyId] = useState<string | null>(null);
  const [delegatePrompt, setDelegatePrompt] = useState(""); // for orchestration foundation quick delegate
  const [lastTreeContext, setLastTreeContext] = useState<string | null>(null); // last path from FileTree for context injection into delegate
  const [delegateTargetId, setDelegateTargetId] = useState<string | null>(null); // explicit target choice for Quick Delegate (overrides focused if set)
  const [lastCaptured, setLastCaptured] = useState<string>(""); // last result from "Capture last + strip" (for review / copy)
  const [rightCollapsed, setRightCollapsed] = useState(false); // collapse right context panel for terminal focus (per UI design plan)

  // Helper to create a new terminal session (explicit create in Rust first).
  async function createNewTerminal(command: string | null, baseTitle: string, accent: string) {
    const ptyId = generatePtyId();
    try {
      await invoke("create_terminal", { id: ptyId, command });
    } catch (e: any) {
      console.error("create_terminal failed at App level", e);
      setStatus(`Failed to create terminal: ${e}`);
      return;
    }

    const newSession: TerminalSession = {
      ptyId,
      title: baseTitle,
      accent,
      hasRecentActivity: false,
    };

    setTerminals((prev) => [...prev, newSession]);
    setFocusedPtyId(ptyId);
    setStatus(`${baseTitle} ready`);
  }

  function launchAgent(agent: Agent) {
    // Always create a fresh terminal for the agent (unlimited model).
    const title = `${agent.label} • live`;
    createNewTerminal(agent.id, title, agent.accent);

    if (!launched.includes(agent.id)) {
      const next = [...launched, agent.id];
      setLaunched(next);
    }
  }

  function spawnNewTerminal() {
    createNewTerminal(null, "shell", "general");
  }

  function closeTerminal(ptyId: string) {
    // Kill in Rust + remove from list.
    invoke("kill_terminal", { id: ptyId }).catch(() => {});

    setTerminals((prev) => {
      const remaining = prev.filter((t) => t.ptyId !== ptyId);
      // If we closed the focused one, focus the last remaining (or none).
      if (focusedPtyId === ptyId) {
        const nextFocused = remaining.length > 0 ? remaining[remaining.length - 1].ptyId : null;
        setFocusedPtyId(nextFocused);
      }
      return remaining;
    });
    setStatus("Terminal closed");
  }

  function focusTerminal(ptyId: string) {
    setFocusedPtyId(ptyId);
    // Clear activity flag when focusing (user has "seen" it)
    setTerminals(prev =>
      prev.map(t => t.ptyId === ptyId ? { ...t, hasRecentActivity: false } : t)
    );
  }

  // Minimal send context from FileTree into the currently focused terminal.
  function sendToFocusedTerminal(text: string) {
    if (!focusedPtyId) {
      setStatus("No focused terminal to send to");
      return;
    }
    invoke("write_to_terminal", { id: focusedPtyId, data: text + "\n" }).catch((e) => {
      console.warn("send to focused failed", e);
    });
    setStatus(`Sent to ${focusedPtyId}`);
  }

  // Keyboard support for terminal list: ArrowUp/Down to cycle focus, 1-9 to jump.
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
            onFileOpen={(p) => {
              setLastTreeContext(p);           // capture for Quick Delegate context injection
              sendToFocusedTerminal(p);        // keep existing direct-to-focused paste behavior
            }}
            onRefresh={() => setStatus("Tree refreshed • real disk")}
          />

          <div style={{ flex: 1 }} />

          <div style={{ padding: 8, fontSize: 10, color: "var(--vf-muted)", borderTop: "1px solid var(--vf-border)" }}>
            Real readDir + writeTextFile • structured folders prioritized • quick-create writes .md
          </div>
        </div>

        {/* Center — dynamic terminal list + single focused viewer (unlimited terminals) */}
        <div className="vf-center">
          <div className="vf-center-header">
            <span>TERMINALS</span>
            <span style={{ color: "var(--vf-muted)" }}>• {terminals.length} open • focus one</span>
            <div style={{ flex: 1 }} />
            <button className="vf-btn" style={{ fontSize: 11, padding: "3px 8px" }} onClick={spawnNewTerminal}>
              + New Shell
            </button>
          </div>

          <div className="terminal-manager">
            {/* Terminal list (left) - polished */}
            <div className="terminal-list">
              {terminals.length === 0 && (
                <div className="empty-hint" style={{ padding: "10px 8px", fontSize: 10, color: "var(--vf-muted)", lineHeight: 1.35 }}>
                  No terminals open.<br />
                  Click an agent above or use + New Shell.
                </div>
              )}
              {terminals.map((t) => {
                const isFocused = t.ptyId === focusedPtyId;
                return (
                  <div
                    key={t.ptyId}
                    className={`terminal-list-item ${isFocused ? "focused" : ""}`}
                    onClick={() => focusTerminal(t.ptyId)}
                    title={t.title}
                  >
                    <span className={`vf-badge ${t.accent}`} style={{ fontSize: 9, marginRight: 6 }}>{t.accent}</span>
                    {t.hasRecentActivity && !isFocused && (
                      <span className="activity-dot" title="New output" />
                    )}
                    <span className="terminal-title" style={{ fontFamily: "var(--vf-mono, monospace)" }}>{t.title}</span>
                    <button
                      className="terminal-close"
                      onClick={(e) => { e.stopPropagation(); closeTerminal(t.ptyId); }}
                      title="Close terminal (kill PTY)"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Focused viewer (right / main) */}
            <div className="terminal-viewer">
              {focusedSession ? (
                <TerminalPane
                  ptyId={focusedSession.ptyId}
                  title={focusedSession.title}
                  accent={focusedSession.accent}
                  onData={() => {
                    if (launched.length > 0) {
                      setStatus(`input to ${focusedSession.title}`);
                    }
                  }}
                  onClose={() => closeTerminal(focusedSession.ptyId)}
                  onActivity={(id) => {
                    // Mark activity on the session (for list indicator). If it's the focused one, no need.
                    if (id !== focusedPtyId) {
                      setTerminals(prev =>
                        prev.map(t => t.ptyId === id ? { ...t, hasRecentActivity: true } : t)
                      );
                    }
                  }}
                />
              ) : (
                <div style={{ padding: 20, color: "var(--vf-muted)", fontSize: 12 }}>
                  Select or create a terminal from the list on the left.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panels — context tools (browser/http/diff stubs) */}
        <div className={`vf-right ${rightCollapsed ? 'collapsed' : ''}`}>
          <div
            className="vf-panel-header"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setRightCollapsed(!rightCollapsed)}
            title={rightCollapsed ? "Expand context panel" : "Collapse context panel for terminal focus"}
          >
            <span>CONTEXT • SEND TO AGENT</span>
            <span style={{ fontSize: 10, color: 'var(--vf-muted)' }}>
              {rightCollapsed ? '◀' : '▶'}
            </span>
          </div>

          {!rightCollapsed && (
            <>
              <button className="w-full text-left px-sm py-1 bg-surface border-grid rounded text-label-sm font-label-sm text-on-surface hover:bg-surface-container flex items-center justify-between">
                <span className="flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">language</span> Browser Stub</span>
                <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              </button>

              <button className="w-full text-left px-sm py-1 bg-surface border-grid rounded text-label-sm font-label-sm text-on-surface hover:bg-surface-container flex items-center justify-between">
                <span className="flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">api</span> HTTP Stub</span>
                <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              </button>

              <button className="w-full text-left px-sm py-1 bg-surface border-grid rounded text-label-sm font-label-sm text-on-surface hover:bg-surface-container flex items-center justify-between">
                <span className="flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">difference</span> AI Diff Review</span>
                <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
              </button>

              {/* Quick Delegate — styled closer to Stitch mock for better polish and UX */}
              <div className="vf-context-item" style={{ borderTop: "1px solid var(--vf-border)", paddingTop: 8 }}>
                <div className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold mb-xs">Quick Delegate</div>

                {/* Target selector: allow choosing any open terminal, not just focused */}
                {terminals.length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 9, color: "var(--vf-muted)", marginBottom: 2 }}>Target terminal</div>
                    <select
                      value={delegateTargetId || focusedPtyId || ""}
                      onChange={(e) => setDelegateTargetId(e.target.value || null)}
                      className="vf-input"
                      style={{ width: "100%", fontSize: 10, padding: "2px 4px" }}
                    >
                      {terminals.map((t) => (
                        <option key={t.ptyId} value={t.ptyId}>
                          {t.title} {t.ptyId === focusedPtyId ? "(focused)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <textarea
                  value={delegatePrompt}
                  onChange={(e) => setDelegatePrompt(e.target.value)}
                  placeholder="Describe the task for the agent..."
                  style={{ width: "100%", minHeight: 48, fontSize: 11, background: "var(--vf-surface)", border: "1px solid var(--vf-border)", color: "var(--vf-text)", padding: 4, borderRadius: 3 }}
                />

                {/* Context injection from FileTree (last clicked file/dir) */}
                {lastTreeContext && (
                  <button
                    className="vf-btn"
                    style={{ fontSize: 9, padding: "1px 4px", marginTop: 3 }}
                    onClick={() => {
                      const ctx = `\n\n[context from tree]\n${lastTreeContext}`;
                      setDelegatePrompt((p) => (p.trim() ? p + ctx : ctx.trim()));
                    }}
                  >
                    Insert tree context: {lastTreeContext.length > 28 ? "..." + lastTreeContext.slice(-25) : lastTreeContext}
                  </button>
                )}

                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  <button
                    className="vf-btn"
                    style={{ fontSize: 10, padding: "2px 6px", flex: 1 }}
                    disabled={!(delegateTargetId || focusedPtyId) || !delegatePrompt.trim()}
                    onClick={async () => {
                      const target = delegateTargetId || focusedPtyId;
                      if (!target) return;
                      const taskMsg = `Task:\n${delegatePrompt.trim()}\n\nPlease complete this task. Use any provided context.`;
                      try {
                        await invoke("write_to_terminal", { id: target, data: taskMsg + "\n" });
                        setStatus(`Task sent to ${target}`);
                        setDelegatePrompt("");
                        setLastCaptured(""); // clear previous capture when sending new work
                      } catch (e: any) {
                        setStatus(`Delegate failed: ${e}`);
                      }
                    }}
                  >
                    Send task to target
                  </button>
                  <button
                    className="vf-btn"
                    style={{ fontSize: 10, padding: "2px 6px" }}
                    onClick={async () => {
                      // Demo the improved strip using realistic multi-line output (with trailing garbage after stop message).
                      // This matches real Claude Code sessions.
                      const sample = `Đây là phân tích lỗi...
   Tôi đã kiểm tra file A và B.
   Kết luận: cần sửa logic X.

   Claude Code has stopped
   Một số dòng rác sau này không được xuất hiện`;
                      try {
                        const cleaned: string = await invoke("strip_claude_stop_messages", { output: sample });
                        setStatus(`Strip demo: ${cleaned}`);
                      } catch (e: any) {
                        setStatus(`Strip failed: ${e}`);
                      }
                    }}
                  >
                    Demo strip
                  </button>
                  <button
                    className="vf-btn"
                    style={{ fontSize: 10, padding: "2px 6px" }}
                    disabled={!(delegateTargetId || focusedPtyId)}
                    onClick={async () => {
                      const target = delegateTargetId || focusedPtyId;
                      if (!target) return;
                      try {
                        const raw: string = await invoke("get_terminal_output", { id: target });
                        const cleaned: string = await invoke("strip_claude_stop_messages", { output: raw });
                        setLastCaptured(cleaned);
                        setStatus(`Captured ${raw.length} chars → stripped to ${cleaned.length} (from ${target})`);
                      } catch (e: any) {
                        setStatus(`Capture failed: ${e}`);
                      }
                    }}
                  >
                    Capture last + strip
                  </button>
                </div>

                {/* Small result area for the last captured+stripped output (foundation for review / re-use) */}
                {lastCaptured && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: 9, color: "var(--vf-muted)", marginBottom: 2 }}>
                      Last captured + stripped:
                    </div>
                    <textarea
                      readOnly
                      value={lastCaptured}
                      style={{
                        width: "100%",
                        minHeight: 52,
                        fontSize: 9,
                        background: "var(--vf-surface)",
                        border: "1px solid var(--vf-border)",
                        color: "var(--vf-text)",
                        padding: 4,
                        borderRadius: 3,
                        fontFamily: "var(--vf-mono, monospace)",
                      }}
                    />
                    <button
                      className="vf-btn"
                      style={{ fontSize: 9, padding: "1px 4px", marginTop: 2 }}
                      onClick={() => {
                        navigator.clipboard?.writeText(lastCaptured).catch(() => {});
                        setStatus("Copied captured output to clipboard");
                      }}
                    >
                      Copy
                    </button>
                  </div>
                )}

                <div style={{ fontSize: 9, color: "var(--vf-muted)", marginTop: 2 }}>
                  Choose target • insert tree context • Capture last output then strip. All via existing PTY surface.
                </div>
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ padding: 10, fontSize: 10, color: "var(--vf-muted)", borderTop: "1px solid var(--vf-border)" }}>
                Drag files / terminal output / browser here to send context (future). Orchestration foundation active.
              </div>
            </>
          )}
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

