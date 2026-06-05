# Plan: Vibeforge UI Design System & Frontend Architecture (Design-First, Anti-AI-Slop)

**Date:** 2025-06-07
**Status:** IN_PROGRESS
**Owner:** AI (following AGENT.md)
**Related:** track/vibeforge-progress.md, spec/structured-workflow-and-agent-file.md, AGENT.md

## Goal
Define and establish a **product-specific, high-quality UI/UX foundation** for Vibeforge **before any significant backend or implementation work**. 

Vibeforge is a "Vibe Coding" multi-agent desktop workspace. The UI must feel intentional, purposeful, and premium — the opposite of generic AI-generated "slop" (flat, over-polished, low-information-density, trendy-but-empty dashboards with purple gradients, vague illustrations, and decorative blobs).

This plan ensures:
- Design direction is chosen and documented first.
- A cohesive, maintainable design system is defined.
- Polish principles are baked in from day one (no "we'll fix the UI later").
- Terminal/agent experience is first-class and delightful.
- Everything aligns with the structured workflow (plan/spec/track + AGENT.md).

**Why design first?** Backend (Tauri Rust side for PTY, MCP, orchestration) can be iterated on top of a solid, tested UI contract. Reversing this leads to technical debt and soulless interfaces.

## Scope

**In (this plan only):**
- Overall design direction / "vibe" for the product.
- High-level information architecture and key screens.
- Design system foundation (tokens, components, patterns).
- Specific anti-slop and polish rules (drawing from make-interfaces-feel-better, frontend-design-direction, etc.).
- Motion and interaction strategy (purposeful, not decorative).
- Accessibility and keyboard-first considerations (critical for a dev tool).
- How the UI supports core value: multi-project + multi-agent orchestration + rich context (browser, HTTP, DB, activity).
- Verification criteria for "no AI slop".

**Out (separate plans later):**
- Full backend implementation (Tauri Rust PTY/MCP layer).
- Specific component code (e.g., terminal grid implementation).
- Theming engine or user customization.
- Mobile/remote (already deferred).
- Detailed specs for individual features (HTTP client UI, AI Diff panel, etc.) — will reference this as base.

**Tech context (for design only):**
- Tauri v2 (Rust backend + webview frontend: React/Svelte + Tailwind or custom CSS-in-JS).
- Webview gives us modern CSS + JS for rich UI while keeping native desktop feel and cross-platform (macOS M1-4/Intel, Win portable+installer, Linux).
- Terminal rendering will likely use xterm.js or similar in webview, or native + webview bridge.
- Design system must be framework-agnostic where possible (CSS variables + tokens).

## Design Direction (Activated: frontend-design-direction)

**Purpose:** A unified command center for developers working with multiple AI coding agents across multiple projects simultaneously. Reduce context switching chaos. Make agents feel like powerful collaborators with full visibility into your tools (browser, HTTP, DB, files, git).

**Audience:** Professional developers (power users). They repeat complex workflows daily: monitoring multiple agents, reviewing diffs, sending context (screenshots, logs, queries), managing projects. They value speed, density, precision, and calm focus over marketing flair.

**Tone:** 
- Technical, calm, scannable, purposeful.
- Dense but not overwhelming (high information density without clutter).
- "Vibe" feel: modern, slightly alive (subtle agent activity), professional (not playful or corporate SaaS).
- Quiet confidence — like a well-tuned tmux + IDE + agent chat combined into one native-feeling window.

**Memorable details (to avoid generic slop):**
- Live agent status that feels organic (color + subtle motion tied to real activity, not just badges).
- Terminal chrome that respects the "vibe" of the underlying CLI (Claude, Codex, etc.) while unifying them.
- Context send gestures that feel direct and magical (drag from browser → agent, annotated screenshot flows).
- Project "memory" visualizations that make the plan/spec/track system feel alive in the UI.
- One signature interaction: e.g., "Agent Canvas" or fluid panel system that lets you orchestrate 3-6 agents visually without losing terminal power.

