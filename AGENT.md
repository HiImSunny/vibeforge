# Vibeforge Agent Instructions

This is the single source of truth for how **any AI agent or human contributor** must work inside a Vibeforge-managed project.

Vibeforge enforces **structured, traceable work** using three dedicated folders at the project root:

- `plan/` — Implementation plans (what we will do and how)
- `spec/` — Specifications and requirements (what the thing should be)
- `track/` — Continuous project tracking and history (from start to finish)

**Rule: Never start significant work without creating/updating artifacts in these folders.**

---

## Core Workflow (Mandatory)

Whenever you are asked to **do anything** (new feature, bug fix, refactor, research, setup, improvement, etc.):

1. **Understand & Capture Intent**
   - Read existing `spec/` and `track/` to understand current state.
   - If no clear spec exists, create or update one in `spec/`.

2. **Create / Update a Plan** (before writing any code or making changes)
   - Create a new file: `plan/<task-name>-<YYYY-MM-DD>.md` (use kebab-case, short descriptive name).
   - Or update the latest relevant plan if it's iterative work.
   - Plan must include:
     - Clear goal
     - Scope (in / out)
     - Step-by-step approach
     - Risks / unknowns
     - Success criteria / verification steps
     - Dependencies

3. **Work in Small, Verifiable Steps**
   - Follow the plan.
   - After each meaningful step, **update the track file**.

4. **Track Everything**
   - Maintain `track/<project-or-feature>-progress.md` (or a main `track/PROJECT.md`).
   - Every entry must have:
     - Timestamp (ISO or human readable)
     - Status: `TODO` | `IN_PROGRESS` | `DONE` | `BLOCKED` | `VERIFIED`
     - What was done / decided
     - Links to created plans, specs, code, tests
     - Any artifacts produced

5. **Verify & Close the Loop**
   - When work is "done", update the plan and track with verification results.
   - Move or mark the plan as completed (e.g. add `✅` or move to `plan/done/` if you want to organize).

6. **Commit & Push to Git (Mandatory)**
   - All changes must be saved to git.
   - Work on a dedicated branch named after the plan (e.g. `plan/add-git-enforcement-2025-06-07`).
   - After each meaningful verifiable step (or at minimum at the end of the plan), commit with a clear message that references the plan file and track entry.
   - Use conventional commit format when possible (e.g. `feat: add git enforcement to AGENT.md (plan/...)`).
   - Push the branch (and create PR if appropriate).
   - Record the commit SHA(s) in the track entry.

**Never skip the plan/spec/track step for non-trivial work.** Trivial one-line fixes can be quick notes in track, but still log them. Git commit is still required even for small fixes.

---

## Folder Conventions

