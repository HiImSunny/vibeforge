import { useState, useRef, useCallback, useEffect } from "react";

interface ConsoleLogEntry {
  id: number;
  level: "log" | "warn" | "error" | "info" | "debug";
  message: string;
  timestamp: string;
}

interface BrowserTab {
  id: string;
  url: string;
  title: string;
  history: string[];
  historyIndex: number;
  consoleLogs: ConsoleLogEntry[];
  isLoading: boolean;
  urlBarValue: string;
}

type LogFilter = "all" | "error" | "warn" | "log";

interface BrowserPanelProps {
  onSendToAI?: (context: string) => void;
  focusedTerminalName?: string | null;
}

let logIdCounter = 0;
function makeLogEntry(level: ConsoleLogEntry["level"], message: string): ConsoleLogEntry {
  logIdCounter += 1;
  return { id: logIdCounter, level, message, timestamp: new Date().toISOString() };
}

function formatTime(iso: string): string {
  try { const d = new Date(iso); return d.toLocaleTimeString("en-US", { hour12: false }); }
  catch { return iso.slice(11, 19) || iso; }
}

function generateTabId(): string {
  return "btab-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  if (t.includes(".") && !t.includes(" ")) return "https://" + t;
  return "https://www.google.com/search?q=" + encodeURIComponent(t);
}

function createNewTab(): BrowserTab {
  return {
    id: generateTabId(),
    url: "",
    title: "New Tab",
    history: [],
    historyIndex: -1,
    consoleLogs: [],
    isLoading: false,
    urlBarValue: "",
  };
}

