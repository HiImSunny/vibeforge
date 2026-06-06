# Plan: Vibeforge Phase 1 — Core Workspace, Real File Tree & Layout System

**Date:** 2025-06-09
**Status:** IN_PROGRESS
**Owner:** AI (driving autonomously per user request for complete product)
**Related Plans:**
- plan/vibeforge-tauri-bootstrap-phase0-2025-06-09.md (just completed shell + Tauri foundation)
- plan/vibeforge-main-implementation-roadmap-2025-06-07.md (Phase 1 item)
- plan/vibeforge-ui-design-system-and-frontend-first-2025-06-07.md (must follow)
**Track:** track/vibeforge-progress.md
**AGENT.md + skills:** rust-patterns, frontend-patterns, make-interfaces-feel-better, security-review, tdd-workflow mindset, verification-loop

## Goal
Turn the Phase 0 purposeful shell into a **real, usable core workspace**:
- A live, performant file tree that reads the actual project on disk (starting with the current Vibeforge root).
- Special first-class treatment and quick actions for `plan/`, `spec/`, `track/`, `AGENT.md` (the heart of what makes Vibeforge different).
- Improved layout system (better pane management, basic persistence of sizes/visibility).
- Foundation for multi-project later.
- Everything still calm, dense, technical, and anti-slop.

This directly implements the "Phase 1: Core Workspace & Project Management" from the master roadmap.

## Scope (Tight — Small Verifiable Steps)

**In:**
- Add Tauri FS plugin (or Rust commands) for safe directory listing + basic file metadata.
- Build a real `<FileTree>` React component (recursive, gitignore-aware at minimum, keyboard navigable, icons via simple text or emoji for bootstrap).
- Visually distinguish and prioritize the structured workflow folders (badges "plan", "enforced", quick "New Plan/Spec/Track entry" stubs that create files via Tauri fs).
- Wire the tree into the existing left sidebar (replace the hardcoded stub).
- Basic "current project" model (the folder the app was opened with or user-selected).
- Simple layout improvements: make right panel collapsible, remember last open panes via Tauri store or localStorage for now.
- Performance: virtualize or at least don't explode on medium projects; lazy load children.
- Security: capability limited to read (no write except for the explicit "new plan" action). Light security-review pass.
- Update track + commit after each meaningful slice.
- Keep using the design tokens + polish rules.

**Out (defer):**
- Full multi-project switcher + recent projects list (Phase 1 stretch or Phase 2).
- Git status badges in tree (basic ignore + folder structure first; real git later).
- Drag & drop, multi-select, context menus with real actions.
- File search / fuzzy (command palette later).
- Writing/editing files from the tree (except the structured quick-create stubs).
- Real resizable split panes with drag handles (CSS + simple state is enough for Phase 1).
- PTY, browser, HTTP, Diff integration beyond what the shell already stubs.

## Approach (Numbered, Verifiable)

1. **Plugin + capability setup** (security first)
   - Add `tauri-plugin-fs` (or use the built-in in Tauri 2) with read-only capability for the opened project dir.
   - Update `src-tauri/capabilities/default.json` and tauri.conf security as needed.
   - Run light security-review (no arbitrary path access, no write except controlled new-plan action).

2. **Rust/TS bridge for listing**
   - Simple command `list_dir(path: string)` that returns safe entries (name, is_dir, size optional).
   - Or use the JS `@tauri-apps/plugin-fs` readDir (preferred for speed in bootstrap).

3. **Real FileTree component**
   - Recursive tree, click to expand/collapse.
   - Click file → "open in main" stub (for now just highlight + status update).
   - Special rendering + top section for the four structured items (always visible, even if not under the current scanned dir).
   - "New Plan / New Spec / New Track entry" buttons that create a timestamped .md via fs and refresh the tree.

4. **Integrate + polish**
   - Replace the hardcoded sidebar list with the live tree.
   - Keep the "structured workflow" header and visual treatment.
   - Apply more make-interfaces-feel-better details (optical alignment on icons, consistent row height, good focus rings for keyboard).
   - Basic loading / empty states that are useful.

5. **Layout & persistence mini**
   - Make the right panel hideable with a toggle (persisted in a simple Tauri store or localStorage).
   - Optional: store last expanded folders in the tree for the current session.

6. **Verification**
   - The tree shows real files from the vibeforge root (including the plan/ we are editing right now).
   - Structured folders are prominent and have the quick-create actions that actually write files.
   - No crashes, reasonable perf on this project (small).
   - Commit + track update.
   - `npm run tauri dev` (or build) still works.

7. **Close + next**
   - Mark this plan DONE.
   - Immediately create Phase 2 plan (Terminals & PTY) or continue with more workspace polish if needed.
   - Record SHA.

## Risks & Mitigations
- Risk: FS plugin + arbitrary paths = security issue. → Mitigation: Capability scoped to the "current project root" only. Never allow `..` escape in the listing command. security-review skill activated.
- Risk: Tree perf on huge monorepos. → Mitigation: Start with this small project + basic recursion; add virtualization or depth limit later.
- Risk: Scope creep into full IDE file ops. → Strict In/Out above.

## Success Criteria
- [ ] Live tree replaces the stub and shows real content of the current folder.
- [ ] plan/, spec/, track/, AGENT.md are visually special and always easy to reach.
- [ ] "New Plan" etc. buttons create real files under the correct folders and the tree refreshes.
- [ ] Layout toggle (right panel) persists at least for the session.
- [ ] Follows design direction + polish rules (no slop introduced).
- [ ] Commits on plan branch + track updated.
- [ ] `tauri dev` remains the way to run the app.

## Skills Activated
- security-review (for FS capability)
- rust-patterns or frontend-patterns (depending on impl choice — prefer the JS fs plugin for speed in Phase 1)
- make-interfaces-feel-better (row polish, states)
- verification-loop at close

## Artifacts
- This plan
- Updated src/ components (FileTree.tsx or equivalent + integration)
- Capability + tauri.conf changes (minimal)
- Track entries
- Commits on `plan/vibeforge-phase1-workspace-and-filetree-2025-06-09`

---

**Post-Work Update (to be filled as we go):**
- Decisions on JS fs plugin vs Rust command.
- Key commits.
- Verification that the tree sees the real plan/ folder we are working in.
- Status.

All work follows AGENT.md. We are building the complete product incrementally with full traceability.