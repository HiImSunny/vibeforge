/**
 * Diff utilities for the AI Diff Review Panel.
 * Computes line-by-line diffs between two strings, producing structured
 * hunk data with added/removed/context lines.
 */

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  id: string;
  header: string;
  lines: DiffLine[];
  accepted: boolean;
  rejected: boolean;
}

export interface ChangedFile {
  path: string;
  originalContent: string;
  newContent: string;
  hunks: DiffHunk[];
  accepted: boolean;
  rejected: boolean;
}

let hunkIdCounter = 0;

function nextHunkId(): string {
  hunkIdCounter += 1;
  return "h-" + hunkIdCounter;
}

/**
 * Compute a simple LCS-based diff between two arrays of strings.
 */
function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;
  const temp: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      temp.push({ type: "context", content: oldLines[i - 1], oldLineNumber: i, newLineNumber: j });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.push({ type: "add", content: newLines[j - 1], newLineNumber: j });
      j--;
    } else {
      temp.push({ type: "remove", content: oldLines[i - 1], oldLineNumber: i });
      i--;
    }
  }

  for (let k = temp.length - 1; k >= 0; k--) {
    result.push(temp[k]);
  }

  return result;
}

/**
 * Group diff lines into hunks with surrounding context.
 */
function groupIntoHunks(diffLines: DiffLine[]): DiffHunk[] {
  const CONTEXT_LINES = 3;
  const hunks: DiffHunk[] = [];
  let idx = 0;
  const len = diffLines.length;

  while (idx < len) {
    while (idx < len && diffLines[idx].type === "context") {
      idx++;
    }
    if (idx >= len) break;

    const hunkStart = Math.max(0, idx - CONTEXT_LINES);
    let hunkEnd = idx;
    let changeFound = false;

    while (hunkEnd < len) {
      if (diffLines[hunkEnd].type !== "context") {
        changeFound = true;
      }
      if (changeFound && diffLines[hunkEnd].type === "context") {
        let ctxCount = 0;
        let peek = hunkEnd;
        while (peek < len && diffLines[peek].type === "context") {
          ctxCount++;
          peek++;
        }
        if (ctxCount > CONTEXT_LINES) {
          hunkEnd += CONTEXT_LINES;
          break;
        }
      }
      hunkEnd++;
    }

    const hunkLines = diffLines.slice(hunkStart, hunkEnd);

    const firstLine = hunkLines.find(l => l.oldLineNumber != null);
    const lastLine = [...hunkLines].reverse().find(l => l.oldLineNumber != null);
    const firstNewLine = hunkLines.find(l => l.newLineNumber != null);
    const lastNewLine = [...hunkLines].reverse().find(l => l.newLineNumber != null);

    const oldStart = firstLine?.oldLineNumber ?? 1;
    const oldCount = lastLine ? lastLine.oldLineNumber! - oldStart + 1 : 1;
    const newStart = firstNewLine?.newLineNumber ?? 1;
    const newCount = lastNewLine ? lastNewLine.newLineNumber! - newStart + 1 : 1;
    const header = "@@ -" + oldStart + "," + oldCount + " +" + newStart + "," + newCount + " @@";

    hunks.push({
      id: nextHunkId(),
      header,
      lines: hunkLines,
      accepted: false,
      rejected: false,
    });

    idx = hunkEnd;
  }

  return hunks;
}

/**
 * Compute a full diff between two text strings.
 */
export function computeDiff(originalContent: string, newContent: string): DiffHunk[] {
  const oldLines = originalContent.split("\n");
  const newLines = newContent.split("\n");
  const diffLines = computeLineDiff(oldLines, newLines);
  return groupIntoHunks(diffLines);
}

/**
 * Create a ChangedFile from original and new content.
 */
export function createChangedFile(
  path: string,
  originalContent: string,
  newContent: string
): ChangedFile {
  const hunks = computeDiff(originalContent, newContent);
  return {
    path,
    originalContent,
    newContent,
    hunks,
    accepted: false,
    rejected: false,
  };
}

/**
 * Apply all un-rejected hunks from a ChangedFile to produce the accepted content.
 */
export function applyAcceptedChanges(file: ChangedFile): string {
  const oldLines = file.originalContent.split("\n");
  const resultLines: string[] = [];
  let oldIdx = 0;

  for (const hunk of file.hunks) {
    if (hunk.rejected) continue;

    const firstChange = hunk.lines.find(
      l => l.type === "context" || l.type === "remove"
    );

    if (firstChange && firstChange.oldLineNumber != null) {
      const targetOldIdx = firstChange.oldLineNumber - 1;
      while (oldIdx < targetOldIdx && oldIdx < oldLines.length) {
        resultLines.push(oldLines[oldIdx]);
        oldIdx++;
      }

      for (const line of hunk.lines) {
        if (line.type === "context") {
          if (oldIdx < oldLines.length) {
            resultLines.push(oldLines[oldIdx]);
            oldIdx++;
          }
        } else if (line.type === "remove") {
          oldIdx++;
        } else if (line.type === "add") {
          resultLines.push(line.content);
        }
      }
    } else {
      // Pure addition
      for (const line of hunk.lines) {
        if (line.type === "add") {
          resultLines.push(line.content);
        }
      }
    }
  }

  while (oldIdx < oldLines.length) {
    resultLines.push(oldLines[oldIdx]);
    oldIdx++;
  }

  return resultLines.join("\n");
}

/**
 * Check if a ChangedFile has any remaining unaccepted, unrejected hunks.
 */
export function hasRemainingChanges(file: ChangedFile): boolean {
  return file.hunks.some(h => !h.accepted && !h.rejected);
}

/**
 * Reset the hunk ID counter (for testing).
 */
export function resetHunkCounter(): void {
  hunkIdCounter = 0;
}