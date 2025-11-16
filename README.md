![Obamify demo](example.gif)

# Obamify · Next.js Edition

This repo now houses a native Next.js 15 + React + Tailwind experience that reimplements the original Rust-based **obamify** algorithms entirely in TypeScript. The UI runs completely locally: heavy assignment solvers live inside browser workers, presets are fetched from `/public`, and results can be saved to IndexedDB or exported as GIFs without ever touching a server.

## Key features

- ✅ Fully client-side Hungarian + genetic solvers translated from the Rust codebase
- ✅ Drawing-mode refinement worker plus local morph simulation for playback
- ✅ GIF export powered by `gif-encoder-2`
- ✅ Persistent preset store (IndexedDB) for custom creations
- ✅ Vitest-covered heuristics & simulation helpers

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000) using the Next.js App Router. The UI surface includes:

- **Preset library** – choose the bundled transformations or load your saved ones
- **Custom uploads** – drop any square-ish image to obamify it locally
- **Generation controls** – resolution, proximity importance, and algorithm selection
- **Live preview + simulation canvas** – watch the morph simulation evolve in real time
- **Local persistence** – save presets to IndexedDB for later reuse
- **GIF exporter** – capture the running simulation into a downloadable GIF

## Available scripts

| Script          | Description                                           |
| --------------- | ----------------------------------------------------- |
| `npm run dev`   | Start Next.js in development mode                     |
| `npm run build` | Production build of the Next.js app                   |
| `npm run start` | Serve the production build                            |
| `npm run lint`  | Run `next lint` (requires ESLint 9-compatible runtime)|
| `npm run test`  | Execute Vitest (jsdom environment)                    |

> **Note:** `next lint` currently emits warnings about experimental ESLint integration. Tests and type checking (`npx tsc --noEmit`) pass cleanly.

## Project layout

- `app/` – App Router layout + main React UI
- `components/SimulationCanvas.tsx` – canvas renderer driven by the translated morph simulation
- `lib/domain` – Generation settings, preset loaders, and serialization helpers
- `lib/algorithms` – Hungarian solver, genetic/drawing swaps, morph simulation, GIF recorder
- `lib/hooks` – Worker management hooks for the UI
- `workers/` – Dedicated module workers (obamify + drawing refinement)
- `public/presets` – Bundled example presets
- `lib/storage` – IndexedDB helper for storing generated presets locally

## Testing

Vitest exercises the heuristic math and a subset of the simulation stack.

```bash
npm run test
```

Tests run with a lightweight `ImageData` polyfill; no network access is required.

## Contributing

1. Fork and branch from `main`
2. Keep the UI entirely client-side (no API routes)
3. Add Vitest coverage for any new algorithmic surface
4. Submit a PR describing the change and manual verification steps

Have fun obamifying! ✨
