# Plan: Phase 2 Orchestration Foundation (vibeforge-agent CLI + delegation basics)

**Date:** 2025-06-10
**Status:** IN_PROGRESS
**Owner:** AI (following AGENT.md)
**Related:** plan/vibeforge-phase2-terminals-pty-2025-06-09.md (updated), plan/vibeforge-main-implementation-roadmap-2025-06-07.md, AGENT.md, track/vibeforge-progress.md

## Goal
Begin the "orchestration" half of Phase 2: provide a foundation for the `vibeforge-agent` companion (or in-app equivalent) so that agents can be delegated work, with clean output capture and (importantly) Claude stop-message stripping. This enables the "send context + run agent headlessly" magic described in the master roadmap without boiling the ocean.

## Scope (Tight foundation slice)
**In:**
- A small Rust or Node CLI (or Tauri command surface) that can list known agents and run one with `--prompt-stdin` or similar, capturing stdout/stderr cleanly.
- Reliable "Claude stop message" stripping (remove "Claude Code has stopped", similar termination notices from Claude Code / similar tools) so delegation output is clean for further processing or pasting back into terminals.
- Basic integration point from the Vibeforge UI (e.g. a "Delegate to..." action that can target a running agent terminal or spawn a headless one).
- Security: controlled, auditable execution. No arbitrary command construction.
- Documentation of the contract in the plan + track.

**Out (deferred):**
- Full @mention routing, multi-agent channels, complex pipelines.
- Persistence of delegation sessions.
- Rich result parsing / AI Diff integration (Phase 4 area).
- Production packaging of the `vibeforge-agent` binary.
- MCP exposure of orchestration.

## Approach (Small Steps)
1. Create this plan + track entry (done).
2. Decide implementation surface: start with a thin Rust command exposed via Tauri (or a small separate bin in the workspace) that re-uses the existing PTY manager where possible, or a simple std::process wrapper with output capture + stripping.
3. Implement core: `run_agent(agent, prompt)` that spawns, feeds prompt via stdin or args, captures output, strips known stop messages, returns clean result.
4. Add a minimal UI gesture in the current terminal list (e.g. context menu or button "Send to agent..." or "Delegate this").
5. Verify stripping with real Claude Code output examples.
6. Update track + push. Decide whether to continue on the main Phase 2 plan or treat this as its own slice.

## Risks & Unknowns
- Stop message patterns can be brittle across Claude Code versions.
- Headless vs visible PTY tradeoffs (user may want to see the agent thinking live).
- Security: any delegation surface is high-risk (input from UI/tree going to agent execution).

## Success Criteria
- Can programmatically run an agent (e.g. claude) with a prompt and get back stripped, usable output.
- The strip logic is centralized and tested with examples.
- UI has at least one gesture that exercises the foundation.
- All changes committed/pushed on the plan branch with references.

## Artifacts
- This plan.
- New or extended code for the orchestration surface (CLI or Tauri command).
- Updates to track and the main Phase 2 plan.
- Example stripped output in the plan or a test file.

Follow AGENT.md: security-review for any execution, small steps, regular push.

## Post-Work (to be filled)
- Sub-plan created.
- First foundation implementation (initial):
  - Added `strip_claude_stop_messages` Tauri command in Rust (lib.rs) with common stop phrases + marker. Registered and security-commented.
  - Enhanced right "CONTEXT • SEND TO AGENT" panel with "Quick Delegate" foundation gesture: textarea for task + "Send task to focused" (formats and writes via existing write_to_terminal to the focused ptyId). Also "Demo strip" button using the new command on sample output.
- Used the dynamic terminal list + focused viewer for the delegation target (no new execution surface).
- cargo check + npm run build clean.
- Commits + pushes on plan branch with references to sub-plan.
- Track updated.
- Next: more gestures, actual output capture for stripped results, decide on CLI vs in-app.

**2025-06-10 continuation slice (this session):**
- Expanded strip (priority 1): line-based multi-line handling (split lines, truncate at first stop line), more phrases from real usage patterns (incl. punctuated + "Task completed"), stronger security comment. cargo check ✓ (44873a8).
- Strengthened Quick Delegate (priority 2, main goal): 
  - FileTree context: last clicked path captured + "Insert tree context" button appends structured block to textarea (context from tree flows into task without breaking direct send-to-term).
  - Target choice: <select> over open terminals (shows which is focused); Send now targets chosen (or focused fallback). "Send task to target".
  - Demo sample made multi-line to match improved strip.
  - npm run build ✓.
- Two commits on branch: 44873a8 (feat changes) + 2d18376 (record SHA + progress in track).
- Pushed. All references sub-plan + Phase 2 main plan + track.
- Capture output (priority 3) + deeper CLI decision + real Claude verification noted as immediate next micro-slice (begin buffer + get_terminal_output cmd + "Capture last + strip" gesture in panel).
- Security: only re-used controlled write_to_terminal on allow-listed PTYs; pure read-only strip; no new execution surface.
- Track entries appended before/after code + after push (per AGENT.md).
- UI remains calm technical, dense, purposeful per the UI design plan (no slop, reuse tokens, good hit areas).

**2025-06-10 capture micro-slice (delivered):**
- Implemented bounded per-PTY output buffer inside PtyManager (16k cap, populated in the existing reader thread, cleaned on kill).
- Added `get_terminal_output(id)` Tauri command.
- Wired "Capture last + strip" button + result textarea + Copy in the Quick Delegate panel (re-uses the target selector + the strip command we already had).
- cargo check + npm run build clean.
- Commit 7a4434e + push.
- Completes the "begin capture output mechanism" item from the sub-plan.
- Still using the visible dynamic terminal list surface (no headless CLI yet).

**Status:** Capture foundation delivered. Sub-plan remains IN_PROGRESS for any follow-up (real Claude verification, CLI surface decision, richer gestures, or moving to headless). All pushes on the plan branch. Regular discipline followed.

All strictly per AGENT.md.
