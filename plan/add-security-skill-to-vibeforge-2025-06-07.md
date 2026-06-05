# Plan: Add Security Skill to Vibeforge and Integrate Relevant Development Skills

**Date:** 2025-06-07
**Status:** IN_PROGRESS

**Related:**
- plan/vibeforge-main-implementation-roadmap-2025-06-07.md
- plan/vibeforge-ui-design-system-and-frontend-first-2025-06-07.md
- spec/structured-workflow-and-agent-file.md
- AGENT.md (use relevant skills when tasks match)
- track/vibeforge-progress.md

## Goal
Set up a skills system inside the Vibeforge project (for reusable, high-quality skills for AI agents) so that AI agents running in Vibeforge can use reusable, high-quality skills for development tasks.

Specifically:
- "Install"/adapt the key skills previously identified for Vibeforge development into the project (UI/UX polish, frontend patterns, design system, motion, Rust, MCP, terminal, TDD, verification, agent harness, blueprint, etc.).
- Add a dedicated **security** skill (primarily security-review, possibly combined with security-scan).
- Ensure all skills follow the project's structured workflow (plan/spec/track + AGENT.md).
- Make skills discoverable and usable by the Vibeforge app's future "Skills Manager" and by agents via MCP or context injection.

This prevents reinventing the wheel and ensures high-quality, security-conscious, polished development practices are available to agents inside Vibeforge.

## Scope

**In:**
- Create `.vibeforge/skills/` directory (or `skills/` at root if preferred; align with .vibeforge/config.json).
- For each relevant skill from the host ECC environment:
  - Read the full SKILL.md.
  - Create an adapted version in the project (with Vibeforge-specific notes, e.g., Tauri/Rust context, desktop security, MCP for agents, PTY/terminal considerations).
  - Include a short "Vibeforge Adaptation" section.
- Prioritize and add:
  - UI/UX group (make-interfaces-feel-better, frontend-design-direction, design-system, motion-ui/patterns, accessibility, frontend-patterns).
  - Core dev (rust-patterns, mcp-server-patterns, terminal-ops, tdd-workflow, verification-loop, agent-harness-construction, blueprint).
  - Security: security-review (core) + security-scan if useful.
- Update .vibeforge/config.json to list available skills.
- Update AGENT.md to mention how agents should use project skills (e.g., "When task matches a skill in .vibeforge/skills/, read and follow it").
- Create a simple "skills index" or README in the skills dir.
- Log everything in track/.

