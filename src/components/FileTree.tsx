import { useEffect, useState } from "react";
import { readDir, DirEntry, writeTextFile } from "@tauri-apps/plugin-fs";

/**
 * Simple recursive file tree for Phase 1.
 * - Shows real disk content (starting from a root the app can read).
 * - Special visual treatment + quick actions for plan/, spec/, track/, AGENT.md.
 * - "New Plan/Spec/Track" buttons that actually create timestamped files (writeTextFile).
 * - Follows the design direction: dense, calm, scannable, no slop.
 * - Basic ignore list for node_modules / target / .git / dist to stay usable.
 */

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: TreeNode[];
}

const IGNORE = new Set(["node_modules", "target", "dist", ".git", ".cargo", "build"]);

function shouldIgnore(name: string) {
  return IGNORE.has(name) || name.startsWith(".") && name !== "AGENT.md";
}

async function loadChildren(path: string): Promise<TreeNode[]> {
  try {
    const entries: DirEntry[] = await readDir(path);
    const nodes: TreeNode[] = [];

    for (const e of entries) {
      if (shouldIgnore(e.name)) continue;
      const full = path === "." || path === "" ? e.name : `${path}/${e.name}`;
      const node: TreeNode = {
        name: e.name,
        path: full,
        isDir: e.isDirectory ?? false,
      };
      if (node.isDir) {
        // lazy: children loaded on expand
      }
      nodes.push(node);
    }

    // Sort: directories first, then files. Structured folders bubble up.
    nodes.sort((a, b) => {
      const aStructured = ["plan", "spec", "track", "AGENT.md"].some((s) => a.name.includes(s));
      const bStructured = ["plan", "spec", "track", "AGENT.md"].some((s) => b.name.includes(s));
      if (aStructured && !bStructured) return -1;
      if (!aStructured && bStructured) return 1;
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return nodes;
  } catch (err) {
    console.warn("readDir failed for", path, err);
    return [];
  }
}

async function createStructuredEntry(folder: "plan" | "spec" | "track", title: string) {
  const ts = new Date().toISOString().slice(0, 10);
  const safe = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-");
  const filename = `${folder}/${ts}-${safe || "new-entry"}.md`;
  const content = `# ${title}\n\n**Date:** ${ts}\n**Status:** TODO\n\n(Generated from Vibeforge Phase 1 quick-create)\n\n## Goal\n\n## Scope\n\n## Approach\n\n`;
  await writeTextFile(filename, content);
  return filename;
}

export default function FileTree({ onFileOpen, onRefresh }: { onFileOpen?: (path: string) => void; onRefresh?: () => void }) {
  const [root] = useState("."); // start at project root (the vibeforge app itself)
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["plan", "spec", "track"]));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const children = await loadChildren(root);
    setNodes(children);
    setLoading(false);
    setMessage(null);
    onRefresh?.();
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(node: TreeNode) {
    const next = new Set(expanded);
    if (next.has(node.path)) {
      next.delete(node.path);
    } else {
      next.add(node.path);
      if (!node.children) {
        const kids = await loadChildren(node.path);
        // mutate local for simplicity in bootstrap
        (node as any).children = kids;
        setNodes([...nodes]); // trigger re-render
      }
    }
    setExpanded(next);
  }

  async function handleQuickCreate(folder: "plan" | "spec" | "track") {
    try {
      const created = await createStructuredEntry(folder, `new-${folder}-entry`);
      setMessage(`Created ${created}`);
      await refresh();
      // auto expand the folder
      const next = new Set(expanded);
      next.add(folder);
      setExpanded(next);
    } catch (e: any) {
      setMessage(`Failed to create: ${e?.message || e}`);
    }
  }

  function renderNode(node: TreeNode, depth: number) {
    const isExpanded = expanded.has(node.path);
    const isStructured = ["plan", "spec", "track", "AGENT.md"].some((s) => node.name.includes(s));
    const indent = 8 + depth * 14;

    return (
      <div key={node.path}>
        <div
          className={`vf-folder ${isStructured ? "structured" : ""}`}
          style={{ paddingLeft: indent }}
          onClick={() => {
            if (node.isDir) {
              toggle(node);
            } else {
              onFileOpen?.(node.path);
            }
          }}
          title={node.path}
        >
          <span style={{ width: 14, display: "inline-block", textAlign: "center" }}>
            {node.isDir ? (isExpanded ? "▼" : "▶") : "·"}
          </span>
          <span>{node.name}</span>
          {isStructured && <span className="vf-badge" style={{ marginLeft: 6, fontSize: 9 }}>structured</span>}
        </div>

        {node.isDir && isExpanded && (node as any).children && (
          <div>
            {(node as any).children.map((c: TreeNode) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: "4px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button className="vf-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => handleQuickCreate("plan")}>
          + New Plan
        </button>
        <button className="vf-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => handleQuickCreate("spec")}>
          + New Spec
        </button>
        <button className="vf-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => handleQuickCreate("track")}>
          + New Track
        </button>
        <button className="vf-btn" style={{ fontSize: 10, padding: "3px 8px", marginLeft: "auto" }} onClick={refresh}>
          ↻
        </button>
      </div>

      {message && (
        <div style={{ padding: "2px 10px", fontSize: 10, color: "#7be38f" }}>{message}</div>
      )}

      {loading && <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--vf-muted)" }}>Loading tree…</div>}

      <div style={{ paddingTop: 4 }}>
        {nodes.length === 0 && !loading && (
          <div style={{ padding: "4px 10px", fontSize: 11, color: "var(--vf-muted)" }}>
            (No entries or permission — try ↻ or run from project root)
          </div>
        )}
        {nodes.map((n) => renderNode(n, 0))}
      </div>

      <div style={{ padding: "8px 10px", fontSize: 9, color: "var(--vf-muted)", opacity: 0.7 }}>
        Real disk • structured folders prioritized • quick-create writes actual .md files
      </div>
    </div>
  );
}
