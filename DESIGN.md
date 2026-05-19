# Parallel Design System

## Product Promise

Parallel is not a chat app. It is a living-world investigation engine: an AI showrunner, a mutable truth, characters with agency, and a world state that changes because the player acts.

The interface must make that promise visible before the user sends a message.

## Reference Lessons

- AI Dungeon: memory and story cards prove that long-running AI narrative needs explicit world state, not only a transcript. Parallel should surface facts, clues, and director signals as first-class UI.
- SillyTavern: World Info and lorebooks show the value of structured character/world dossiers. Parallel should borrow the dossier mental model, but make it automatic and alive rather than manual reference material.
- Twine / Inklewriter: branching fiction tools expose narrative structure. Parallel should imply branching and consequence, without showing a static flowchart that makes the world feel prewritten.
- Investigation games such as Return of the Obra Dinn, Her Story, and Case of the Golden Idol: the UI is part of the detective work. Parallel should feel like a case desk/director console, not a generic AI SaaS surface.

## Design Direction

Name: Director's Case Desk

The main screen is a working table for a living case:

- Main: Live Scene + Script. A compact world pulse bar, then a wide script-like ledger of narrator, player, and character lines.
- Right: World Inspector. Dossier and timeline are tabbed supporting tools, not permanent competitors with the play lane.
- Mobile: The live scene remains primary. Dossier and timeline move into a bottom drawer.

## Visual Language

- Two modes: Night Desk for immersive noir play, and Day Desk for readable paper/ink case work.
- Day mode should feel like a bright investigation table, not a generic white SaaS page.
- Night mode remains dark desk, paper/ink accents, scanning-grid scene panel, restrained genre accent.
- Use genre color variables only as accents. Do not recolor the entire UI per genre.
- Avoid decorative hero pages, marketing copy, and generic purple/blue gradient AI aesthetics.
- Cards are functional containers for records, clues, characters, and modals. Do not nest decorative cards inside cards.
- The first viewport must communicate: current scene, tension, clue count, latest director signal, and a clear place to act.

## Typography

- Serif is for narrative material: scene title, character lines, narrator text.
- Sans is for controls, labels, counts, and product chrome.
- Monospace is only for small indices, turn labels, and telemetry-like state markers.

## Layout Rules

- Desktop >= lg: two columns: fluid play lane and 360-400px inspector rail.
- The play lane is primary. It must receive the majority of horizontal space and must not be capped at narrow chat width.
- Dossier and timeline live in the inspector rail as tabs. They are available, but they do not interrupt reading or acting.
- Mobile: no horizontal overflow. Header only keeps brand, world selector, and dossier button under 430px.
- Player identity overlay is fixed to the viewport, not nested in the main panel, so it remains centered on mobile.

## Interaction Principles

- The composer is "player action", not only chat input.
- Investigation actions should stay visible: look, listen, think, wait.
- Newly discovered clues and relationship changes should appear as world-state updates, not toast noise.
- The timeline is not chat history. It is the audit log of how the world changed.
- The default user loop is read -> act -> inspect if needed. The UI must not force inspect -> read -> act.

## Anti-Goals

- Do not make Parallel look like Character.AI, Chai, or a simple chatbot.
- Do not make the UI depend on character portraits or generated art to feel alive.
- Do not hide the world engine behind a single chat stream.
- Do not make cyberpunk the permanent visual identity; cyberpunk is one world genre, not the product brand.

## Current Implementation

- `components/WorldPulse.tsx`: current scene scan, tension, pressure links, clue count, latest director signal.
- `components/MessageList.tsx`: script ledger instead of bubbles-first chat.
- `components/WorldSidebar.tsx`: dossier rail for facts, clues, characters, relationships, memories.
- `components/TimelinePanel.tsx`: world-state change log.
- `app/globals.css`: desk/case/script visual primitives and genre accent variables.
- `lib/ui/theme.ts`: shared day/night theme persistence.
- `app/page.tsx`: desktop play lane plus tabbed inspector, mobile bottom drawer, fixed player identity overlay, day/night toggle.
- `app/create/page.tsx`: new-world workflow using the same day/night theme.

## QA Expectations

Before calling UI work complete:

- `npm run lint`
- `npm run build`
- HTTP 200 for `/` and `/api/world`
- Desktop screenshots at 1440px for both night and day themes
- Mobile viewport check at 390x844: `scrollWidth` must equal `clientWidth`
- Mobile after player name is set: compact world pulse, `LIVE SCRIPT`, and the player action composer must exist
- Theme toggle persists through reload via `parallel-theme`
