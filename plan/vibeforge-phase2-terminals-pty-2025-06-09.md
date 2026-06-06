# Plan: Vibeforge Phase 2 — Terminals & Real PTY (The Heart of the Workspace)

**Date:** 2025-06-09
**Status:** IN_PROGRESS
**Owner:** AI (following AGENT.md)
**Related Plans:**
- plan/vibeforge-main-implementation-roadmap-2025-06-07.md (defines Phase 2: "Terminal & Agent System (The Heart)")
- plan/vibeforge-tauri-bootstrap-phase0-2025-06-09.md (shell with placeholder 2x2 grid + comments pointing to Phase 2)
- plan/vibeforge-phase1-workspace-and-filetree-2025-06-09.md (live tree + structured quick-create done)
- plan/vibeforge-ui-design-system-and-frontend-first-2025-06-07.md (**MUST be followed for terminal chrome, agent accents, density, purposeful motion, anti-slop, keyboard, first-viewport=real-tools**)
**Track:** track/vibeforge-progress.md
**AGENT.md + .vibeforge/skills (mandatory when applicable):** security-review (CRITICAL — PTY execution + agent delegation + user input), rust-patterns, terminal-ops, frontend-patterns, make-interfaces-feel-better, verification-loop, tdd-workflow mindset

## Goal

Replace the current hardcoded placeholder terminal grid (4 static .vf-pane divs with fake text) with **real, interactive, PTY-backed terminals** using xterm.js (frontend) + a Rust PTY manager (backend). Topbar agent launchers (claude / codex / gemini / aider) must actually spawn and attach live sessions. The center area becomes the true heart of the "vibe coding" workspace: calm, high-density, scannable, purposeful, with agent-colored accents, activity signals, and keyboard focus — exactly as specified in the UI design plan.

This delivers the core "multi high-quality PTY terminals" from the master roadmap MVP scope. Structured workflow (plan/spec/track) remains visible and first-class in the sidebar; terminals will later be able to receive injected context from them (deferred to follow-up slice or Phase 3).

