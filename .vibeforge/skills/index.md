# Vibeforge Project Skills Index

This directory contains project-specific skills for AI agents operating inside Vibeforge (and for developing Vibeforge itself).

These skills are **in addition to** the core rules in `AGENT.md` (plan/spec/track workflow, git discipline, etc.).

**Rule (per AGENT.md):** When a task matches the description of a skill here, read the full skill file and follow its instructions/checklists strictly.

## Available Skills

### UI/UX & Polish
- `make-interfaces-feel-better.md` — Concrete design-engineering details for polished interfaces (spacing, radius, shadows, hit areas, motion, typography).
- `frontend-design-direction.md` — Overall design direction and anti-slop principles for the "Vibe Coding" workspace.
- `design-system.md` — Creating/auditing consistent design tokens and components.
- `frontend-patterns.md` — React/TS (or Svelte) patterns for the Tauri webview frontend.
- `motion-ui.md` + `motion-patterns.md` — Purposeful animations and transitions (performance + accessibility focused).
- `accessibility.md` — WCAG 2.2 implementation for desktop/webview UI (keyboard nav for terminals, ARIA, etc.).

### Core Development & Quality
- `tdd-workflow.md` — Test-driven development with 80%+ coverage.
- `verification-loop.md` — Comprehensive verification before considering work done.
- `rust-patterns.md` — Idiomatic Rust for the Tauri backend (PTY, MCP, file system, process management).
- `mcp-server-patterns.md` — Building and using MCP servers/tools for agent context (browser, HTTP, DB, terminal, files).
- `terminal-ops.md` — Evidence-first work with terminals and PTY.
- `agent-harness-construction.md` — Designing good action spaces and observations for the multi-agent system.
- `blueprint.md` — Turning objectives into detailed multi-step plans (use for complex features).

### Security (Added 2025-06-07)
- `security-review.md` — Comprehensive security checklist and patterns. **Must be followed** for any code handling user input, secrets, MCP tool exposure, PTY command execution, file system access, agent delegation, auth (if any), etc.

### Meta
- `create-skill.md` — How to create new project skills following this index and the overall workflow.

## How to Use (for Agents)
1. Read `AGENT.md` first (core rules always apply).
2. Check this index for matching skills.
3. Read the full relevant skill file(s).
4. Follow the checklists and patterns.
5. Reference the skill in your plan and track entries (e.g., "Followed security-review skill for MCP tool exposure").

## For the Vibeforge App Itself
When the Skills Manager UI is implemented (see main roadmap), these skills (and user-installed ones) should be:
- Browsable and searchable.
- Installable into user projects.
- Injectable as context when launching AI terminals.
- Editable with security scanning.

Source: Adapted from the host ECC environment skills (https://github.com/affaan-m/everything-claude-code and related).

Last updated: 2025-06-07 (initial set + security).