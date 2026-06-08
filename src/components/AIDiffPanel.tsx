import { useState, useEffect, useCallback } from "react";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import type { ChangedFile } from "../utils/diffUtils";
import {
  createChangedFile,
  applyAcceptedChanges,
  hasRemainingChanges,
  resetHunkCounter,
} from "../utils/diffUtils";

interface AIDiffPanelProps {
  onStatus?: (msg: string) => void;
}

/** Sample demo changes to illustrate the feature */
function createSampleChanges(): ChangedFile[] {
  resetHunkCounter();
  const files: ChangedFile[] = [];

  // Sample 1: Add a welcome message to App.tsx
  files.push(
    createChangedFile(
      "src/App.tsx",
      `import { useState } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="App">
      <h1>Vibeforge</h1>
    </div>
  );
}

export default App;`,
      `import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="App">
      <h1>Vibeforge</h1>
      {loaded && <p>Welcome to Vibeforge AI</p>}
    </div>
  );
}

export default App;`
    )
  );

  // Sample 2: Add a utility function
  files.push(
    createChangedFile(
      "src/utils/helpers.ts",
      `export function formatDate(date: Date): string {
  return date.toISOString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}`,
      `export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateId(): string {
  return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`
    )
  );

  // Sample 3: CSS change
  files.push(
    createChangedFile(
      "src/styles/theme.css",
      `:root {
  --primary: #4a90d9;
  --secondary: #7c3aed;
  --bg: #ffffff;
  --text: #1a1a2e;
}

body {
  font-family: sans-serif;
  margin: 0;
  padding: 0;
}`,
      `:root {
  --primary: #f0a050;
  --secondary: #9b59b6;
  --bg: #080c14;
  --text: #e2e2e8;
  --surface: #0d1321;
  --border: #1e2d40;
}

body {
  font-family: Inter, sans-serif;
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
}

::selection {
  background: rgba(240, 160, 80, 0.3);
}`
    )
  );

  return files;
}

