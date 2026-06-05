# Plan: Establish Structured Agent Tracking System (plan/ + spec/ + track/ + AGENT.md)

**Date:** 2025-06-06
**Status:** IN_PROGRESS
**Related Track:** track/vibeforge-progress.md

## Goal
Introduce a mandatory, file-based structured workflow for all work in Vibeforge projects (and for developing Vibeforge itself). This becomes a core differentiator and "vibe" of the tool.

## Scope

**In:**
- Create and populate `plan/`, `spec/`, `track/`, `.vibeforge/` folders.
- Write the single authoritative `AGENT.md` file that any AI agent must follow.
- Create supporting `.vibeforge/config.json`.
- Bootstrap initial tracking, plan, and spec files for this project.
- Define conventions and minimal templates.
- Document how this integrates with Vibeforge app (future UI/CLI support).
- Ensure this is followed for the current task itself.

**Out (for this plan):**
- Full UI implementation in the desktop app (will be separate plan).
- Deep integration with agent launching / context injection (separate plan).
- Scaffolding new projects from Vibeforge (later).
- Remote control (explicitly dropped per user request).

## Approach (Step by Step)

1. Create the three core folders + hidden `.vibeforge/` config dir using shell commands.
2. Design and write a comprehensive but practical `AGENT.md`:
   - Explain the philosophy.
   - Mandate the workflow.
   - Provide clear templates and examples.
   - Include rules for multi-agent collaboration.
3. Create `.vibeforge/config.json` as machine-readable hint for the future Vibeforge app.
4. Create initial `track/vibeforge-progress.md` documenting the research + decision phase.
5. Create this plan file (`plan/establish-structured-agent-tracking-2025-06-06.md`).
6. Create a light `spec/structured-workflow-and-agent-file.md` describing the feature requirements.
7. Update the track file with this plan reference and completion status.
8. Verify everything is in place and the structure is clean.
9. (Optional but recommended) Add a small note in root README or similar if one exists.

## Risks & Unknowns
- Agents (especially external ones like Claude Code) may ignore the file unless we make it easy to discover and auto-inject.
- Overly strict rules could slow down very small tasks.
- Naming and folder organization must feel natural.

**Mitigation:**
- Keep AGENT.md clear, concise at the top, detailed below.
- Provide "quick task" exception for truly trivial changes.
- Make the folders prominent in future Vibeforge file tree.

## Success Criteria / Verification
- [x] Folders exist at project root.
- [x] `AGENT.md` exists and is comprehensive.
- [x] At least one plan, one spec, and track file created following the rules.
- [x] This plan file itself follows the format.
- [ ] (Future) When launching agents inside Vibeforge, the AGENT.md content is surfaced.
- The entire research-to-scope decision is traceable from `track/` back to plans/specs.

## Artifacts to Create
- `plan/establish-structured-agent-tracking-2025-06-06.md` (this file)
- `spec/structured-workflow-and-agent-file.md`
- `track/vibeforge-progress.md`
- `AGENT.md`
- `.vibeforge/config.json`
- Directories: plan/, spec/, track/, .vibeforge/

## Dependencies
- None (pure filesystem + documentation task).

## Notes for Multi-Agent Use
When delegating work via orchestration later, the delegating agent must still ensure a plan/spec/track entry exists for the delegated sub-task, or reference this master plan.

---

**Post-Work Update (2025-06-06):**
- **Status:** DONE
- **Verification results:** All steps completed successfully.
  - Directories created: plan/, spec/, track/, .vibeforge/
  - `AGENT.md` written with full workflow rules, templates, and multi-agent guidance.
  - `.vibeforge/config.json` created.
  - `track/vibeforge-progress.md` initialized with research + scope decision history.
  - This plan file created following the template.
  - `spec/structured-workflow-and-agent-file.md` created.
- **Deviations:** None. The work itself served as the first real demonstration of the system.
- **Artifacts created:**
  - `plan/establish-structured-agent-tracking-2025-06-06.md`
  - `spec/structured-workflow-and-agent-file.md`
  - `track/vibeforge-progress.md`
  - `AGENT.md`
  - `.vibeforge/config.json`
- **Next immediate actions logged in track/.**