export default function BrowserPanel({ onSendToAI, focusedTerminalName }: BrowserPanelProps) {
  const [tabs, setTabs] = useState<BrowserTab[]>(() => [createNewTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || "");
  const [logFilter, setLogFilter] = useState<LogFilter>("all");
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const iframeKey = activeTab ? activeTab.id + "-" + activeTab.url : "empty";

  function updateActiveTab(patch: Partial<BrowserTab>) {
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, ...patch } : t));
  }

  function addConsoleLog(level: ConsoleLogEntry["level"], message: string) {
    const entry = makeLogEntry(level, message);
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, consoleLogs: [...t.consoleLogs, entry] } : t));
  }

  const navigateTo = useCallback((rawUrl: string) => {
    const url = normalizeUrl(rawUrl);
    if (!url) return;
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId) return t;
      const newHistory = t.history.slice(0, t.historyIndex + 1);
      newHistory.push(url);
      return {
        ...t, url, urlBarValue: url,
        history: newHistory, historyIndex: newHistory.length - 1,
        isLoading: true,
        consoleLogs: [...t.consoleLogs, makeLogEntry("info", "Navigating to " + url)],
      };
    }));
  }, [activeTabId]);

  function goBack() {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId || t.historyIndex <= 0) return t;
      const ni = t.historyIndex - 1;
      return { ...t, url: t.history[ni], urlBarValue: t.history[ni], historyIndex: ni, isLoading: true,
        consoleLogs: [...t.consoleLogs, makeLogEntry("info", "Back to " + t.history[ni])] };
    }));
  }

  function goForward() {
    setTabs(prev => prev.map(t => {
      if (t.id !== activeTabId || t.historyIndex >= t.history.length - 1) return t;
      const ni = t.historyIndex + 1;
      return { ...t, url: t.history[ni], urlBarValue: t.history[ni], historyIndex: ni, isLoading: true,
        consoleLogs: [...t.consoleLogs, makeLogEntry("info", "Forward to " + t.history[ni])] };
    }));
  }

  function refreshPage() {
    const tab = activeTab;
    if (!tab || !tab.url) return;
    addConsoleLog("info", "Refreshing " + tab.url);
    const url = tab.url;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: url + "#__r=" + Date.now(), isLoading: true } : t));
    setTimeout(() => {
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, url: url, isLoading: false } : t));
    }, 50);
  }

  function addTab() {
    const nt = createNewTab();
    setTabs(prev => [...prev, nt]);
    setActiveTabId(nt.id);
  }

  function closeTab(tabId: string) {
    setTabs(prev => {
      const remaining = prev.filter(t => t.id !== tabId);
      if (remaining.length === 0) {
        const fresh = createNewTab();
        setActiveTabId(fresh.id);
        return [fresh];
      }
      if (activeTabId === tabId) {
        const idx = prev.findIndex(t => t.id === tabId);
        setActiveTabId(remaining[Math.min(idx, remaining.length - 1)].id);
      }
      return remaining;
    });
  }

  function handleIframeLoad() {
    updateActiveTab({ isLoading: false });
    try {
      const ifrm = iframeRef.current;
      if (ifrm && ifrm.contentDocument) {
        updateActiveTab({ title: ifrm.contentDocument.title || activeTab?.url || "Loaded" });
      }
    } catch (_) { /* cross-origin */ }
    addConsoleLog("info", "Page loaded: " + (activeTab?.url || "about:blank"));
  }

  function handleIframeError() {
    updateActiveTab({ isLoading: false });
    addConsoleLog("error", "Failed to load: " + (activeTab?.url || "unknown URL"));
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data && e.data.type === "vibeforge-console") {
        const { level, message } = e.data;
        if (["log","warn","error","info","debug"].includes(level) && typeof message === "string") {
          addConsoleLog(level as ConsoleLogEntry["level"], message);
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeTabId]);

  function handleSendToAI() {
    const tab = activeTab;
    if (!tab) return;
    const filteredLogs = logFilter === "all" ? tab.consoleLogs : tab.consoleLogs.filter(l => l.level === logFilter);
    const lines = [
      "[Browser Context]",
      "URL: " + (tab.url || "(none)"),
      "Title: " + (tab.title || "(unknown)"),
      "Captured at: " + new Date().toISOString(),
      "",
      "Console Logs (" + filteredLogs.length + " entries):",
    ];
    for (const l of filteredLogs) {
      lines.push("[" + l.level.toUpperCase() + "] " + formatTime(l.timestamp) + " \u2014 " + l.message);
    }
    if (onSendToAI) {
      onSendToAI(lines.join("\n"));
      setSendStatus("Sent to " + (focusedTerminalName || "terminal"));
      setTimeout(() => setSendStatus(null), 3000);
    }
  }

  const filteredLogs = logFilter === "all" ? (activeTab?.consoleLogs || []) : (activeTab?.consoleLogs || []).filter(l => l.level === logFilter);
  const canGoBack = activeTab ? activeTab.historyIndex > 0 : false;
  const canGoForward = activeTab ? activeTab.historyIndex < activeTab.history.length - 1 : false;

  return (
    <div className="browser-panel">
      <div className="browser-tab-bar">
        <div className="browser-tabs">
          {tabs.map(tab => (
            <div key={tab.id} className={"browser-tab" + (tab.id === activeTabId ? " active" : "")}
              onClick={() => setActiveTabId(tab.id)} title={tab.url || "New Tab"}>
              <span className="browser-tab-title">{tab.title || "New Tab"}</span>
              <button className="browser-tab-close" onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                aria-label={"Close tab " + (tab.title || "New Tab")} title="Close tab">{String.fromCharCode(215)}</button>
            </div>
          ))}
        </div>
        <button className="browser-new-tab-btn" onClick={addTab} aria-label="Open new browser tab" title="New tab">+</button>
      </div>

      <div className="browser-toolbar">
        <div className="browser-nav-btns">
          <button className="browser-nav-btn" onClick={goBack} disabled={!canGoBack}
            aria-label="Navigate back" title="Navigate back">{String.fromCharCode(8249)}</button>
          <button className="browser-nav-btn" onClick={goForward} disabled={!canGoForward}
            aria-label="Navigate forward" title="Navigate forward">{String.fromCharCode(8250)}</button>
          <button className="browser-nav-btn" onClick={refreshPage}
            aria-label="Refresh page" title="Refresh page">{String.fromCharCode(8635)}</button>
        </div>
        <form className="browser-url-form" onSubmit={e => { e.preventDefault(); navigateTo(activeTab?.urlBarValue || ""); }}>
          <input className="browser-url-input" type="text" value={activeTab?.urlBarValue || ""}
            onChange={e => updateActiveTab({ urlBarValue: e.target.value })}
            placeholder="Enter URL or search term..." aria-label="Browser URL bar" spellCheck={false} />
        </form>
        <button className="browser-send-btn" onClick={handleSendToAI} disabled={!activeTab?.url}
          aria-label="Send current page context to AI" title={"Send to " + (focusedTerminalName || "AI")}>
          Send to AI
        </button>
      </div>

      {sendStatus && <div className="browser-send-status">{sendStatus}</div>}

      <div className="browser-webview-wrap">
        {activeTab?.url ? (
          <iframe ref={iframeRef} key={iframeKey} className="browser-iframe" src={activeTab.url}
            title="Embedded browser webview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            onLoad={handleIframeLoad} onError={handleIframeError} />
        ) : (
          <div className="browser-empty-state">
            <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: 0.3 }}>language</span>
            <p>Enter a URL above to start browsing</p>
          </div>
        )}
        {activeTab?.isLoading && <div className="browser-loading-bar" />}
      </div>

      <div className="browser-console">
        <div className="browser-console-header">
          <span className="browser-console-label">Console</span>
          <div className="browser-console-filters">
            {(["all","error","warn","log"] as LogFilter[]).map(f => (
              <button key={f} className={"browser-filter-btn" + (logFilter === f ? " active" : "")}
                onClick={() => setLogFilter(f)} aria-pressed={logFilter === f}
                aria-label={"Filter console: " + f}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="browser-console-clear" onClick={() => updateActiveTab({ consoleLogs: [] })}
            aria-label="Clear console logs" title="Clear console">Clear</button>
        </div>
        <div className="browser-console-output">
          {filteredLogs.length === 0 ? (
            <div className="browser-console-empty">No console output yet. Navigate to a page to see logs.</div>
          ) : (
            filteredLogs.map(entry => (
              <div key={entry.id} className={"browser-log-entry level-" + entry.level}>
                <span className="browser-log-level">{entry.level.toUpperCase()}</span>
                <span className="browser-log-time">{formatTime(entry.timestamp)}</span>
                <span className="browser-log-msg">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
