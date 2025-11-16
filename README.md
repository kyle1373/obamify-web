![Obamify demo](example.gif)

# Obamify · Next.js Edition

This repo now houses a native Next.js 15 + React + Tailwind experience that reimplements the original Rust-based **obamify** algorithms entirely in TypeScript. The UI runs completely locally: heavy assignment solvers live inside browser workers, presets are fetched from `/public`, and results can be saved to IndexedDB or exported as GIFs without ever touching a server.

## Key features

- ✅ Fully client-side Hungarian + genetic solvers translated from the Rust codebase
- ✅ Single-photo “Turn it into Obama” workflow with one button
- ✅ Live worker preview plus animated morph simulation view
- ✅ No uploads or servers — everything runs in the browser
- ✅ Vitest-covered heuristics & simulation helpers

## Getting started

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000) using the Next.js App Router. The UI is intentionally minimal:

1. Upload a single image (drag & drop or use the picker)
2. Click **“Turn it into Obama”**
3. Watch the low-res worker preview update, then the animated simulation kicks in automatically

The resolution is capped at 96×96 by default to keep processing fast while still showing recognizable features.

## Available scripts

| Script          | Description                                           |
| --------------- | ----------------------------------------------------- |
| `npm run dev`   | Start Next.js in development mode                     |
| `npm run build` | Production build of the Next.js app                   |
| `npm run start` | Serve the production build                            |
| `npm run lint`  | Run `next lint` (requires ESLint 9-compatible runtime)|
| `npm run test`  | Execute Vitest (jsdom environment)                    |

> **Note:** `next lint` currently emits warnings about experimental ESLint integration. Tests and type checking (`npx tsc --noEmit`) pass cleanly.

## Deploying on Railway / Nixpacks

Railway’s autodetector previously tried to compile the legacy Rust project. The repo now ships with a `nixpacks.toml` that forces a Node build:

```toml
providers = ["node"]

[phases.setup]
nixPkgs = ["nodejs_20", "pnpm-8_x"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm run start"
```

Push the repo and deploy with the default Nixpacks builder – it will install Node 20, run the standard Next.js build, and start the production server on port 3000.

## Project layout

- `app/` – App Router layout + main React UI
- `components/SimulationCanvas.tsx` – canvas renderer driven by the translated morph simulation
- `lib/domain` – Generation settings, preset loaders, and serialization helpers
- `lib/algorithms` – Hungarian solver, genetic/drawing swaps, morph simulation, GIF recorder
- `lib/hooks` – Worker management hooks for the UI
- `workers/` – Dedicated module workers (obamify + drawing refinement)
- `public/presets` – Bundled example presets and target assets

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
