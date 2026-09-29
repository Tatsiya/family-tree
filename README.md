# My Family Tree

A browser app for building a family tree. Add people by hand or import an existing tree from a GEDCOM file, then explore it as an interactive diagram.

## Features

- **Add a person** — a form for name, date and place of birth, and sex.
- **Import from GEDCOM** — upload a `.ged` file to load an existing tree.
- **Interactive tree view** — the tree renders as an SVG diagram; click a person to see their details in a side panel.

Not yet implemented:
- Exporting or printing the tree
- Editing or deleting a person from the UI
- A map/location view
- Persistence — the tree currently lives in memory only and is lost on page reload

## Getting started

```bash
npm install
npm run dev
```

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`tsc -b`) and build for production (`vite build`) |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |

## Tech stack

- [Vite](https://vite.dev/) + [React 19](https://react.dev/)
- TypeScript (strict mode)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://zustand.docs.pmnd.rs/) for state
- [d3-flextree](https://github.com/klortho/d3-flextree) for tree layout
- [read-gedcom](https://github.com/pchretien/read-gedcom) for GEDCOM parsing

## Project structure

```
src/
  components/         reusable, generic UI (buttons, forms, panels)
  components/tree/    SVG tree rendering (PersonNode, ConnectorLine, TreeCanvas)
  components/import/  GEDCOM upload UI
  hooks/               custom hooks
  model/               pure functions and types: tree layout, GEDCOM parsing/normalization
  model/gedcom/        GEDCOM-to-tree conversion
  store/               Zustand store — the only place that will touch localStorage
```

See `AGENTS.md` for detailed conventions if you're contributing or working on this repo with an AI coding assistant.