### plan/
- One file per major task or sub-task.
- Naming: `plan/add-tauri-pty-support-2025-06-06.md`
- Keep historical plans (don't delete — they are part of the track record).
- Optional subfolder `plan/done/` or `plan/archived/` for cleanup.

### spec/
- Feature specs, architecture decisions, API contracts, UI requirements, etc.
- Can be one big `spec/PROJECT.md` + smaller focused files.
- Update specs when requirements change (with date/version).

### track/
- The living history of the entire project.
- Recommended files:
  - `track/PROJECT.md` — high-level project tracking
  - `track/<feature-or-area>-progress.md` — detailed per area
- Format example for entries:

```markdown
## 2025-06-06 14:32 — Add structured agent workflow

**Status:** DONE

**Plan:** plan/add-structured-tracking-2025-06-06.md
**Spec:** spec/agent-workflow.md

**Actions:**
- Created plan/, spec/, track/ folders
- Wrote AGENT.md
- ...

**Verification:**
- Folders exist and contain correct content
- This entry exists

**Next:**
- Implement folder-aware file tree in Vibeforge UI
```

---

## Git Discipline (Mandatory)

**Remote:** https://github.com/HiImSunny/vibeforge

Git is the permanent, shareable record of all work. The local `plan/`, `spec/`, and `track/` files are the detailed human-readable log; git is the immutable history.

### Rules
- **Never work directly on `main`/`master`** for feature work. Always create a branch named after the current plan (e.g. `plan/add-git-enforcement-to-agent-instructions-2025-06-07`).
- After every meaningful step that produces code, docs, or configuration changes:
  1. `git add .`
  2. `git commit -m "feat: short description (plan/xxx-2025-06-07.md, track/yyy)"`
  3. `git push -u origin <branch>`
- At the end of a plan, the final commit must be pushed and the SHA recorded in the track entry.
- Trivial fixes still require at least one commit before moving on.
- When merging back to main, prefer squash or merge commits that reference the plan.

### One-time Setup (if repo not initialized)
```bash
git init
git remote add origin https://github.com/HiImSunny/vibeforge
git add .
git commit -m "chore: initial structured workflow + AGENT.md"
git branch -M main
git push -u origin main
```

All future agents (AI or human) working in this repository **must** follow these git rules. The Vibeforge app will eventually provide UI helpers for this, but the rule is enforced at the AGENT.md level today.

---

## Agent Behavior Rules

- **Always read the latest relevant plan/spec/track before starting work.**
- **Write the plan first.** Code only after the plan file exists and is reasonable.
- **Be explicit.** Use clear language. Avoid vague statements.
- **Track decisions.** Why did we choose X over Y? Log it.
- **Handle blocks immediately.** If blocked, update track with `BLOCKED` + what is needed to unblock.
- **Multiple agents collaboration:** When using @orchestration or multiple terminals, each agent should still log to the shared `plan/` / `spec/` / `track/`. Reference the agent that did the work.
- **Immutability preference:** When editing existing files, prefer creating clear new versions or appending with dates rather than silently overwriting history.
- **Security & quality:** Follow the same high standards as the ECC environment (validate inputs, no hardcoded secrets, proper error handling, tests where appropriate).

---

## How Vibeforge App Will Support This (Future / In Progress)

Vibeforge (the desktop + CLI) will:
- Auto-detect `plan/`, `spec/`, `track/` in opened projects and give them special treatment in the file tree (badges, quick views, "New Plan" / "New Spec" commands).
- When launching an AI agent terminal, optionally inject the content of `AGENT.md` + recent track as system context.
- Provide UI to create new plans/specs from templates.
- Show "Mission Control" style overview of open plans + current track status.
- The `vibeforge-agent` CLI will understand `--plan`, `--spec`, `--track` flags or automatically create entries when used for delegation.
- Support exporting a full "project story" from the track/ + plans.

Until the UI is built, **you (and any AI) are responsible for manually following this AGENT.md**.

---

## Getting Started on a New Task (Template)

1. Create `plan/my-task-2025-06-06.md` using the plan template below.
2. If needed, create/update `spec/xxx.md`.
3. Create or append to the appropriate `track/xxx-progress.md`.
4. Do the work following the plan.
5. Update track + plan with results.
6. **Commit & push** (see Git Discipline section above). Record commit SHA in track.
7. Verify.

**Minimal Plan Template:**

```markdown
# Plan: <Task Name>

**Date:** 2025-06-06
**Status:** IN_PROGRESS
**Owner:** <agent or person>

## Goal
One sentence.

## Scope
- In:
- Out:

## Approach
1. Step 1
2. Step 2
...

## Risks & Unknowns
- ...

## Verification
- [ ] ...
- [ ] ...

## Artifacts
- Spec: spec/...
- Track updates: track/...
- Git: commits on branch `plan/<name>-<date>`, final SHA recorded in track
```

---

This file (`AGENT.md`) is the **one file agent**. Any AI coding CLI running inside Vibeforge (or humans using this repo) must treat it as binding instructions.

Update this file when the workflow itself needs to evolve — and log the change in `track/`.

---

**Current Project Status:**
- Vibeforge is in early definition + design phase.
- Structured workflow (plan/spec/track + AGENT.md) is enforced.
- Git is now mandatory: all work must be committed and pushed to https://github.com/HiImSunny/vibeforge (see Git Discipline section).
- Design direction for UI is defined (see latest plan in `plan/`).
- Remote control feature is deferred.

Start every session by reading the latest entries in `track/`.

Welcome to structured, traceable, git-backed AI-assisted development.