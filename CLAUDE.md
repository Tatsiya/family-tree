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

This is a small, early-stage React + TypeScript + Vite app for building a family tree, styled with Tailwind CSS v4.

### Data model (`src/model/`)

- `types.ts` defines `Tree`, `Person`, `Family`, `Child`. `Tree.persons` is a **flat** `Record<id, Person>` — a `Person` has no parent/spouse pointers of its own. Relationships live separately in `Tree.families`: each `Family` has `partners: string[]` (spouse/partner links) and `children: Child[]` (each with a `relationType`: `'blood' | 'adopted' | 'foster'`).
- `seed.ts` provides `SEED_TREE`, the store's initial data (currently a single seeded person).
- `formatFullName.ts` is the single source of truth for assembling a person's display name (`name` + optional `middleName` + `lastName`) — both `PersonCard` and `PersonPanel` use it rather than re-deriving it.

### State (`src/store/treeStore.ts`)

A single Zustand store (`useTreeStore`) holds `{ tree, selectedId }` plus actions: `togglePerson`, `addPerson`, `deletePerson`, `updatePeson` (note: this name has a typo — it's `updatePeson`, not `updatePerson`; keep it as-is for existing call sites unless doing a deliberate rename). There is no persistence middleware, so state resets on reload. Mutations `structuredClone` the whole tree before editing.

### Rendering

There is **no real tree/graph layout yet**. `App.tsx` just flat-maps `Tree.persons` into a row of `PersonCard` components — `Family.partners`/`children` data exists in the model but nothing currently reads it to lay out generations or draw connector lines. Building an actual tree visualization is greenfield work.

`PersonCard` (compact, in the row) and `PersonPanel` (slide-out detail view, shown when a person is selected) both render the same fields via the shared `PersonFields` component (`src/components/PersonFields.tsx`), which takes a `yearOnly` prop — the card intentionally shows only the birth year, the panel shows the full date. This is a deliberate behavior difference, not a bug, so don't "fix" it into showing the same thing in both places.

`Header.tsx` holds the toolbar: "Add Person" opens a popover (`AddPersonForm.tsx`) that writes directly to the store via `addPerson`; "Import" and "Export" are intentionally wired to no-op handlers as placeholders for future features. The click-outside-to-close behavior for popovers/dropdowns is a reusable hook, `src/hooks/useClickOutside.ts` — use it for any future menu/dropdown instead of re-implementing the listener.

### Styling

Tailwind CSS v4, wired in via the `@tailwindcss/vite` plugin in `vite.config.ts` (no `tailwind.config.js` — v4's CSS-first config). `src/index.css` imports Tailwind and defines the app's theme tokens in an `@theme` block: a warm "parchment" color palette (`--color-parchment-bg/card/panel/border/text/text-strong`, used as `bg-parchment-card`, `text-parchment-text`, etc.) and `--font-serif` set to `'Playfair Display', serif` (the serif font is loaded via Google Fonts `<link>` tags in `index.html`, alongside EB Garamond). There are no more component-scoped CSS files — everything is Tailwind utility classes. Prefer Tailwind's default scale (`text-xs`, `rounded-lg`, etc.) over introducing new arbitrary-value classes (`text-[13px]`) when a default value is close enough.
