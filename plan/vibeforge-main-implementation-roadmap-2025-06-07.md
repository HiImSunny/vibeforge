# Plan: Vibeforge Main Implementation Roadmap (Core Product Development)

**Date:** 2025-06-07
**Status:** IN_PROGRESS
**Related Plans:**
- plan/establish-structured-agent-tracking-2025-06-06.md (foundational workflow)
- plan/vibeforge-ui-design-system-and-frontend-first-2025-06-07.md (UI design direction - MUST be followed for all frontend work)
- plan/add-git-enforcement-to-agent-instructions-2025-06-07.md (git process)
**Spec:** spec/structured-workflow-and-agent-file.md
**Track:** track/vibeforge-progress.md

## Goal
Deliver a focused, high-quality Vibeforge desktop application that captures the core vision of unified multi-agent coding workspaces (with rich context and orchestration) without the bloat.

Vibeforge must feel intentional and "vibe"-specific (not AI slop), follow strict design principles from the UI design plan, use the enforced plan/spec/track + AGENT.md workflow, and be fully cross-platform (macOS Apple Silicon M1-M4 + Intel, Windows installer + portable, Linux deb/AppImage).

All development **must** follow the existing AGENT.md rules (including git discipline with remote https://github.com/HiImSunny/vibeforge and internal-tooling email duykhang.sunext@gmail.com).

## Scope (Chosen Subset from Initial Research on Similar Tools - Focused MVP)

**Core Must-Have for v1 (delivers 70-80% of the magic):**
- Multi-project workspace with smart file explorer.
- Multiple high-quality PTY terminals supporting the main AI agents (claude, codex, gemini, amp, opencode, qwen, aider + custom shells) with flexible layouts (grid, splits, tabs, hover previews).
- Agent orchestration: vibeforge-agent CLI + @mention delegation (headless execution, output capture, context passing). Support for Claude Code stop message stripping (remove "Claude Code has stopped" / similar termination notices from agent outputs for clean delegation).
- Session persistence + resume (SQLite-backed) + basic continuity.
- Send context to agents (files/folders from explorer, terminal output, basic browser screenshot + console if browser is implemented).
- Embedded browser (webview preview for localhost, send context: URL + console logs + optional screenshot annotation).
- Lightweight HTTP client (request builder, tabs/collections, env support, response inspector) - high value for API work with agents.
- AI Diff Review Panel (track AI file changes, accept/revert per file/hunk with inline diffs).
- Basic productivity: desktop notifications on agent complete, command palette, simple prompt history.
- Strong structured workflow support: native awareness of plan/, spec/, track/, AGENT.md (special file tree treatment, quick create, auto-inject context when launching agents).
- Git integration (visual status, worktrees basic, multi-account if time).
- Cross-platform packaging: proper native builds + Windows portable .exe.
- CLI companion: standalone `vibeforge-agent` (list agents, run --to=xxx --prompt-stdin, respects plan/spec/track).

**Explicitly Out of v1 (or low priority):**
- Full remote/mobile control + QR (deferred).
- 13-26 DB engines (start with direct SQLite + optional Postgres).
- Docker manager, design canvas, skills store, Excalidraw, full toolbox utils.
- Advanced channels/pipelines with conditionals.
- iOS simulator, built-in deploys, heavy SSH remote projects.
- Reader mode with sticky notes, full terminal recording/export (can add if easy).
- Overly complex customization.

**Non-Functional:**
- No AI slop in UI: follow the detailed design direction and polish principles from the UI design plan exactly.
- Performance: smooth with 4-6+ live terminals + webviews + agent streams.
- Keyboard-first + mouse power users.
- Clean, maintainable codebase using TDD where appropriate (reference tdd-workflow skill when implementing features).

## Tech Stack (Confirmed)
- **Desktop:** Tauri v2 (Rust backend for PTY, process management, file ops, MCP, SQLite; webview frontend).
- **Frontend:** React or Svelte + TypeScript + Tailwind (or custom CSS vars from the design system). Follow the UI design plan 100%.
- **Terminal:** xterm.js (or equivalent) in webview, or native PTY bridge.
- **Orchestration:** Rust CLI (vibeforge-agent) that can be called standalone or by the app. Support headless for the 7 agents + custom. Strip Claude stop notifications.
- **MCP:** Implement mcp-server-patterns for exposing context tools (files, terminal send, browser, http) to agents running inside Vibeforge.
- **Persistence:** SQLite for sessions/resume/track (inspired by similar tools but simpler).
- **Packaging:** Tauri bundler for dmg/zip (mac universal or separate arm/x64), exe (setup + portable on Windows), deb/AppImage (Linux).
- **Git:** Enforced via AGENT.md (already implemented in process).
- **Skills/Process:** Use relevant ECC skills (blueprint, tdd-workflow, verification-loop, rust-patterns, mcp-server-patterns, frontend-patterns, make-interfaces-feel-better, etc.) when appropriate. Always create sub-plans for major features.

## High-Level Phases & Milestones (Create Sub-Plans for Each)

**Phase 0: Foundations (Mostly Complete)**
- Structured workflow (plan/spec/track + AGENT.md with git + email).
- UI Design System & Direction (detailed in vibeforge-ui-design-system-and-frontend-first-2025-06-07.md - treat as source of truth for all UI work).
- Git process enforcement.
- Project scaffolding + basic Tauri init.

**Phase 1: Core Workspace & Project Management (High Priority)**
- Multi-project support, file explorer (gitignore aware, git status, quick actions, open in external editor).
- Basic layout system (sidebars, collapsible panels, drag reorder).
- Mission Control / welcome view.
- Sub-plan required before starting: "plan/vibeforge-phase1-workspace-2025-06-XX.md"

**Phase 2: Terminal & Agent System (The Heart)**
- PTY integration (multi terminals, layouts: grid/split/tabs/canvas, status badges, activity indicators, hover preview, jump-to-bottom).
- Agent detection & launchers (auto-detect like registries in similar tools, one-click launch for claude/codex/etc.).
- Basic orchestration foundation (vibeforge-agent CLI with list/run --to= --prompt-stdin, output capture, stop message stripping for claude).
- Sub-plan required: "plan/vibeforge-phase2-terminals-orchestration-2025-06-XX.md"

**Phase 3: Context Tools & Send-to-Agent**
- Embedded browser (preview, console capture, send context including optional screenshot).
- Lightweight HTTP client (builder, collections, envs, send response to agent).
- Basic send-context system (files, terminal output, browser data).
- Sub-plan required.

**Phase 4: Productivity & AI Features**
- AI Diff Review Panel (track changes from agents, accept/revert).
- Notifications, command palette, basic prompt history.
- Session resume/persistence.
- Integration with plan/spec/track (UI shows open plans, injects AGENT.md + recent track when launching agents).
- Sub-plan required.

**Phase 5: Polish, Cross-Platform & Release**
- Full UI polish per the design plan (no slop - use make-interfaces-feel-better, motion patterns, accessibility).
- Packaging & distribution for all requested platforms (test portable on Windows).
- Basic testing (use windows-desktop-e2e where relevant, tdd for new features).
- Documentation (README following the workflow).
- Sub-plan required.

**Ongoing:**
- For every new feature or major change: create a dedicated sub-plan in plan/ that references this roadmap + the UI design plan + AGENT.md.
- Use verification-loop / tdd-workflow skills during implementation.
- Update track/ after every significant step.
- Prefer small, verifiable PRs.

## Risks & Mitigations
- Risk: Scope creep back to bloat of full-featured similar tools. → Mitigation: Strict adherence to the chosen MVP subset. Defer anything not in scope.
- Risk: UI feels generic/slop despite design plan. → Mitigation: Every UI component must be reviewed against the design plan checklist before merge. Activate make-interfaces-feel-better and frontend-design-direction skills for reviews.
- Risk: Terminal/PTY cross-platform pain (especially Windows). → Mitigation: Prototype early in Phase 2. Use proven crates + xterm.js.
- Risk: Agent orchestration quality (stop messages, context loss). → Mitigation: Specific handling for Claude stop notifications. Test with real agents.
- Risk: Context window for new sessions. → Mitigation: New sessions should start with: AGENT.md + latest track/vibeforge-progress.md + this roadmap + the UI design plan. Sub-plans as needed.

## Success Criteria for v1
- User can open multiple projects, launch 3-4 different AI agents in a nice grid, send context from browser/HTTP/files, review diffs, and have everything persist across restarts.
- The UI feels purposeful, dense, calm, and "made for vibe coders" (per design plan).
- Git history is clean and follows the process.
- Cross-platform builds work (especially Windows portable).
- The structured workflow is self-reinforcing (the app helps you follow plan/spec/track).

## Artifacts to Produce
- This master roadmap plan.
- Sub-plans for each phase/feature (to be created before implementation starts).
- Actual code in the vibeforge repo following Tauri structure.
- Updated track entries.
- Final packaged builds.

## Immediate Next Steps (After This Plan)
1. Create lightweight spec for overall architecture if not covered (e.g., how the Tauri app interacts with vibeforge-agent CLI and plan/spec/track folders).
2. Start Phase 0/1 sub-plans (Tauri init + basic workspace).
3. For any new session: Provide this plan + AGENT.md + track/vibeforge-progress.md + vibeforge-ui-design-system-and-frontend-first-2025-06-07.md as primary context.
4. Activate relevant skills (e.g., rust-patterns when doing backend, frontend-patterns + make-interfaces-feel-better for UI).

This plan ensures we have a clear, traceable path forward while respecting the design-first, anti-slop, and structured workflow principles already established.

---

**Post-Work Update (2025-06-07):**
- Master roadmap created as the central "plan chính".
- This plan + the UI design plan + AGENT.md + track/vibeforge-progress.md now provide enough context for a fresh session to continue development without losing the vision, process, or anti-slop focus.
- Next work in any session must create sub-plans for actual implementation phases.
- User decision logged: Do not publicly document internal-tooling email. Defer README creation until post-MVP, keep it minimal with only essentials when the time comes. (See track entry for details)