export default function AIDiffPanel({ onStatus }: AIDiffPanelProps) {
  const [changedFiles, setChangedFiles] = useState<ChangedFile[]>(() =>
    createSampleChanges()
  );
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(
    null
  );
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const selectedFile =
    changedFiles.find((f) => f.path === selectedFilePath) || null;

  // Filter to only files with remaining changes
  const activeFiles = changedFiles.filter((f) => hasRemainingChanges(f));

  // Show status via callback and local
  const showStatus = useCallback(
    (msg: string) => {
      setActionStatus(msg);
      onStatus?.(msg);
      setTimeout(() => setActionStatus(null), 3000);
    },
    [onStatus]
  );

  // Re-scan files from disk when component mounts
  useEffect(() => {
    async function scanDisk() {
      try {
        for (const file of changedFiles) {
          try {
            const currentContent = await readTextFile(file.path);
            const fresh = createChangedFile(
              file.path,
              file.originalContent,
              currentContent
            );
            // Preserve accept/reject state for hunks that still match
            setChangedFiles((prev) => {
              const existing = prev.find((f) => f.path === file.path);
              if (existing) {
                fresh.hunks = fresh.hunks.map((h, i) => {
                  const oldHunk = existing.hunks[i];
                  if (oldHunk) {
                    return { ...h, accepted: oldHunk.accepted, rejected: oldHunk.rejected };
                  }
                  return h;
                });
                fresh.accepted = existing.accepted;
                fresh.rejected = existing.rejected;
              }
              return prev.map((f) => (f.path === file.path ? fresh : f));
            });
          } catch {
            // File doesn't exist yet or can't be read, use sample content
          }
        }
      } catch {
        // Silent fallback
      }
    }
    scanDisk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Accept a single hunk */
  function acceptHunk(filePath: string, hunkId: string) {
    setChangedFiles((prev) =>
      prev.map((f) => {
        if (f.path !== filePath) return f;
        const updatedHunks = f.hunks.map((h) =>
          h.id === hunkId ? { ...h, accepted: true, rejected: false } : h
        );
        const fileUpdated = { ...f, hunks: updatedHunks };
        // Check if all hunks are done
        if (updatedHunks.every((h) => h.accepted || h.rejected)) {
          // Write the accepted content to disk
          writeAcceptedContent(fileUpdated);
        }
        return fileUpdated;
      })
    );
    showStatus("Accepted hunk " + hunkId);
  }

  /** Reject a single hunk */
  function rejectHunk(filePath: string, hunkId: string) {
    setChangedFiles((prev) =>
      prev.map((f) => {
        if (f.path !== filePath) return f;
        const updatedHunks = f.hunks.map((h) =>
          h.id === hunkId ? { ...h, rejected: true, accepted: false } : h
        );
        return { ...f, hunks: updatedHunks };
      })
    );
    showStatus("Rejected hunk " + hunkId);
  }

  /** Accept a whole file (accept all remaining hunks) */
  function acceptFile(filePath: string) {
    setChangedFiles((prev) =>
      prev.map((f) => {
        if (f.path !== filePath) return f;
        const updatedHunks = f.hunks.map((h) =>
          !h.rejected ? { ...h, accepted: true } : h
        );
        const fileUpdated = { ...f, hunks: updatedHunks, accepted: true };
        writeAcceptedContent(fileUpdated);
        return fileUpdated;
      })
    );
    showStatus("Accepted all changes in " + filePath);
  }

  /** Reject a whole file (reject all remaining hunks + revert on disk) */
  function rejectFile(filePath: string) {
    setChangedFiles((prev) =>
      prev.map((f) => {
        if (f.path !== filePath) return f;
        const updatedHunks = f.hunks.map((h) =>
          !h.accepted ? { ...h, rejected: true } : h
        );
        const fileUpdated = { ...f, hunks: updatedHunks, rejected: true };
        // Write original content back to disk
        revertFileContent(fileUpdated);
        return fileUpdated;
      })
    );
    showStatus("Rejected all changes in " + filePath);
  }

  /** Write accepted changes to disk */
  async function writeAcceptedContent(file: ChangedFile) {
    try {
      const newContent = applyAcceptedChanges(file);
      await writeTextFile(file.path, newContent);
    } catch {
      // File might not exist yet or other error
    }
  }

  /** Revert file to original content */
  async function revertFileContent(file: ChangedFile) {
    try {
      await writeTextFile(file.path, file.originalContent);
    } catch {
      // File might not exist yet or other error
    }
  }

  const fileCount = activeFiles.length;

  return (
    <div className="diff-panel">
      {/* Glassmorphism Header */}
      <div className="diff-glass-header">
        <div className="diff-header-left">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
            difference
          </span>
          <span className="diff-title">AI Diff Review</span>
        </div>
        <span className="diff-file-count">
          {fileCount > 0 ? fileCount + " file" + (fileCount !== 1 ? "s" : "") : ""}
        </span>
      </div>

      {/* Action Status */}
      {actionStatus && <div className="diff-action-status">{actionStatus}</div>}

      {/* Empty State */}
      {fileCount === 0 && !selectedFile && (
        <div className="diff-empty-state">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 28, opacity: 0.25 }}
          >
            difference
          </span>
          <div className="diff-empty-title">No AI changes detected</div>
          <div className="diff-empty-sub">
            Files modified by AI agents will appear here<br />
            with inline diff review controls.
          </div>
        </div>
      )}

      {fileCount > 0 && (
        <>
          {/* File List */}
          <div className="diff-file-list">
            {activeFiles.map((file) => {
              const acceptedCount = file.hunks.filter((h) => h.accepted).length;
              const rejectedCount = file.hunks.filter((h) => h.rejected).length;
              const total = file.hunks.length;
              const doneCount = acceptedCount + rejectedCount;
              const isSelected = file.path === selectedFilePath;

              return (
                <div
                  key={file.path}
                  className={
                    "diff-file-item" +
                    (isSelected ? " selected" : "") +
                    (acceptedCount > 0 ? " partial" : "")
                  }
                  onClick={() => setSelectedFilePath(file.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setSelectedFilePath(file.path);
                  }}
                  aria-label={"File: " + file.path}
                  title={file.path}
                >
                  <div className="diff-file-row">
                    <span className="diff-file-path">{file.path}</span>
                    <div className="diff-file-actions">
                      <button
                        className="diff-hunk-btn accept"
                        onClick={(e) => {
                          e.stopPropagation();
                          acceptFile(file.path);
                        }}
                        title="Accept all changes in this file"
                        aria-label={"Accept all changes in " + file.path}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          check
                        </span>
                      </button>
                      <button
                        className="diff-hunk-btn reject"
                        onClick={(e) => {
                          e.stopPropagation();
                          rejectFile(file.path);
                        }}
                        title="Reject all changes in this file"
                        aria-label={"Reject all changes in " + file.path}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                          close
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="diff-file-status">
                    <span>
                      {doneCount}/{total} hunks resolved
                    </span>
                    {acceptedCount > 0 && (
                      <span className="diff-accepted-count">
                        {acceptedCount} accepted
                      </span>
                    )}
                    {rejectedCount > 0 && (
                      <span className="diff-rejected-count">
                        {rejectedCount} rejected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected File Diff View */}
          {selectedFile && (
            <div className="diff-detail">
              <div className="diff-detail-header">
                <span className="diff-detail-path">{selectedFile.path}</span>
              </div>
              <div className="diff-hunk-list">
                {selectedFile.hunks
                  .filter((h) => !h.accepted && !h.rejected)
                  .map((hunk) => (
                    <div key={hunk.id} className="diff-hunk">
                      <div className="diff-hunk-header">
                        <span className="diff-hunk-header-text">
                          {hunk.header}
                        </span>
                        <div className="diff-hunk-actions">
                          <button
                            className="diff-hunk-btn accept"
                            onClick={() => acceptHunk(selectedFile.path, hunk.id)}
                            title="Accept this hunk"
                            aria-label={"Accept hunk " + hunk.header}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
                              check
                            </span>
                            Accept
                          </button>
                          <button
                            className="diff-hunk-btn reject"
                            onClick={() => rejectHunk(selectedFile.path, hunk.id)}
                            title="Reject this hunk"
                            aria-label={"Reject hunk " + hunk.header}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
                              close
                            </span>
                            Reject
                          </button>
                        </div>
                      </div>
                      <div className="diff-lines">
                        {hunk.lines.map((line, i) => {
                          const lineType = line.type;
                          const lineLabel =
                            lineType === "add"
                              ? "+"
                              : lineType === "remove"
                              ? "-"
                              : " ";
                          const lineNum =
                            lineType === "add" && line.newLineNumber != null
                              ? String(line.newLineNumber)
                              : lineType === "remove" &&
                                line.oldLineNumber != null
                              ? String(line.oldLineNumber)
                              : lineType === "context" && line.newLineNumber != null
                              ? String(line.newLineNumber)
                              : "";

                          return (
                            <div
                              key={i}
                              className={
                                "diff-line diff-line-" + lineType
                              }
                            >
                              <span className="diff-line-num">{lineNum}</span>
                              <span className="diff-line-marker">{lineLabel}</span>
                              <span className="diff-line-content">
                                {line.content}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
              {selectedFile.hunks.filter((h) => !h.accepted && !h.rejected)
                .length === 0 && (
                <div className="diff-all-done">
                  All hunks in this file have been reviewed.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