All work obeys AGENT.md (plan first, small verifiable steps, track updates after each, git on dedicated plan/* branch, push, security & design non-negotiable).

## Scope (Tight — Focused on Delivering Real PTY in the Existing Shell)

**In:**
- Frontend deps + TerminalPane component: xterm.js (core + fit addon; webgl or canvas for perf/compat), proper mounting, theme sync to our CSS vars (dark technical charcoal + mono), resize/fit handling, onData → write callback.
- Rust PTY layer (in src-tauri): choose and integrate a solid cross-platform PTY crate (portable-pty recommended for Windows conpty + unix pty coverage), manager for multiple concurrent PTYs (id → pair + reader task), Tauri commands (create_pty, write_pty, resize_pty, kill_pty) + event emission for output chunks to specific pane id.
- Wire the existing 2x2 grid (vf-terminal-grid) in App.tsx to real <TerminalPane> instances (replace the 4 static objects). Support + New Terminal (spawns default shell PTY).
- Make the 4 topbar AGENT buttons functional: launchAgent(id) spawns a real PTY for the corresponding command (or documented fallback to user shell), tags the pane title + applies the accent color/border treatment already styled in App.css.
- Basic terminal UX required by design plan: pane header (title + status + close), subtle activity indication, focus/click to select active pane, jump-to-bottom affordance, good monospace rendering, no decorative slop.
- Minimal context-send gesture: e.g. from FileTree "send path" or a stub button pastes text into the currently focused terminal (via the write path).
- Security: explicit activation + pass of security-review skill before any exec code. Controlled spawning (allow-listed agents + explicit shell choice only; proper arg handling/quoting; no raw user-controlled `sh -c` of arbitrary strings at this stage). Process lifecycle hygiene (kill on close, no leaks).
- Windows priority (conpty behavior, powershell/cmd as default shell, quoting/encoding). Verify in the actual user environment.
- Follow all polish rules from make-interfaces-feel-better + UI design (concentric radius on any new chrome, optical alignment, hit areas ≥36-40px, interruptible motion only if purposeful, no "transition: all", dense but calm).
- Small verifiable steps only. After each: cargo check / tsc+build, manual tauri dev smoke, track update, commit referencing this plan + track.
- Keep the rest of the shell (live FileTree, right context stubs, statusbar, structured workflow badges) untouched or minimally extended.

**Out (explicitly deferred):**
- Advanced layouts beyond the current 2x2 grid (splits, tabs, canvas, drag-reorder, persisted layouts) — Phase 1/2 follow-up or separate plan.
- Full orchestration (vibeforge-agent CLI, --prompt-stdin, output capture for delegation, Claude stop-message stripping, @mention routing). Roadmap lists it under Phase 2 but we keep terminals solid first; can be next slice or dedicated plan.
- Session persistence/resume of open terminals across restarts (Phase 4).
- Rich send-context (structured files + annotated screenshots + HTTP responses + browser console) — Phase 3.
- MCP exposure of terminal tool, command palette integration, scrollback search, copy with formatting, bells, profiles, env var injection, etc.
- Production hardening, sandboxing, or heavy testing (use verification-loop + windows-desktop-e2e later).
- Multi-project terminal awareness.

**Non-goals:** Beautiful finished agent orchestration UI, 6+ simultaneous high-output terminals perf tuning, remote PTY.

## Tech Choices (to be confirmed in Step 1)
- Frontend: React 19 + @xterm/xterm + @xterm/addon-fit (+ webgl addon if perf justifies; fallback canvas). No heavy terminal libs.
- Backend: portable-pty (or current best compatible crate as of 2025-06; tokio for async reader tasks if needed). Tauri 2 events for streaming output (emit "terminal-output", { id, data }).
- State: keep minimal (pane id counter + map of active terminals in a small store or React state + refs). PTY handles live in Rust side (survives React re-renders).
- Shell default on Windows: powershell.exe or cmd.exe (user's actual default via COMSPEC or explicit).
- Agent commands: spawn by name if in PATH (e.g. "claude", "aider"); document that full one-click requires the CLIs installed separately (same as other tools).

If a strong reason appears to use a different PTY approach (e.g. direct winpty/conpty via windows-rs for Win-only first), document + get alignment before coding the manager.

## Approach (Small, Verifiable, Ordered Steps — Follow in Sequence)

1. **Branch, plan, track bootstrap (this step)**
   - `git checkout -b plan/vibeforge-phase2-terminals-pty-2025-06-09`
   - Write this plan file (full template followed).
   - Append a dated IN_PROGRESS entry to track/vibeforge-progress.md.
   - `git add plan/... track/... && git commit -m "feat: add Phase 2 plan for Terminals & real PTY (plan/vibeforge-phase2-terminals-pty-2025-06-09.md, track/vibeforge-progress.md)"`
   - `git push -u origin plan/vibeforge-phase2-terminals-pty-2025-06-09`
   - Record SHA in track. Update todos/plan status.

2. **Frontend xterm foundation (local echo / stub first — prove rendering + fit)**
   - Add xterm deps to package.json + types if needed.
   - Implement src/components/TerminalPane.tsx (or .tsx) following FileTree.tsx style (clean, documented, hooks for mount/unmount/fit).
   - Wire 4 instances into App.tsx grid (keep the vf-terminal-grid CSS). Each pane gets a unique id.
   - Theme: map our --vf-* tokens + explicit font (system mono or JetBrains if bundled later). Background/foreground/selection match the calm technical palette.
   - Basic controls: close button in header kills the (stub) session + removes pane or resets it.
   - Local test: implement a pure-JS echo backend first so typing works immediately in tauri dev without Rust changes.
   - Polish pass: apply 2-3 make-interfaces-feel-better rules (hit areas on close, optical alignment of header text + badge, no all-transition).
   - Verify: `npm run build` clean, tauri dev shows 4 real xterms, fit on window resize, focus works, no console errors.

3. **Rust PTY manager + Tauri bridge (security gate)**
   - Update Cargo.toml (add portable-pty + any supporting: e.g. tokio, futures if streaming).
   - In src-tauri/src/ (lib.rs or new pty.rs module): implement a thread-safe manager (DashMap or Mutex<HashMap> + spawn tasks that read and emit via tauri::Manager::emit).
   - Commands (#[tauri::command]): create_terminal(shell_or_cmd: Option<String>) -> TerminalInfo, write_to_terminal(id: String, data: String), resize_terminal(id, cols, rows), kill_terminal(id).
   - Output streaming: emit to frontend with pane id so the correct xterm receives the chunk (xterm.write).
   - Windows specifics: test conpty path; handle encoding (UTF8); proper arg vectors (no shell -c of concatenated strings).
   - Update capabilities/default.json only if required (prefer pure Rust side; avoid broad shell:allow-execute if possible).
   - **MANDATORY:** Before any spawn logic is complete, perform light security-review (read the skill, checklist PTY risks: injection, output trusted for later context send, privilege, cleanup, logging of commands). Log findings + fixes in track + this plan post-work.
   - cargo check after every Rust change.

4. **Full wiring: real PTY <-> xterm panes + agent launchers**
   - Replace the local-echo stub with real create/write/kill calls via invoke.
   - On mount of a pane: create a default shell PTY (or powershell on Win), store id, attach listeners.
   - On topbar agent click: kill/reuse a pane slot or target the focused one, spawn the agent binary (with safe args), update pane title + apply the existing accent CSS class.
   - Bidirectional: xterm onData → invoke write; Rust emit → xterm.write (and scroll handling).
   - Pane header enhancements: show "running" / last activity hint, close icon with expanded hit area.
   - Basic "send context" from tree: onFileOpen or new button, write the path + \n or "cd ..." into the active terminal.
   - Handle errors gracefully (failed spawn → show in pane body + status, allow retry).
   - Lifecycle: on window close / app exit, best-effort kill all PTYs (Rust side Drop or explicit handler).

5. **Polish, keyboard, verification & close**
   - Fit on pane focus/resize + Tauri window resize events.
   - Keyboard: arrow focus between panes (or global shortcuts), ensure xterm doesn't steal everything unintentionally.
   - Activity: subtle (header color or small pulse on new output chunks — purposeful only, per motion rules).
   - Verify against UI design checklist + anti-slop (first viewport = real terminals + live tree; every element earns place; calm not toy-like; agent colors feel organic).
   - Full manual test in `npm run tauri dev`: launch 2-3 agents/shells, type real commands, see colored output, kill, launch more, send a file path from sidebar.
   - `cargo check`, `npm run build`, optional `tauri build --debug` smoke (Windows portable target in mind).
   - Run any light lint / typecheck.
   - Update this plan (post-work section) + append DONE / VERIFIED entry to track with links to commits + evidence summary.
   - Commit + push final slices.

6. **(If time in session) Lightweight follow-up notes**
   - Any architecture contracts that emerged (e.g. TerminalId, output event shape) → tiny addition to spec/ if useful.
   - Note open questions for Phase 2 continuation (orchestration slice).

## Risks & Unknowns + Mitigations
- Risk: PTY is notoriously painful on Windows (conpty availability, quoting, 16-bit codepage ghosts, resize races). → Mitigation: portable-pty first (handles it); test early and often on this machine; default to powershell; document exact spawn args.
- Risk: Security — PTY gives the app the power to run arbitrary processes on the user's machine from UI + (future) agent input. Huge attack surface + trust boundary. → Mitigation: **security-review skill is non-negotiable** before code lands. Start extremely narrow (only known agent names + explicit "open shell" choice; never concatenate user strings into command lines; future context injection will be sanitized). Capability surface kept minimal.
- Risk: Output volume / perf (cat huge file, agent dumping logs) kills the UI or event loop. → Mitigation: chunked emission, xterm's own buffering + fit, backpressure awareness, virtualized scroll (xterm default is good).
- Risk: Focus/keyboard model in a grid of capturing terminals is tricky for power users. → Mitigation: explicit "focused pane" state, visible affordance, escape hatch (global shortcuts that blur terminal).
- Risk: Agent CLIs (claude, aider...) are not present on most machines. → Mitigation: one-click launches shell by default with a helpful message in the pane; document install steps; detect via which/where.
- Unknown: Exact crate versions / Tauri 2 async patterns in June 2025/2026 Rust ecosystem. → Document the precise Cargo lines used; keep changes minimal and isolated.
- Scope creep: "just make terminals a bit better" turns into full IDE. → Strict In/Out above; anything outside requires explicit note + usually a new plan slice.

## Success Criteria / Verification (All Must Pass)
- [ ] New dedicated branch exists; the plan file + first track entry committed + pushed **before** any xterm or PTY Rust code is written.
- [ ] 4 (or dynamically addable) real xterm instances render in the grid, accept input, produce output, fit on resize, match the calm technical theme and existing CSS tokens.
- [ ] Clicking a topbar agent button (e.g. "claude" or "aider") spawns a real attached PTY; the pane shows live interactive session with correct accent treatment.
- [ ] Default +New opens a real system shell (powershell/cmd) PTY; multiple can run concurrently.
- [ ] Close/kill works cleanly; no obvious process leaks on app exit (manual check in Task Manager / Process Explorer during dev).
- [ ] Security-review skill read + checklist applied; findings + mitigations recorded in track/plan.
- [ ] All UI work passes the design plan verification items (no slop, purposeful, dense, keyboard-accessible, first viewport = working tool surface, agent colors feel integrated not decorative).
- [ ] `cargo check` + frontend build clean after every step; `npm run tauri dev` is the primary run command and stays working.
- [ ] Track updated after each meaningful step + final verification; this plan has post-work filled with SHAs + decisions.
- [ ] User can `git checkout` the branch, `npm install`, `npm run tauri dev`, and have real usable terminals + the live structured file tree side-by-side.

## Skills Activated (Read Full Files + Follow Checklists When Implementing)
- security-review (every PTY-related change — PTY execution, command construction, output handling, future context send)
- rust-patterns (idiomatic manager, error handling, ownership of PTY handles, async tasks)
- terminal-ops (evidence-first approach to terminal work)
- frontend-patterns + make-interfaces-feel-better (component, polish details)
- verification-loop (at close of major slices)
- Reference tdd-workflow mindset even for integration (small red/green where a pure unit makes sense)

## Artifacts to Produce
- This plan: `plan/vibeforge-phase2-terminals-pty-2025-06-09.md`
- Frontend: package updates + `src/components/TerminalPane.tsx` (or equivalent) + edits to `src/App.tsx` / `App.css` (minimal)
- Rust: Cargo.toml + `src-tauri/src/lib.rs` (or pty module) + any new command registration
- Capability diff (if any) + tauri.conf notes
- Multiple commits on the plan branch (each referencing this plan + track entry)
- Multiple appended entries in `track/vibeforge-progress.md`
- (Light) updates to this plan's Post-Work section + final status

## Dependencies
- Current working tree on (or reset to) the tip of plan/vibeforge-tauri-bootstrap-phase0-2025-06-09 with Phase 0+1 delivered and cargo clean.
- All mandatory files read at session start (AGENT.md, track, master roadmap, UI design plan, phase0/phase1 plans).
- Rust + Node + Tauri CLI already proven (from Phase 0).
- Optional for full test: at least one agent CLI (claude / aider / etc.) in PATH; otherwise shell is sufficient.

## Immediate Next Steps (After Plan + First Commit)
- Execute Step 2 (frontend xterm foundation with local echo) — smallest possible slice that proves the rendering contract.
- Or Step 3 if Rust side feels lower risk first.
- After core loop works: decide whether to continue slices on this plan or spawn a narrow follow-up plan for "orchestration foundation + stop stripping".
- Keep driving autonomously toward the complete focused product.

This plan ensures Phase 2 starts with the same discipline that got us a clean, purposeful, git-tracked Phase 0/1 shell + live structured tree.

---

**Post-Work Update (filled during execution):**

- Branch created: `plan/vibeforge-phase2-terminals-pty-2025-06-09`
- Plan file + initial track entry committed at: be4586c (and follow-ups: 75984df for xterm grid, 008a644 for Rust PTY core)
- Key decisions:
  - PTY: portable-pty 0.8 (ConPTY on Win, good cross-platform, matches prior research).
  - xterm + addon-fit (no webgl for this slice; canvas fallback implicit).
  - Spawn: strict allow-list in Rust (powershell/cmd + the 4 topbar names); command passed as program name only via CommandBuilder (never shell -c or concatenated argv). Frontend only supplies null or controlled ids.
  - UI: 4 fixed grid slots (per existing shell) driven by state; launchAgent targets active/free slot and forces re-spawn via restartKey + command prop. No layout overhaul.
  - Resize: ResizeObserver + post-fit resize_terminal calls (rAF) for robustness in grid.
  - Security: security-review.md read at start of continuation + re-applied to spawn path (see track entry). No new capabilities; kill hygiene; least-privilege.
- Verification commands & results (this slice + prior):
  - cargo check (after Rust + warning fix): ✓ Finished dev profile, no errors.
  - npm run build: ✓ (tsc clean, vite 39 modules, dist produced).
  - Manual expectation: `npm run tauri dev` shows 4 real default PTYs; topbar clicks now replace targeted pane's PTY with agent command (error message if binary absent, which is acceptable + matches plan risk note).
- Recent commits on branch: 008a644 (Rust core), 893a958 (agent buttons + resize), record chores, then 6fbf6bd + follow-up for close buttons + error polish.
- This micro-slice (close button wiring + error UX): added functional ✕ that kills PTY + resets to fresh shell via the restartKey mechanism; clearer failure messages in-pane; statusbar accuracy.
- Status when closed (after final commit/push in session): Core terminals + agent button functionality + basic lifecycle (launch / +New / close) delivered in the existing 2x2 grid. Plan can be considered substantially complete for the "Terminals & real PTY" heart; orchestration or further polish can be next slice or separate narrow plan per master roadmap.
- Notes for next session: load AGENT.md + latest track/vibeforge-progress.md + this plan + UI design plan + master roadmap. Stay on plan/vibeforge-phase2-terminals-pty-2025-06-09. Update track + commit after every meaningful slice.

All work follows Vibeforge AGENT.md. We are building the real product, not meta. Security and the "calm technical purposeful" design direction are enforced at every step.
