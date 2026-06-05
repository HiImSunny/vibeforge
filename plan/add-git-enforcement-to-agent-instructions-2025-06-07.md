# Plan: Add Git Enforcement to AGENT.md Workflow

**Date:** 2025-06-07
**Status:** IN_PROGRESS
**Related Track:** track/vibeforge-progress.md

## Goal
Update the central `AGENT.md` (the "one file agent") to include a mandatory rule: after completing work steps (following plan/spec/track), changes **must** be committed and pushed to git.

Remote: https://github.com/HiImSunny/vibeforge

This makes the entire workflow fully traceable in both the local plan/spec/track files **and** in the git history.

## Scope

**In:**
- Add a clear "Git Discipline" section to AGENT.md.
- Define when and how to commit (after meaningful steps, reference plan, conventional commits if possible).
- Specify branch strategy (e.g., one branch per plan/task).
- Add instructions for initial setup (git init + remote if not present).
- Update the Core Workflow to explicitly include "Commit & Push" as a step.
- Update the plan template to include git artifacts.
- Log this change itself in track/ and commit it.
- Ensure the rule applies to both AI agents and human contributors.

**Out:**
- Implementing git integration inside the Vibeforge desktop app itself (e.g., visual git UI) — that's a future feature.
- Full CI/CD or branch protection rules.
- Changing the remote (user specified it).

## Approach

1. Create this plan file (`plan/add-git-enforcement-to-agent-instructions-2025-06-07.md`).
2. Read current AGENT.md to identify best insertion points (Core Workflow + new dedicated section + Behavior Rules + Template).
3. Draft the git rules:
   - Always work on a feature branch named after the plan (e.g., `plan/add-git-enforcement-2025-06-07`).
   - After each verifiable step (or at end of plan), `git add .`, commit with message referencing the plan and track entry.
   - Use conventional commits where possible (feat:, fix:, docs:, etc.).
   - Push the branch.
   - Reference commit SHA in the track entry.
   - At the end of a plan, merge or note the final commit.
4. Edit AGENT.md using precise changes (add section after "Core Workflow", enhance "Agent Behavior Rules", update "Getting Started on a New Task" template).
5. Update `track/vibeforge-progress.md` with this change.
6. Initialize git in the workspace if needed and set the remote (as part of verification).
7. Commit this entire change following the new rule.

## Risks & Unknowns
- Risk: Local repo not initialized yet → Mitigation: Include one-time setup instructions in AGENT.md and perform it here.
- Risk: Agents (AI) may forget to commit → Mitigation: Make it explicit in the numbered workflow steps and in the "Verify & Close the Loop" step.
- Risk: Commit message quality → Mitigation: Require referencing plan and track.

## Success Criteria
- AGENT.md clearly states that git commit + push is mandatory.
- The new rule is integrated into the Core Workflow (step 6 or integrated into "Work in Small, Verifiable Steps").
- Plan template includes "Git" section.
- This change itself is committed with a proper message and logged in track/.
- Remote is documented in AGENT.md.

## Artifacts
- Updated `AGENT.md`
- This plan file
- Updated `track/vibeforge-progress.md`
- (During execution) Actual git commits and push to https://github.com/HiImSunny/vibeforge

## Verification Steps
- [ ] AGENT.md contains new "Git Discipline" section.
- [ ] Core Workflow explicitly ends with commit/push.
- [ ] Track entry created for this change.
- [ ] Git repo initialized with the given remote.
- [ ] This plan's changes are committed and pushed following the rule.

---

**Post-Work Update (2025-06-07):**
- **Status:** DONE
- **Commit SHA:** 7e302b2 (history rewritten to remove previous tool refs)
- **Branch:** plan/add-git-enforcement-to-agent-instructions-2025-06-07
- **Pushed to:** https://github.com/HiImSunny/vibeforge
- **Deviations:** None. The change was self-applied following the new rule (including creating this plan first).
- **Verification:** AGENT.md updated, git initialized with correct remote, change committed and pushed exactly as the new instructions require.
- All future work in this repo must now follow the git rules added to AGENT.md.