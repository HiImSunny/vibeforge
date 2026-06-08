import { useState, useCallback, useEffect, useRef } from "react";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
interface HttpHeader { id: string; key: string; value: string; }
interface EnvVariable { id: string; key: string; value: string; }
interface SavedRequest { id: string; name: string; method: HttpMethod; url: string; headers: { key: string; value: string }[]; body: string; createdAt: string; }
interface HttpResponseData { status: number; statusText: string; headers: Record<string, string>; body: string; contentType: string; elapsed: number; }
type RequestState = "idle" | "loading" | "success" | "error";
interface HttpClientPanelProps { onSendToAI?: (context: string) => void; focusedTerminalName?: string | null; }
const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH"];
const METHODS_WITH_BODY: HttpMethod[] = ["POST", "PUT", "PATCH"];
const REQUEST_TIMEOUT_MS = 30_000;
const LS_COLLECTIONS_KEY = "vf-http-collections";
const LS_ENV_KEY = "vf-http-env";
const METHOD_COLORS: Record<HttpMethod, string> = { GET: "#4ae176", POST: "#3498db", PUT: "#f0a050", DELETE: "#ff6b6b", PATCH: "#9b59b6" };

let headerIdCounter = 0;
function makeHeaderId(): string { headerIdCounter += 1; return "h-" + headerIdCounter; }
let envIdCounter = 0;
function makeEnvId(): string { envIdCounter += 1; return "e-" + envIdCounter; }
function isValidUrl(raw: string): boolean { try { const u = new URL(raw); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } }
function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function resolveEnvVars(template: string, env: EnvVariable[]): string { let result = template; for (const v of env) { if (!v.key) continue; result = result.replace(new RegExp("\\{\\{\\s*" + escapeRegex(v.key) + "\\s*\\}\\}", "g"), v.value); } return result; }
function statusColorClass(status: number): string { if (status >= 200 && status < 300) return "status-2xx"; if (status >= 400 && status < 500) return "status-4xx"; if (status >= 500) return "status-5xx"; return "status-other"; }
function statusColorHex(status: number): string { if (status >= 200 && status < 300) return "#4ae176"; if (status >= 400 && status < 500) return "#f0a050"; if (status >= 500) return "#ff6b6b"; return "#8c909f"; }
function formatBodyAsJson(raw: string): string { try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; } }
function h(s: string): string { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function highlightJsonHtml(json: string): string {
  try {
    JSON.parse(json);
    return json.split("\n").map(line => {
      const m = line.match(/^(\s*)"([^"]+)"(\s*):(\s*)(.*)/);
      if (m) {
        const indent = m[1]; const key = m[2]; const colonSp = m[3]; const valSp = m[4];
        let rawVal = m[5].trimEnd(); let valColor = "#c2c6d6"; let hasComma = false;
        if (rawVal.endsWith(",")) { rawVal = rawVal.slice(0, -1); hasComma = true; }
        if (rawVal === "true" || rawVal === "false") valColor = "#9b59b6";
        else if (rawVal === "null") valColor = "#8c909f";
        else if (/^-?\d+(\.\d+)?$/.test(rawVal)) valColor = "#3498db";
        else if (rawVal.startsWith('"')) valColor = "#4ae176";
        return '<div class="json-line"><span style="color:#c2c6d6">' + h(indent) + '"</span><span style="color:#f0a050">' + h(key) + '</span><span style="color:#c2c6d6">"' + h(colonSp) + ':' + h(valSp) + '</span><span style="color:' + valColor + '">' + h(rawVal) + '</span>' + (hasComma ? '<span style="color:#c2c6d6">,</span>' : "") + '</div>';
      }
      return '<div class="json-line"><span style="color:#c2c6d6">' + h(line || " ") + '</span></div>';
    }).join("");
  } catch {
    return json.split("\n").map(line => '<div class="json-line"><span style="color:#c2c6d6">' + h(line || " ") + '</span></div>').join("");
  }
}
export default function HttpClientPanel({ onSendToAI, focusedTerminalName }: HttpClientPanelProps) {
  const [method, setMethod] = useState<HttpMethod>("GET");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<HttpHeader[]>(() => [
    { id: makeHeaderId(), key: "Accept", value: "application/json" },
    { id: makeHeaderId(), key: "Content-Type", value: "application/json" },
  ]);
  const [body, setBody] = useState("");
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [response, setResponse] = useState<HttpResponseData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHeaders, setShowHeaders] = useState(true);
  const [showBody, setShowBody] = useState(false);
  const [showResHeaders, setShowResHeaders] = useState(false);
  const [showResBody, setShowResBody] = useState(true);
  const [showCollections, setShowCollections] = useState(false);
  const [showEnv, setShowEnv] = useState(false);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>(() => {
    try { const raw = localStorage.getItem(LS_COLLECTIONS_KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });
  const [saveName, setSaveName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVariable[]>(() => {
    try { const raw = localStorage.getItem(LS_ENV_KEY); return raw ? JSON.parse(raw) : []; }
    catch { return []; }
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { localStorage.setItem(LS_COLLECTIONS_KEY, JSON.stringify(savedRequests)); }, [savedRequests]);
  useEffect(() => { localStorage.setItem(LS_ENV_KEY, JSON.stringify(envVars)); }, [envVars]);

  const urlInvalid = url.trim().length > 0 && !isValidUrl(resolveEnvVars(url, envVars));
  const methodHasBody = METHODS_WITH_BODY.includes(method);

  const sendRequest = useCallback(async () => {
    const resolvedUrl = resolveEnvVars(url.trim(), envVars);
    if (!resolvedUrl) { setErrorMessage("URL is required"); setRequestState("error"); return; }
    if (!isValidUrl(resolvedUrl)) { setErrorMessage("Invalid URL: " + resolvedUrl); setRequestState("error"); return; }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRequestState("loading"); setErrorMessage(null); setResponse(null);
    const startTime = performance.now();
    try {
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const resolvedHeaders: Record<string, string> = {};
      for (const h of headers) { if (!h.key.trim()) continue; resolvedHeaders[h.key.trim()] = resolveEnvVars(h.value, envVars); }
      const fetchOptions: RequestInit = { method, headers: resolvedHeaders, signal: controller.signal };
      if (methodHasBody && body.trim()) fetchOptions.body = body;
      const res = await fetch(resolvedUrl, fetchOptions);
      clearTimeout(timeoutId);
      const elapsed = Math.round(performance.now() - startTime);
      const resHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => { resHeaders[key] = val; });
      const contentType = res.headers.get("content-type") || "";
      let resBody = "";
      try { resBody = await res.text(); } catch { resBody = "[Could not read response body]"; }
      setResponse({ status: res.status, statusText: res.statusText, headers: resHeaders, body: resBody, contentType, elapsed });
      setRequestState("success");
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        const elapsed = Math.round(performance.now() - startTime);
        setErrorMessage(elapsed >= REQUEST_TIMEOUT_MS ? "Request timed out after " + (REQUEST_TIMEOUT_MS / 1000) + "s" : "Request was cancelled");
      } else if (err instanceof TypeError && err.message === "Failed to fetch") {
        setErrorMessage("Network error: Could not connect to the server. Check the URL and your internet connection.");
      } else if (err instanceof Error) { setErrorMessage(err.message || "Request failed"); }
      else { setErrorMessage("Request failed"); }
      setRequestState("error");
    }
  }, [url, method, headers, body, envVars, methodHasBody]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && requestState !== "loading") { e.preventDefault(); sendRequest(); }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sendRequest, requestState]);

  function saveCurrentRequest() {
    if (!url.trim()) return;
    const filteredHeaders = headers.filter(h => h.key.trim());
    const newReq: SavedRequest = {
      id: "saved-" + Date.now(),
      name: saveName.trim() || method + " " + (url.length > 30 ? url.slice(0, 28) + "..." : url),
      method, url,
      headers: filteredHeaders.map(h => ({ key: h.key, value: h.value })),
      body,
      createdAt: new Date().toISOString(),
    };
    setSavedRequests(prev => [...prev, newReq]);
    setSaveName(""); setShowSaveDialog(false);
  }

  function loadSavedRequest(req: SavedRequest) {
    setMethod(req.method); setUrl(req.url);
    setHeaders(req.headers.map(h => ({ id: makeHeaderId(), key: h.key, value: h.value })));
    setBody(req.body); setResponse(null); setRequestState("idle"); setErrorMessage(null); setShowCollections(false);
  }

  function deleteSavedRequest(id: string) { setSavedRequests(prev => prev.filter(r => r.id !== id)); }
  function addHeader() { setHeaders(prev => [...prev, { id: makeHeaderId(), key: "", value: "" }]); }
  function updateHeader(id: string, field: "key" | "value", val: string) { setHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h)); }
  function removeHeader(id: string) { setHeaders(prev => prev.filter(h => h.id !== id)); }
  function addEnvVar() { setEnvVars(prev => [...prev, { id: makeEnvId(), key: "", value: "" }]); }
  function updateEnvVar(id: string, field: "key" | "value", val: string) { setEnvVars(prev => prev.map(e => e.id === id ? { ...e, [field]: val } : e)); }
  function removeEnvVar(id: string) { setEnvVars(prev => prev.filter(e => e.id !== id)); }

  function handleSendToAI() {
    if (!response || !onSendToAI) return;
    const lines = [
      "[HTTP Response]",
      "Request: " + method + " " + url,
      "Status: " + response.status + " " + response.statusText,
      "Timestamp: " + new Date().toISOString(),
      "",
      "Response Headers:",
    ];
    const headerKeys = Object.keys(response.headers);
    if (headerKeys.length === 0) { lines.push("  (none)"); }
    else { for (const k of headerKeys) lines.push("  " + k + ": " + response.headers[k]); }
    lines.push(""); lines.push("Response Body:");
    const formattedBody = formatBodyAsJson(response.body);
    const maxLen = 4000;
    if (formattedBody.length > maxLen) {
      lines.push(formattedBody.slice(0, maxLen));
      lines.push("... [truncated, " + formattedBody.length + " chars total]");
    } else {
      lines.push(formattedBody || "(empty)");
    }
    onSendToAI(lines.join("\n"));
  }

  const hasUndefinedVars = (() => {
    const regex = /\{\{\s*(\w[\w-]*)\s*\}\}/g;
    let m;
    while ((m = regex.exec(url)) !== null) { if (!envVars.find(v => v.key === m![1])) return true; }
    for (const h of headers) { regex.lastIndex = 0; while ((m = regex.exec(h.value)) !== null) { if (!envVars.find(v => v.key === m![1])) return true; } }
    return false;
  })();
  return (
    <div className="http-panel">
      <div className="http-glass-header">
        <div className="http-header-left">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>api</span>
          <span className="http-title">HTTP Client</span>
        </div>
        <div className="http-header-actions">
          <button className={"http-header-btn" + (showCollections ? " active" : "")} onClick={() => { setShowCollections(!showCollections); setShowEnv(false); }} title="Request Collections" aria-label="Toggle request collections" aria-pressed={showCollections}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>bookmark</span>
          </button>
          <button className={"http-header-btn" + (showEnv ? " active" : "")} onClick={() => { setShowEnv(!showEnv); setShowCollections(false); }} title="Environment Variables" aria-label="Toggle environment variables" aria-pressed={showEnv}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>tune</span>
          </button>
        </div>
      </div>

      {showCollections && (
        <div className="http-collections">
          <div className="http-collections-header">
            <span className="http-section-label">COLLECTIONS</span>
            <button className="http-collection-add-btn" onClick={() => setShowSaveDialog(true)} title="Save current request" aria-label="Save current request to collection">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>save</span> Save
            </button>
          </div>
          {showSaveDialog && (
            <div className="http-save-dialog">
              <input className="http-save-input" type="text" value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Request name (optional)" autoFocus
                onKeyDown={e => { if (e.key === "Enter") saveCurrentRequest(); if (e.key === "Escape") setShowSaveDialog(false); }} />
              <div className="http-save-actions">
                <button className="http-save-confirm" onClick={saveCurrentRequest} disabled={!url.trim()}>Save</button>
                <button className="http-save-cancel" onClick={() => { setShowSaveDialog(false); setSaveName(""); }}>Cancel</button>
              </div>
            </div>
          )}
          {savedRequests.length === 0 ? (
            <div className="http-collections-empty">No saved requests</div>
          ) : (
            <div className="http-collections-list">
              {savedRequests.map(req => (
                <div key={req.id} className="http-collection-item" role="button" tabIndex={0} onClick={() => loadSavedRequest(req)} onKeyDown={e => { if (e.key === "Enter") loadSavedRequest(req); }}
                  title={"Load: " + req.name}>
                  <span className="http-collection-method" style={{ color: METHOD_COLORS[req.method] }}>{req.method}</span>
                  <span className="http-collection-name">{req.name}</span>
                  <button className="http-collection-delete" onClick={e => { e.stopPropagation(); deleteSavedRequest(req.id); }} title="Delete saved request" aria-label={"Delete " + req.name}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEnv && (
        <div className="http-env">
          <div className="http-env-header">
            <span className="http-section-label">ENVIRONMENT</span>
            <button className="http-env-add-btn" onClick={addEnvVar} title="Add variable" aria-label="Add environment variable">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>add</span> Add
            </button>
          </div>
          {envVars.length === 0 ? (
            <div className="http-env-empty">No variables defined. Use {'{{'}varName{'}}'} in URL or headers.</div>
          ) : (
            <div className="http-env-list">
              {envVars.map(v => (
                <div key={v.id} className="http-env-row">
                  <input className="http-env-key" type="text" value={v.key} onChange={e => updateEnvVar(v.id, "key", e.target.value)} placeholder="varName" spellCheck={false} />
                  <span className="http-env-eq">=</span>
                  <input className="http-env-value" type="text" value={v.value} onChange={e => updateEnvVar(v.id, "value", e.target.value)} placeholder="value" spellCheck={false} />
                  <button className="http-env-remove" onClick={() => removeEnvVar(v.id)} title="Remove variable" aria-label="Remove variable">
                    <span className="material-symbols-outlined" style={{ fontSize: 10 }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="http-request-row">
        <select className="http-method-select" value={method} onChange={e => setMethod(e.target.value as HttpMethod)} aria-label="HTTP method" style={{ color: METHOD_COLORS[method] }}>
          {METHODS.map(m => <option key={m} value={m} style={{ color: METHOD_COLORS[m] }}>{m}</option>)}
        </select>
        <input className={"http-url-input" + (urlInvalid ? " invalid" : "")} type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://api.example.com/endpoint" aria-label="Request URL" spellCheck={false}
          onKeyDown={e => { if (e.key === "Enter" && requestState !== "loading") { e.preventDefault(); sendRequest(); } }} />
        <button className={"http-send-btn" + (requestState === "loading" ? " loading" : "")} onClick={sendRequest} disabled={requestState === "loading"} aria-label="Send HTTP request" title="Send request (Ctrl+Enter)">
          {requestState === "loading" ? <span className="http-spinner" /> : <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>}
        </button>
      </div>

      {urlInvalid && <div className="http-inline-error">{String.fromCharCode(9888)} Invalid URL format</div>}
      {hasUndefinedVars && <div className="http-inline-warning">{String.fromCharCode(9888)} Some {'{{'}variables{'}}'} are not defined</div>}

      <div className="http-section">
        <button className="http-section-toggle" onClick={() => setShowHeaders(!showHeaders)} aria-expanded={showHeaders} aria-label="Toggle headers editor">
          <span className={"material-symbols-outlined toggle-icon" + (showHeaders ? " open" : "")} style={{ fontSize: 12 }}>chevron_right</span>
          Headers ({headers.filter(h => h.key.trim()).length})
        </button>
        {showHeaders && (
          <div className="http-headers-list">
            {headers.map(h => (
              <div key={h.id} className="http-header-row">
                <input className="http-header-key" type="text" value={h.key} onChange={e => updateHeader(h.id, "key", e.target.value)} placeholder="Key" spellCheck={false} />
                <input className="http-header-value" type="text" value={h.value} onChange={e => updateHeader(h.id, "value", e.target.value)} placeholder="Value" spellCheck={false} />
                <button className="http-header-remove" onClick={() => removeHeader(h.id)} title="Remove header" aria-label="Remove header">
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }}>close</span>
                </button>
              </div>
            ))}
            <button className="http-add-btn" onClick={addHeader} aria-label="Add header">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>add</span> Add Header
            </button>
          </div>
        )}
      </div>

      {methodHasBody && (
        <div className="http-section">
          <button className="http-section-toggle" onClick={() => setShowBody(!showBody)} aria-expanded={showBody} aria-label="Toggle body editor">
            <span className={"material-symbols-outlined toggle-icon" + (showBody ? " open" : "")} style={{ fontSize: 12 }}>chevron_right</span>
            Body {body.trim() ? <span className="http-body-indicator">{String.fromCharCode(9679)}</span> : null}
          </button>
          {showBody && (
            <div className="http-body-editor-wrap">
              <textarea className="http-body-editor" value={body} onChange={e => setBody(e.target.value)} placeholder='{"key": "value"}' spellCheck={false} aria-label="Request body" />
            </div>
          )}
        </div>
      )}

      {(requestState === "success" || requestState === "error") && (
        <div className="http-response-area">
          {response && (
            <div className={"http-status-bar " + statusColorClass(response.status)}>
              <span className="http-status-code" style={{ color: statusColorHex(response.status) }}>
                {String.fromCharCode(9679)} {response.status} {response.statusText}
              </span>
              <span className="http-status-time">{response.elapsed}ms</span>
            </div>
          )}
          {requestState === "error" && errorMessage && (
            <div className="http-error-msg">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>error</span>
              {errorMessage}
            </div>
          )}
          {response && (
            <div className="http-section">
              <button className="http-section-toggle" onClick={() => setShowResHeaders(!showResHeaders)} aria-expanded={showResHeaders} aria-label="Toggle response headers">
                <span className={"material-symbols-outlined toggle-icon" + (showResHeaders ? " open" : "")} style={{ fontSize: 12 }}>chevron_right</span>
                Response Headers ({Object.keys(response.headers).length})
              </button>
              {showResHeaders && (
                <div className="http-res-headers-list">
                  {Object.keys(response.headers).length === 0 ? (
                    <div className="http-res-empty">No headers</div>
                  ) : (
                    Object.entries(response.headers).map(([k, v]) => (
                      <div key={k} className="http-res-header-row">
                        <span className="http-res-header-key">{k}</span>
                        <span className="http-res-header-val">{v}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
          {response && (
            <div className="http-section">
              <button className="http-section-toggle" onClick={() => setShowResBody(!showResBody)} aria-expanded={showResBody} aria-label="Toggle response body">
                <span className={"material-symbols-outlined toggle-icon" + (showResBody ? " open" : "")} style={{ fontSize: 12 }}>chevron_right</span>
                Response Body ({response.body.length}B)
              </button>
              {showResBody && (
                <div className="http-res-body-wrap">
                  {!response.body ? (
                    <div className="http-res-empty">Empty response body</div>
                  ) : response.contentType.includes("json") ? (
                    <div className="http-res-body-json" dangerouslySetInnerHTML={{ __html: highlightJsonHtml(formatBodyAsJson(response.body)) }} />
                  ) : (
                    <pre className="http-res-body-raw">{response.body}</pre>
                  )}
                </div>
              )}
            </div>
          )}
          {response && onSendToAI && (
            <button className="http-send-ai-btn" onClick={handleSendToAI} title={"Send response to " + (focusedTerminalName || "AI")} aria-label="Send response to AI">
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>smart_toy</span>
              Send Response to AI
            </button>
          )}
        </div>
      )}

      {requestState === "idle" && !response && (
        <div className="http-empty-state">
          <span className="material-symbols-outlined" style={{ fontSize: 24, opacity: 0.3 }}>api</span>
          <p>Enter a URL and click Send<br />to test an HTTP request</p>
        </div>
      )}
    </div>
  );
}