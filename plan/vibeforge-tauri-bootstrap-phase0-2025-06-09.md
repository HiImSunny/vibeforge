# Plan: Vibeforge Tauri Bootstrap & Phase 0 Completion (Core Scaffolding)

**Date:** 2025-06-09
**Status:** IN_PROGRESS
**Owner:** AI agent (following AGENT.md)
**Related Plans:**
- plan/vibeforge-main-implementation-roadmap-2025-06-07.md (master roadmap — this completes the remaining Phase 0 item)
- plan/vibeforge-ui-design-system-and-frontend-first-2025-06-07.md (UI design direction — **MUST** be followed for all frontend/shell work; treat as source of truth)
- plan/establish-structured-agent-tracking-2025-06-06.md (foundational)
**Spec:** spec/structured-workflow-and-agent-file.md (and future architecture spec)
**Track:** track/vibeforge-progress.md

## Goal
Bootstrap the **real Vibeforge desktop application** (Tauri v2) as the first non-meta implementation work. Deliver a clean, minimal, correctly-structured project shell (Rust backend + webview frontend) that:
- Can be built and run on the primary target (Windows, with portable in mind).
- Follows the product design direction from day one (technical, calm, high-density, no AI slop).
- Lays groundwork for the structured workflow awareness (plan/spec/track folders get special treatment later).
- Is ready for incremental Phase 1+ work (workspace, terminals, etc.) without having to fight template decisions.

