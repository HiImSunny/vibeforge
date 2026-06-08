import { useState, useEffect, useRef, useCallback } from "react";

export type Command = {
  id: string;
  label: string;
  icon: string;
  action: () => void;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
};

export default function CommandPalette({ isOpen, onClose, commands }: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const execute = useCallback(
    (cmd: Command) => {
      cmd.action();
      setQuery("");
      onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setQuery("");
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIdx((prev) => (prev + 1) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIdx((prev) => (prev - 1 + filtered.length) % Math.max(filtered.length, 1));
        return;
      }
      if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        const cmd = filtered[selectedIdx];
        if (cmd) execute(cmd);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, filtered, selectedIdx, execute, onClose]);

  useEffect(() => {
    if (!listRef.current || filtered.length === 0) return;
    const items = listRef.current.querySelectorAll<HTMLElement>(".cp-item");
    if (items[selectedIdx]) {
      items[selectedIdx].scrollIntoView({ block: "nearest" });
    }
  }, [selectedIdx, filtered.length]);

  if (!isOpen) return null;

  return (
    <div className="cp-overlay" onClick={onClose}>
      <div className="cp-palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="cp-input-wrap">
          <span className="material-symbols-outlined cp-search-icon">search</span>
          <input
            ref={inputRef}
            className="cp-input"
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            placeholder="Search commands..."
            aria-label="Search commands"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="cp-kbd-hint">ESC</kbd>
        </div>
        <div className="cp-list" ref={listRef} role="listbox" aria-label="Available commands">
          {filtered.length === 0 ? (
            <div className="cp-empty">
              <span className="material-symbols-outlined">search_off</span>
              No commands found
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                className={`cp-item${i === selectedIdx ? " selected" : ""}`}
                onClick={() => execute(cmd)}
                onMouseEnter={() => setSelectedIdx(i)}
                role="option"
                aria-selected={i === selectedIdx}
              >
                <span className="material-symbols-outlined cp-item-icon">{cmd.icon}</span>
                <span className="cp-item-label">{cmd.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
