# Plan: Command Palette (Cmd+K) Overlay

**Date:** 2025-06-09
**Status:** IN_PROGRESS
**Owner:** frontend-worker

## Goal
Build a glassmorphism Command Palette overlay triggered by Cmd+K, with search/filter, arrow-key navigation, and Midnight Forge design.

## Scope
- In: CommandPalette React component, CSS overlay styles, Cmd+K keyboard handler, integration into App.tsx
- Out: Session persistence, AI diff panel changes, any Rust/Tauri changes

## Approach
1. Create src/components/CommandPalette.tsx — React component with:
   - Commands array: New Terminal, Launch Claude, Launch Codex, Launch Gemini, Focus Mode toggle, Open Settings
   - Search input with filtering (case-insensitive)
   - Arrow key navigation (up/down), Enter to select
   - Escape to close, close after execution
   - Glassmorphism overlay with backdrop-filter blur
   - Amber accent for selected item
2. Add CommandPalette CSS to src/App.css — overlay styles, glassmorphism, search input, command list, scrollbar
3. Integrate into src/App.tsx:
   - Add Cmd+K / Ctrl+K keyboard handler
   - Pass necessary props (spawnNewTerminal, launchAgent, focusMode toggle)
   - Render CommandPalette at root level (highest z-index)
4. Verify: 
pm run build passes cleanly

## Risks & Unknowns
- Ensure Cmd+K doesn't conflict with browser default shortcuts
- Command palette must close properly on all exit paths

## Verification
- [x] Cmd+K opens command palette overlay
- [x] Glassmorphism with backdrop-filter blur on overlay
- [x] Search filters command list in real time
- [x] Commands include: New Terminal, Launch agents, Focus Mode toggle, Open Settings
- [x] Clicking command executes it
- [x] Arrow keys navigate, Enter selects
- [x] Escape closes palette
- [x] Palette closes after command execution
- [x] Midnight Forge design with amber accent
- [x] npm run build clean

## Artifacts
- Track updates: track/vibeforge-progress.md
- Git: commits on branch plan/m3-cmd-palette-2025-06-09, final SHA recorded in track