**Constraints:**
- Cross-platform native feel (Tauri webview must not feel like a web app).
- Keyboard-first + mouse power users.
- High performance (many live terminals + webviews + agent streams).
- Accessibility (WCAG AA, screen reader for logs/activity, full keyboard grid navigation).
- Information density: support 4+ projects/terminals visible without constant resizing.

**Anti-slop rules (enforced):**
- No generic hero sections, oversized marketing text, decorative blobs, or stock-like atmospheric media.
- First viewport immediately shows the actual workspace/tool (terminals + project state).
- No single decorative style applied everywhere.
- Visual hierarchy supports repeated daily scanning and multi-tasking.
- Every element earns its place: controls speak for themselves.
- Typography and spacing are contextual and tight where needed (dev tools are dense).
- Motion improves orientation/state communication, never decorative or sluggish.

## Key Screens & Information Architecture

1. **Welcome / Mission Control** (global overview)
   - All projects at a glance with live agent counts, status, recent activity.
   - Quick open/create project, clone, SSH.
   - Activity feed across everything.

2. **Per-Project Workspace** (the heart)
   - Flexible terminal grid/layouts (tabs, splits, 2x2, canvas view) — first-class.
   - Sidebar: File tree (smart, git-aware), project tasks, notes.
   - Right / bottom panels (collapsible, reorderable): Embedded Browser, HTTP Client, DB Client, AI Diff Review, Activity Log, Design/Canvas if relevant.
   - Top bar: Agent launchers, global search (quick open across projects), notifications, agent status summary.

3. **Agent Orchestration Views**
   - Channel chat / multi-agent coordination surfaces.
   - @mention flows visible in UI.
   - Sub-agent history badges and viewers.

4. **Supporting**
   - Settings (MCP, agents registry, themes, shortcuts, PATH management).
   - Prompt history / memory manager.
   - Terminal reader mode (distraction-free with sticky notes).
   - Git worktree / multi-account views.

**Priorities for v1:** Terminal grids + project switching + basic send-context + browser + HTTP + AI Diff + activity. Everything else can be panels that start hidden.

## Design System Foundation (Activated: design-system)

**Tokens (CSS variables, framework-agnostic first):**
- Colors: Multi-dimensional calm technical palette (charcoal base, soft accents per agent type — e.g., Claude blue, Codex purple, Gemini green — with semantic success/warning/error). Avoid one-hue dominance.
- Typography: JetBrains Mono (or bundled Nerd Font) for terminals/code. System/UI sans for labels. Tabular-nums everywhere for numbers/timers/counters.
- Spacing: Tight, consistent scale (4px base). Concentric radius rule enforced (outer radius = inner + padding).
- Elevation: Layered subtle shadows + borders for cards, terminals, popovers. Focus rings clear but not loud.
- Motion tokens: From motion-foundations (durations, easings, springs). Prefer 150ms ease-out for most. No "all" transitions.
- Breakpoints / responsive: Desktop-first but stable on high-DPI and different window sizes. Fixed toolbars, predictable grid behavior.

**Core Components (to define early):**
- Terminal pane (with chrome, status, agent badge, jump-to-bottom, activity indicators).
- Agent launcher / status badge (color-coded, live).
- Context send popover / gesture (from any tool to any agent).
- Diff viewer (inline, reviewable).
- Panel system (resizable, collapsible, tabs vs grid).
- File tree with git status + quick actions.
- Command palette (global, project-aware).

**Patterns:**
- High-density lists/grids with good separators.
- Live updating without jank (virtualization where needed).
- Empty states that are useful (quick actions, not just illustrations).
- Loading/processing that shows real progress (agent thinking steps if available).

## Polish & Interaction Principles (Activated: make-interfaces-feel-better)

