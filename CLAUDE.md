# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then production build (`vite build`); run this to verify TypeScript compiles
- `npm run lint` — ESLint (flat config in `eslint.config.js`)
- `npm run preview` — preview the production build locally

There is no test suite configured in this repo (no test script, no test framework installed).

## Project Overview
This is a React app for building a family tree and printing/exporting it.
Primary users are non-technical — they need clarity, not complexity.
The product optimizes for:
- Time-to-insight: family trees should load fast and be scannable at a glance
- Simplicity: one obvious way to do each task, no power-user shortcuts
- Visual polish: consistent spacing, alignment, and typography across both web and print — no sloppy or uneven layouts, everything should feel clean and intentional

Avoid over-engineering. Prefer readability over cleverness. When in doubt, make it simpler.

## Tech Stack

- Next.js 15 with App Router (not Pages Router)
- TypeScript (strict mode enabled)
- Tailwind CSS for styling
- Zustand for global state (only where truly needed)
- Vitest + React Testing Library for tests
- d3-flextree for tree layout calculation (pure math only — positions/sizes, no DOM manipulation)
- d3-shape for connector line paths (d3.linkVertical, curveBumpY, etc.)
- read-gedcom for GEDCOM file parsing (TypeScript, zero-dependency)
- react-leaflet for the location map view (separate from the tree renderer)

Do NOT introduce:
- Redux or any other global state library
- styled-components, Emotion, or CSS Modules
- Material UI, Ant Design, or Chakra UI
- Axios (use native fetch with our wrapper in lib/api.ts)
- React Flow, GoJS, family-chart, or any other diagramming/tree framework — the tree renderer is custom SVG
- dagre / dagre-d3 (unmaintained — use ELK.js if a layered layout beyond d3-hierarchy is ever needed)
- Canvas or WebGL for the tree — must stay SVG for print export
- html-to-image / html2canvas as the export path — use XMLSerializer on the SVG instead

...unless explicitly requested.

## Architecture

Directory structure:
- components/ — reusable, generic UI components (buttons, modals, inputs) — not domain-specific
- components/tree/ — SVG tree rendering: PersonNode, ConnectorLine, TreeCanvas, zoom/pan wrapper
- components/map/ — location map view: MapView, MarkerCluster, LocationPin
- components/import/ — GEDCOM upload/import UI (file picker, progress, error display only — no parsing logic here)
- hooks/ — custom hooks (useZoomPan, useTreeLayout, useGedcomImport, etc.)
- model/ — pure functions and types only: tree layout (wraps d3-flextree), connector paths (d3-shape), GEDCOM parsing/normalization, geocoding helpers. No React, no side effects
- store/ — Zustand stores (treeStore, uiStore). Currently persists directly to localStorage; this is the only place allowed to touch localStorage or (later) fetch
- assets/ — static assets (icons, images)

Rules:
- Layout/math logic (d3-flextree, d3-shape) lives in model/ — never inside component files
- GEDCOM parsing logic lives in model/gedcom/ — components/import/ is UI only
- Components are presentational: they receive computed positions/paths as props, they don't compute them
- Only store/ reads/writes localStorage directly — components and hooks always go through the store's actions, never touch localStorage themselves
- New reusable primitive (generic Button, Modal, Input) goes in components/ root — not components/tree/ or components/map/
- If a component is used only by one feature (tree, map, import), it goes in that feature's folder, not components/ root

Where new things go:
- New tree-rendering piece → components/tree/
- New map-rendering piece → components/map/
- New data type or pure transformation (layout, gedcom, geocoding) → model/
- New global/cross-cutting state → store/
- New reusable hook → hooks/

Before creating a new component:
- Search for existing components that serve the same purpose
- If something similar exists, extend it rather than creating a near-duplicate
- Only create an abstraction if it's used in 3+ places or is genuinely complex

Naming conventions:
- React components: PascalCase (UserProfile.tsx)
- Hooks: camelCase, prefixed with "use" (useUserProfile.ts)
- Utilities: camelCase (formatDate.ts)
- Types/interfaces: PascalCase (UserProfile, UserProfileProps)
- Constants: SCREAMING_SNAKE_CASE (MAX_RETRY_COUNT)

## State & Data Layer (current phase — no backend)

- Zustand (store/treeStore.ts) is the single source of truth for tree data in the browser; it reads/writes localStorage directly for persistence
- No repository/abstraction layer yet — this is a deliberate simplification for now, not a final decision
- Rule: components and hooks never call localStorage directly — always go through the store's actions (loadTree, saveTree, updatePerson, etc.)
- When a backend is introduced later, only the internals of the store's actions change (localStorage calls become API calls) — component code stays untouched as long as this rule was followed

## Coding Conventions

TypeScript:
- Strict mode is enabled. Never use `any`.
- Prefer inferred types. Only add explicit annotations when they add clarity.
- Use interfaces for objects, type aliases for unions and primitives.
- Never use non-null assertion (!). Handle null/undefined explicitly.

Components:
- Functional components only.
- Named exports for all shared components. Default export only for route files.
- Keep components under 200 lines. If longer, extract sub-components or hooks.
- Props interfaces are named ComponentNameProps and defined above the component.

Patterns:
- Use async/await. Never chain .then()/.catch() unless inside a utility.
- Extract repeated logic into hooks or helpers.
- Error boundaries around async data regions.
- Loading, empty, and error states are required for any data-fetching component.

Style:
- Descriptive variable names. No abbreviations unless universally understood (e.g., `id`, `url`).
- No dead code or commented-out blocks in committed files.
- Comments only when the intent is genuinely non-obvious. The code should explain the what; comments explain the why.

## UI and Design Rules

Foundation:
- Follow an 8px spacing rhythm. Use Tailwind's default spacing scale (4 = 16px).

Visual style:
- Strong typographic hierarchy. Size and weight carry more visual weight than color.
- Restrained vintage palette. No bright colors, no high contrast clashes.
- Prefer generous whitespace over dense layouts.

Components:
- Every button has a clear primary/secondary/destructive hierarchy. Never two primary buttons side by side.
- Forms are short and scannable. One column layouts on mobile, two on desktop max.
- Modals are reserved for destructive actions and focused tasks. Not for information display.

States — every interactive element must have:
- Hover state
- Focus ring (visible for keyboard users)
- Disabled state with reduced opacity
- Loading state for async actions (spinner or skeleton, not just disabled)

Accessibility:
- Minimum 4.5:1 contrast ratio for body text, 3:1 for large text
- All form inputs have associated labels
- All images have meaningful alt text (or aria-hidden if decorative)
- Interactive elements reachable and operable by keyboard

## Content Guidelines

Error messages:
- Say what happened and what to do next.
- Never blame the user.
- Be specific. "Email already in use" not "Something went wrong."

Avoid:
- Jargon (unless the audience clearly expects it)
- Passive constructions
- Filler phrases ("In order to...", "Please note that...")

## Testing and Quality

Before a task is complete:
- Run typecheck: pnpm typecheck (must pass with zero errors)
- Run lint: pnpm lint (must pass)
- Run affected tests: pnpm test [changed files]

What to test:
- Unit tests for all reusable utility functions
- Unit tests for all custom hooks with non-trivial logic
- Integration tests for form submission flows
- Do NOT add tests for simple presentational components with no logic

For UI changes, verify manually:
- Works on mobile (375px) and desktop (1280px)
- Loading state renders correctly
- Empty state renders correctly
- Error state renders correctly
- Keyboard navigable


