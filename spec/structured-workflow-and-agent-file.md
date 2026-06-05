# Spec: Structured Workflow and Single Agent File (plan/ + spec/ + track/ + AGENT.md)

**Version:** 0.1
**Date:** 2025-06-06
**Status:** Draft

## Problem
Working with multiple AI coding agents across projects quickly becomes chaotic:
- No consistent record of *why* decisions were made.
- Hard to resume work after days/weeks.
- Different agents (or the same agent in different sessions) repeat research or make conflicting changes.
- No easy way to answer "what happened from the beginning of this feature?"

Similar tools solve some of this with activity logs and session resume, but we want something **simpler, more explicit, more traceable, and enforced at the filesystem level** without requiring a heavy database or proprietary format.

## Solution Overview
Introduce a lightweight, convention-based, human + AI-readable structured workflow using only folders and markdown files:

- `plan/` — Detailed implementation plans created *before* work.
- `spec/` — Requirements, architecture, and "what good looks like".
- `track/` — Living, timestamped history of the entire project lifecycle.
- `AGENT.md` (or `.vibeforge/AGENT.md`) — The **one file agent**: the single set of instructions that any agent working in the project must follow.

This system must be:
- Easy for humans to use and understand.
- Easy for AI agents to discover and obey (via context injection + clear rules).
- Valuable even if the Vibeforge desktop app is not running (plain files on disk).
- Traceable from start to finish of any initiative.

## Requirements

### Functional
- Every non-trivial task must have a corresponding plan file in `plan/`.
- Specs live in `spec/`.
- All progress, decisions, and status changes are logged in `track/`.
- A single `AGENT.md` at the project root (or in `.vibeforge/`) defines the mandatory behavior.
- The workflow must support multiple agents collaborating (they all write to the same shared folders).

### Non-Functional
- Must work with zero app dependencies (just files + markdown).
- Must be git-friendly (text files, good diffs).
- Low ceremony for small tasks, higher ceremony for important work.
- Survives app restarts, machine changes, and team member handoffs.

### Vibeforge App Integration (Future)
- Special treatment in file explorer (icons, quick "New Plan", "New Spec", status badges).
- When launching an AI terminal (Claude, Codex, etc.), automatically include recent track + relevant plan/spec + the AGENT.md as context.
- `vibeforge-agent` CLI understands the structure and can create plan/spec/track entries automatically.
- UI views for "Open Plans", "Project Timeline" (rendered from track/), etc.
- Project scaffolding creates the folders + AGENT.md by default.

## Scope for Initial Implementation
**MVP (this plan):**
- Folder creation + conventions.
- High-quality `AGENT.md`.
- Initial populated `plan/`, `spec/`, `track/` demonstrating the system on Vibeforge itself.
- Basic templates inside the AGENT.md.

**Out of scope (separate work):**
- Deep UI components.
- Automatic context injection in terminals (requires the terminal/PTY layer).
- Project template / "New Project" wizard.
- Advanced querying / visualization of track data.

## Success Metrics
- A new contributor (or AI) can read `AGENT.md` and immediately know how to contribute in a traceable way.
- After 2-3 weeks of development, someone can reconstruct the full story of a feature by reading only `plan/`, `spec/`, and `track/`.
- The system is actually used in practice (not just documented).

## Open Questions
- Should we enforce this via hooks in the future Vibeforge app (e.g. warn before allowing a terminal to run if no plan exists for the current task)?
- How to handle very small fixes (one-line bugfixes)?
- Versioning of the AGENT.md itself when the workflow evolves?

## Related
- plan/establish-structured-agent-tracking-2025-06-06.md
- track/vibeforge-progress.md
- AGENT.md (the actual one-file agent)

---

This spec may be updated over time. Every update must be logged in track/.