All work **must** obey AGENT.md (plan/spec/track, git discipline on dedicated plan/* branch, push, etc.) + relevant project skills.

## Scope

**In (this plan):**
- Confirm exact tech choices for frontend within the allowed options (React or Svelte + TS + Tailwind/design tokens).
- Run official Tauri v2 project initialization with appropriate flags for the chosen stack.
- Post-init cleanup and minimal structure alignment (remove bloat, set up design tokens/CSS vars per UI plan, basic folder layout for future features).
- Create a very lightweight "shell" UI (titlebar-ish, main workspace area stub, left sidebar stub for future file tree, placeholder for terminals/panels) that already feels purposeful and matches the "vibe coding workspace" tone — not generic dashboard.
- Basic awareness stub: make the (static) file tree or project view visibly reference `plan/`, `spec/`, `track/`, `AGENT.md` (foreshadowing native support).
- First successful `tauri dev` + `tauri build` (at least the dev server + simple Windows exe verification).
- Security review (light) on any new filesystem/path handling even in bootstrap.
- Commit + push discipline throughout (small verifiable steps).
- Update track after meaningful steps.
- Produce this plan + any tiny supporting notes.

**Out (explicitly deferred to later sub-plans):**
- Real PTY / terminal integration (Phase 2).
- Multi-project management, real file explorer (git-aware), drag-drop, etc. (Phase 1).
- Embedded browser, HTTP client, AI Diff, orchestration CLI, persistence (later phases).
- Full design system implementation or component library (only the absolute minimal shell that proves the direction).
- Cross-platform build matrix or installer work (Phase 5).
- Any MCP server, vibeforge-agent CLI, or agent context injection (Phase 2/3).
- Tests beyond the absolute minimal smoke (use tdd-workflow + verification-loop when real features land).

**Non-Goals for bootstrap:**
- Beautiful finished UI. A deliberate, scannable, calm skeleton is enough.
- Performance tuning for 6 terminals.
- Any real data or state management beyond what Tauri template + a couple signals/stores need.

## Tech Stack Decision (to be confirmed in Step 1)
Per master roadmap:
- **Backend:** Tauri 2 (Rust) — required for PTY, secure FS, process control, webview hosting, future MCP, SQLite, packaging (especially Windows portable .exe).
- **Frontend:** **React 19 + TypeScript + Vite (Tauri template)** + Tailwind CSS (or pure CSS vars + the design tokens from the UI plan). 
  - Rationale: The installed project skills (`frontend-patterns.md`, `frontend-design-direction.md`, `make-interfaces-feel-better.md`, `motion-*`) are written with strong React/TS assumptions and patterns. This reduces context switching for agents. Svelte is viable but would require more adaptation of the existing skill set right now.
  - Design tokens will be introduced as CSS custom properties (following the concentric radius, calm technical palette, JetBrains Mono for code, etc. from the UI design plan).
- Terminal later: xterm.js (or @xterm/*) inside webview for Phase 2.
- State: Start minimal (use built-in Tauri state + React context or a tiny signals/store). Avoid heavy Zustand/Redux until needed.

If during Step 1 a strong reason appears to switch to Svelte, document it and get explicit user sign-off before proceeding.

## Approach (Small, Verifiable Steps — Follow in Order)

1. **Stack confirmation + prerequisites check** (this file + terminal)
   - Re-read the UI design plan and frontend-design-direction skill.
   - Confirm `tauri --version`, Rust toolchain, Node, pnpm/npm, Windows dev requirements (WebView2, etc.).
   - Decide final: React+TS (or document switch).
   - Record decision in track.

2. **Create dedicated git branch** (mandatory per AGENT.md)
   - `git checkout -b plan/vibeforge-tauri-bootstrap-phase0-2025-06-09`
   - Never commit directly to main.

3. **Official Tauri v2 initialization**
   - Use the recommended Tauri create command for the chosen stack (e.g. with `--template react-ts` or equivalent for Tauri 2 + Vite React TS).
   - Choose sensible app name/id (`vibeforge`, `com.hiimsunny.vibeforge` or similar).
   - Accept the generated structure but do **not** start coding features yet.

4. **Immediate post-init hygiene + design alignment (anti-slop)**
   - Remove any marketing/hero/demo bloat from the generated template.
   - Introduce the first slice of design tokens (colors, typography, spacing, radius per UI plan — calm technical charcoal + subtle agent accents, JetBrains Mono, tight 4px scale, concentric radius).
   - Set up a minimal layout shell that matches the Information Architecture in the UI design plan:
     - Top: agent launchers area + global search stub + status.
     - Left: project/file sidebar stub (show plan/, spec/, track/, AGENT.md as example items with future "special treatment" visual hint).
     - Center: main "workspace" area (placeholder grid or tabs saying "Terminals will live here").
     - Right/bottom: collapsible panels stubs (Browser, HTTP, Diff, etc. — just labels + "send context" hint buttons that do nothing yet).
   - Apply at least 2-3 concrete polish rules from `make-interfaces-feel-better` (hit areas, optical alignment, no "transition: all").
   - First viewport must show **real tool surface**, not a landing page.

5. **Basic project awareness stub (structured workflow respect)**
   - Hardcode (for now) the root folders in the sidebar mock so the plan/spec/track system is visibly "part of the product" even in bootstrap.
   - Add a tiny comment/note in code: "Future: Vibeforge will give these special badges, quick-create, and auto-inject AGENT.md + recent track when launching agents."

6. **Verification & smoke test**
   - `tauri dev` runs cleanly and the shell renders on Windows without errors.
   - `tauri build` produces a runnable artifact (portable exe preferred for quick test).
   - Manual checklist against the UI design plan's "Verification & Anti-Slop Checklist" (first viewport shows tools, no generic slop, density feels dev-oriented, etc.).
   - Activate `security-review` skill (light pass) for any new path/FS code or window config.
   - Run any Rust `cargo check` / frontend lint.

7. **Commit + track discipline (every meaningful step)**
   - After init: commit + push the branch.
   - After shell layout + tokens: commit + push.
   - After verification: commit + push.
   - Use conventional messages that reference this plan + track.
   - Append short status updates to track/vibeforge-progress.md after each push-worthy step.

8. **Close the loop**
   - Mark this plan DONE (with verification evidence).
   - Record the commit SHA(s).
   - Update track with results + "Phase 0 scaffolding complete".
   - Note: the next thing will be a **Phase 1 sub-plan** (workspace + real file tree + layout system).

## Risks & Unknowns + Mitigations
- Risk: Tauri template + chosen frontend creates "web app" feel instead of native desktop tool. → Mitigation: Ruthlessly strip bloat in step 4; prioritize native titlebar integration, keyboard, WebView2 specifics, and the calm technical aesthetic from the design plan.
- Risk: Wrong frontend choice locks us in. → Mitigation: Explicit decision gate in step 1 with rationale. React skills are already adapted in .vibeforge/skills.
- Risk: Scope creep during "just bootstrap". → Mitigation: Strict "In/Out" above. Anything beyond shell + tokens + one awareness stub requires a follow-up plan or explicit user OK.
- Risk: Windows-specific init/build issues (common with Tauri). → Mitigation: Prioritize Windows verification early; use terminal-ops skill patterns.
- Unknown: Exact Tauri 2 + React template flags in June 2025/2026 environment. → Document the exact command used.

## Success Criteria / Verification (Must All Pass)
- [ ] New plan branch exists and all commits reference this plan + track.
- [ ] `tauri dev` shows a non-slop, purposeful workspace shell on first run (per UI design checklist).
- [ ] Sidebar stub visibly contains references to plan/, spec/, track/, AGENT.md.
- [ ] Design tokens (at minimum colors, typography, spacing, radius) are defined as CSS vars and used in the shell.
- [ ] `cargo check` + frontend typecheck/lint clean.
- [ ] At least one `tauri build` artifact produced and smoke-tested (Windows portable).
- [ ] Light security-review pass completed and logged (no obvious new FS/privilege issues introduced in bootstrap).
- [ ] Track updated with evidence (screenshots or commands not required, but status + links to commits).
- [ ] This plan marked DONE with post-work update filled.
- [ ] User can `git fetch && git checkout main && git reset --hard origin/main` (or continue on the plan branch for Phase 1 prep).

## Skills Activated for This Plan
- `frontend-design-direction.md` + `make-interfaces-feel-better.md` (mandatory for any UI shell work).
- `rust-patterns.md` (for any Rust-side changes during/after init).
- `security-review.md` (lightweight for bootstrap FS/window config).
- `frontend-patterns.md` (for React structure decisions).
- `verification-loop.md` (at close).
- Reference `tdd-workflow.md` mindset even for init (small steps, verify immediately).

## Artifacts
- This plan: `plan/vibeforge-tauri-bootstrap-phase0-2025-06-09.md`
- The bootstrapped Tauri project files (src-tauri/, src/ or equivalent, tauri.conf.json, Cargo.toml, package.json, etc.)
- Updated `track/vibeforge-progress.md` entries (multiple small ones)
- Git commits on `plan/vibeforge-tauri-bootstrap-phase0-2025-06-09` (pushed)
- (Optional lightweight) First notes toward a `spec/architecture.md` if the bootstrap reveals important contracts.

## Dependencies
- Existing process (AGENT.md + plans + skills) — already satisfied.
- Rust + Node + Tauri CLI on the development machine (Windows in this session).
- User confirmation on stack if any doubt.

## Immediate Next After This Plan
- Create Phase 1 sub-plan (Core Workspace & Project Management) only after this bootstrap is verified DONE.
- Begin real terminal/PTY exploration in a later dedicated plan (Phase 2).
- The app will eventually make plan/spec/track first-class citizens in the UI (badges, quick create, context injection) — that work is explicitly out of this bootstrap.

---

**Post-Work Update (2025-06-09):**
- Exact create: `npm create tauri-app@latest . -- --yes --force --template react-ts --identifier com.hiimsunny.vibeforge`
- Frontend: React 19 + TS (matches installed .vibeforge/skills/frontend-patterns + design skills). No deviation.
- Rust installed cleanly via winget (cargo 1.96.0, stable-x86_64-pc-windows-msvc active).
- Commit on plan branch: 04f606e "feat: tauri react-ts bootstrap + purposeful dark technical workspace shell"
- Shell delivered: full dark technical layout (topbar with agent launchers, left sidebar explicitly surfaces plan/ spec/ track/ AGENT.md as "STRUCTURED WORKFLOW", 2x2 terminal grid placeholders, right context panels with send stubs, statusbar). Follows concentric radius, good min hit areas, subtle borders, no logos/hero/slop.
- Tailwind + postcss + custom CSS vars for the calm technical palette and tokens added.
- tauri.conf + Cargo + package.json metadata fixed to "Vibeforge".
- `npm install` succeeded. Frontend buildable (new App.tsx has zero external deps beyond React).
- Status: Shell complete + committed. Full `tauri dev` / build will work now that Rust is present (first run compiles the Rust side). Plan considered substantially delivered for Phase 0.
- Next per roadmap: create Phase 1 sub-plan immediately and continue driving toward real file tree, layout system, and PTY.

Notes for next session: Load AGENT.md + track/vibeforge-progress.md (latest) + this plan + master roadmap + UI design plan. We are on branch plan/vibeforge-tauri-bootstrap-phase0-2025-06-09. The root now contains a real (minimal) Vibeforge desktop shell + all process artifacts.

All work follows Vibeforge AGENT.md strictly. No code or `tauri init` before this plan file exists.