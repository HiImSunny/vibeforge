# Plan: Rewrite Git History to Purge internal-tooling / internal-tooling References from All Diffs and Commits

**Date:** 2025-06-08
**Status:** IN_PROGRESS
**Owner:** Grok + user
**Track:** track/vibeforge-progress.md (new section to be appended)

## Goal
Purge every occurrence of the strings "internal-tooling", "internal-tooling", "internal-tooling" (and close variants) from the *entire* git history so they no longer appear in commit messages, file contents, or any diff hunks on the remote (GitHub). After this, `git log`, blame, and every commit diff view on remote must be clean of the internal previous tooling / bot references.

Addresses direct user request: "trên remote tôi vẫn thấy 1 mớ internal-tooling và internal-tooling ở mục diff, rewrite history từ local đến remote đi".

## Scope
**In:**
- Redact the historical "Final full history sanitization check and rewrite for internal-tooling + internal-tooling" section (and any leaked variants like "previous-internal-tooling" in docs) in track/vibeforge-progress.md and affected plan/*.md.
- Full history rewrite using git-filter-repo (--replace-text for blobs + message handling) so *past tree versions* of the files also never contained the literals.
- Rewrite covers main + historical plan/add-git-enforcement-to-agent-instructions-2025-06-07 branch.
- Force-push both refs to origin with --force-with-lease.
- New track entry (using only generic terms: "internal tooling references", "previous internal tooling", "bot identities").
- Record new tip SHAs.
- Full verification before/after (0 matches in logs, patches, rev-list grep).
- Strict adherence to AGENT.md (this plan file first, dedicated plan/* branch, conventional commits referencing plan+track, mandatory push, track updates after steps).

**Out:**
- Altering the current correct author identity (Lương Duy Khang <duykhang.sunext@gmail.com>).
- Deleting the fact that sanitization occurred (we generalize the record).
- Any non-doc files (no strings found outside *.md).
- Tags, other remotes, or unrelated history.
- Changing real commit dates or other content.

## Background
- Repo is tiny (12 commits total at start of this plan).
- Prior attempts (filter-branch, rebase --root, multiple doc cleanups on 2025-06-07) cleaned authors and current tree but left traces:
  - Cleanup commit messages still contained the names (e.g. 52112bd subject had "(no internal-tooling or internal-tooling)").
  - The track section itself quoted the old names.
  - Diffs of cleanup commits (e.g. 52112bd patch on track) contain the strings in removed/context lines → visible in GitHub "diff" views.
- Current `git log --all --pretty="%an <%ae>"` is clean (only real author).
- Global grep hits only inside the one historical track section.
- Remote is up-to-date with local before this rewrite, so force push will make remote match the new clean history.

## Approach
1. Create this plan file (done).
2. Append a short IN_PROGRESS marker entry to track/vibeforge-progress.md (will be cleaned by the later filter).
3. `git checkout -b plan/rewrite-history-purge-internal-refs-2025-06-08`
4. Edit track/vibeforge-progress.md (lines ~227 section) with search_replace to use only generic language. Re-check plan/ files changed in prior cleanups.
5. `git grep -i "internal-tooling\|internal-tooling\|internal-tooling\|previous-internal-tooling"` → must be 0. Then commit the redact:
   `git add track/vibeforge-progress.md plan/*.md`
   `git commit -m "chore: redact internal tooling names from track history section (plan/rewrite-history-purge-internal-refs-2025-06-08.md, track/vibeforge-progress.md)"`
6. Prepare a replacements file (use echo or write to a temp location, e.g. .git/tmp-replacements.txt).
7. Run (with PATH):
   ```
   $env:PATH += ";C:\Users\DUY KHANG\AppData\Roaming\Python\Python314\Scripts"
   git filter-repo --replace-text .git/tmp-replacements.txt --message-callback '...' --force -- --all
   ```
   (Callback + replace-text to cover both file blobs and all commit messages across the 12 commits.)
8. Cleanup: reflog expire, gc --prune=now --aggressive.
9. Run battery of verification commands (see Success Criteria). Capture output.
10. Append the detailed post-rewrite track section (generic only, include verification summary + new SHAs for main and plan branch).
11. Commit the track update with proper message.
12. `git push --force-with-lease -u origin plan/rewrite-history-purge-internal-refs-2025-06-08`
13. `git push --force-with-lease -u origin main`
14. `git push --force-with-lease -u origin plan/add-git-enforcement-to-agent-instructions-2025-06-07`
15. Re-verify, update this plan file + track with final SHAs and "DONE".
16. (User side) Verify on GitHub UI; document any required reset for other clones.

All steps small + verifiable. Update track after each meaningful change. Commit & push the plan branch before the final main force.

## Risks & Unknowns
- Force push impact on any other clones (document "re-clone or reset --hard" in commit + track).
- Old SHAs in prior track entries / GitHub links will 404 (note explicitly: "pre-rewrite SHAs recorded for historical process log").
- Replacement misses a variant → residual strings. Mitigated by inspecting actual patches (52112bd etc.) and broad post-filter searches.
- Windows PATH / encoding for filter-repo + md files (CRLF). Mitigated by testing the invocation and using literal replaces.
- The historical plan branch tip will move to a new SHA (expected and desired — it gets cleaned too).
- GitHub UI may take 30-60s to reflect force push in all views.

## Verification (All Must Pass)
- Pre-filter: working tree grep = 0 bad strings.
- Post-filter (before any new commit):
  - `git log --all --oneline | Select-String -Pattern "internal-tooling|internal-tooling|internal-tooling"` → empty
  - `git log --all -p -- '*.md' | Select-String ...` → empty (or only new generic text)
  - `git rev-list --all | ForEach { git grep -l "internal-tooling|internal-tooling" $_ -- '*.md' 2>$null }` → no hits
  - Authors still only real name.
  - Recent messages generic (no parentheticals with old names).
- After final track commit + pushes: same + remote tracking clean.
- User confirms on GitHub: commit list messages clean, diff of (new SHA of old cleanup commit) has no bad strings in any view.

## Artifacts
- plan/rewrite-history-purge-internal-refs-2025-06-08.md (this file)
- track/vibeforge-progress.md (redacted section + new 2025-06-08 entry)
- Git commits on `plan/rewrite-history-purge-internal-refs-2025-06-08` (at minimum the redact + track update)
- Force pushes to origin/main + origin/plan/...
- Final SHAs recorded in track + this plan (update before close)

## Commands (Reference)
See detailed steps in the approved session plan file for exact one-liners (git-filter-repo PATH, example message-callback, verification Select-String pipelines, etc.).

**After last step:** mark this plan DONE (add ✅ or move), record the final push commit SHAs, and confirm with user that remote now shows clean history in diffs and commit subjects.

Follow AGENT.md at every step. No direct main work. Every non-trivial change committed + pushed.