**Out (for this plan):**
- Full UI implementation of Skills Manager in the Vibeforge desktop app (that's a later phase per the main roadmap).
- Creating every single skill from the 229+ list (focus on the ones previously identified as relevant).
- Language-specific security (django-security etc.) unless needed for examples.
- Detailed security audits of the Vibeforge codebase itself (use the skill once it's added).

## Background (from previous discussion)
When user asked to find suitable skills for the project (especially UI/UX), I identified and summarized many from the host environment:
- UI/UX: make-interfaces-feel-better, frontend-design-direction, frontend-patterns, design-system, motion-ui + motion-patterns + motion-foundations, liquid-glass-design, accessibility, ui-demo, dashboard-builder, browser-qa.
- Supporting: rust-patterns, mcp-server-patterns, terminal-ops, windows-desktop-e2e, tdd-workflow, verification-loop, agent-harness-construction, blueprint, create-skill, etc.

These are **not automatically "installed"** into my context for every response. I activate them on-demand by reading the full SKILL.md when the current task matches (e.g., for UI polish tasks, follow make-interfaces-feel-better checklist).

For Vibeforge (the product), we want the *agents running inside Vibeforge* to have access to similar high-quality skills.

## Approach

1. Decide on skills directory: `.vibeforge/skills/` (consistent with .vibeforge/config.json and hidden from casual users but available to the app).
2. Update .vibeforge/config.json to include a "skills" section listing paths and descriptions.
3. For each skill:
   - Read full SKILL.md from ECC bundle.
   - Create adapted .vibeforge/skills/<name>.md with:
     - Original content (or summary + link to source if too long).
     - "Vibeforge Notes" section: adaptations for Tauri/Rust, desktop app security (e.g., local PTY, file system access, MCP tool exposure), agent context (browser, HTTP, DB, terminals), cross-platform considerations.
     - Checklist tailored to Vibeforge risks (running untrusted AI agents, exposing local tools via MCP, etc.).
4. Create an index file: .vibeforge/skills/README.md or index.md.
5. Update AGENT.md (add section or rule: "When performing a task that matches a skill in .vibeforge/skills/, read and strictly follow that skill's instructions in addition to the core workflow.").
6. Update the master roadmap plan to reference this as part of foundation or skills manager phase.
7. Create a small plan for "Implement Skills Manager UI in Vibeforge app" later (per main roadmap).
8. For security specifically:
   - Primary: security-review (comprehensive checklist for secrets, input validation, auth, XSS, CSRF, rate limiting, dependency security, etc.).
   - Secondary: security-scan (for scanning the codebase).
   - Add Vibeforge-specific: considerations for local desktop app (file system MCP tools, PTY command execution, browser context, agent delegation).
9. Verify by "using" one or two skills in a small task if possible.
10. Update track/ with this change.

## Relevant Skills to Add First (Prioritized)

**UI/UX & Polish (as previously requested):**
- make-interfaces-feel-better
- frontend-design-direction
- design-system
- frontend-patterns
- motion-ui + motion-patterns + motion-foundations
- accessibility

**Core Development & Quality:**
- tdd-workflow
- verification-loop
- rust-patterns (for Tauri backend)
- mcp-server-patterns (critical for Vibeforge's agent context tools)
- terminal-ops
- agent-harness-construction
- blueprint (for complex plans)

**Security (new request):**
- security-review (main)
- security-scan

**Meta:**
- create-skill (to allow agents to create new skills following our workflow)

## Risks & Mitigations
- Risk: Skills become outdated if we copy full content. → Mitigation: Keep "Vibeforge Adaptation" sections, note source, and plan for a sync mechanism later.
- Risk: Security skill is too web/Next.js/Supabase focused. → Mitigation: Heavily adapt the checklists for desktop/Tauri/Rust/MCP/PTY/agent execution risks (e.g., command injection via PTY, local file exposure via MCP, privilege escalation in desktop app).
- Risk: Overwhelming the skills dir early. → Mitigation: Start with the prioritized list above. Add more later via sub-plans.
- Risk: Agents ignore skills. → Mitigation: Update AGENT.md to make following project skills mandatory when applicable.

## Success Criteria
- .vibeforge/skills/ exists with at least the prioritized skills (including security-review adapted).
- .vibeforge/config.json references the skills.
- AGENT.md instructs agents to use them.
- Security skill has Vibeforge-specific sections covering desktop AI agent risks.
- Track entry created.
- Future development tasks can reference "follow the security-review skill in .vibeforge/skills/".

## Artifacts
- .vibeforge/skills/ directory + individual skill files.
- Updated .vibeforge/config.json
- Updated AGENT.md
- Updated plan/vibeforge-main-implementation-roadmap-2025-06-07.md (if needed)
- This plan file
- Track entry

## Immediate Next Steps
1. Create the .vibeforge/skills/ dir and config update.
2. Add the security skill first (as requested).
3. Add the UI/UX and core ones in batches.
4. Update AGENT.md and config.
5. Log in track/.
6. When implementing the actual Skills Browser/Manager in the app (later phase), use this as foundation.

---

**Post-Work Update (to be filled when done):**
- List of skills actually added.
- Links to the created files.
- Any adaptations made for Vibeforge.
- Status: DONE when the initial set (including security) is in place and documented.