Apply these religiously to avoid slop:
- **Concentric radius:** Nested surfaces respect padding in radius math.
- **Optical alignment:** Icons, controls centered visually (not just geometrically).
- **Shadows & borders:** Use for real separation/depth. Subtle transparent shadows.
- **Text wrapping:** balance/pretty for headings and short content. Tabular-nums for dynamic numbers.
- **Hit areas:** Minimum 40-44px for interactive elements. Expand icons with pseudo-elements.
- **Motion:** Interruptible transitions for state changes. Enter: opacity + small translateY + optional blur. Press: subtle scale. Icon swaps: cross-fade. No excessive or non-performant animation.
- **Images/media:** Subtle neutral outlines (1px alpha) so they don't bleed into surfaces.
- **Font smoothing:** Proper on macOS.
- **Review format:** Always document before/after with specific principle when polishing.

**Additional anti-slop:**
- Every interactive state (hover, active, focus, loading, empty, error) is explicitly designed.
- No "transition: all".
- will-change only on compositor-friendly properties and only when needed.
- Responsive constraints explicit (grids don't collapse unexpectedly).

## Motion Strategy (Activated: motion-ui + motion-patterns)

Purposeful only:
- Agent activity (subtle pulsing or progress that communicates "thinking" vs "idle" vs "done").
- Panel / layout changes (preserves spatial continuity when adding/removing terminals or switching projects).
- State transitions (send context success, diff apply, agent finish notification).
- Terminal-specific: smooth scroll, status changes, output streaming feel.
- Avoid: decorative particle effects, over-animated modals, constant movement that distracts from code/agents.

Base on motion-foundations tokens. Performance first (60fps on target hardware).

## Accessibility & Keyboard (Activated: accessibility)

- Full keyboard navigation for terminal grid (arrow keys, focus management, shortcuts).
- Semantic structure for panels, lists, terminals (ARIA roles, labels, live regions for activity).
- High contrast support.
- Screen reader friendly logs and activity.
- Target sizes meet minimums.
- Focus appearance clear.

## Verification & Anti-Slop Checklist (for this plan and future UI work)

- [ ] Design direction document exists and is referenced in every UI task.
- [ ] Tokens and components defined before pixel-pushing.
- [ ] Every major screen/component reviewed against make-interfaces-feel-better principles with before/after.
- [ ] No generic AI patterns (gradients, blobs, vague copy, low-density marketing layouts).
- [ ] First viewport shows real working tools/state.
- [ ] Information density supports real multi-agent/multi-project work.
- [ ] Motion is sparse, interruptible, and improves usability.
- [ ] Keyboard + accessibility pass done.
- [ ] Can be implemented in Tauri webview without feeling "webby".
- [ ] Aligns with plan/spec/track system (UI should surface plans, specs, track progress visibly where useful).

## Next Steps (after this plan approved)

1. Create lightweight spec/ for the design system + key component contracts (in spec/).
2. Update track/ with this plan reference and decisions.
3. When ready for implementation: Create sub-plans per major area (e.g., Terminal Grid UI, Agent Orchestration Surfaces) that reference this as base and activate specific skills (make-interfaces-feel-better, motion-*, etc.).
4. Prototype in Tauri webview (design system first as CSS vars + Storybook or similar if helpful, but keep lightweight).
5. Continuous verification using ui-demo + browser-qa skills where relevant.

## Risks & Mitigations
- Risk: Over-constraining too early. → Mitigation: This is direction + principles + tokens, not pixel-perfect mocks for everything. Leave room for iteration per feature.
- Risk: Tauri webview limitations on native feel. → Mitigation: Prioritize native-feeling patterns (titlebar integration, shortcuts, performance) from day one.
- Risk: Scope creep into backend. → Mitigation: This plan explicitly design-first; implementation plans come later.

## Artifacts
- This plan file.
- Future: spec/vibeforge-ui-design-system.md (tokens, components).
- Track updates in track/vibeforge-progress.md.
- References to activated skills: frontend-design-direction, make-interfaces-feel-better, design-system, motion-ui, motion-patterns, accessibility.

**Success looks like:** When someone opens Vibeforge for the first time, the UI immediately feels like "this was made by developers who actually use AI agents all day" — not "another AI wrapper dashboard."

---

**Post-Work Update (to be filled):**
- Verification against checklist.
- Key decisions made during design direction.
- Links to any prototypes or further specs.
- Status: DONE / needs review.