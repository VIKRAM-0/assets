# LIVINIT Fabric Configurator — Refactor Design

**Date:** 2026-06-29
**Status:** Approved (design) — pending spec review before implementation plan
**Author:** Engineering (with Claude Code)

---

## 1. Goal

Refactor the LIVINIT 3D fabric configurator from a single 5,709-line `index.html`
(vanilla JS + inline Three.js + inline CSS) into a clean, typed, modular codebase —
**without changing behavior or visual appearance**.

Target stack: **Vite + TypeScript + React + Tailwind CSS**.

Non-goals (explicitly out of scope):
- No visual redesign. The port is pixel-identical (accent `#7C3AED` and all tokens preserved).
- No changes to the serverless API functions' behavior.
- No new features. This is structural only.
- No SSR / Next.js. The app is a client-only WebGL SPA; Next.js was evaluated and rejected
  (Three.js is browser-only and fights SSR; App Router adds routing a single-page configurator never uses).

## 2. Current State (verified)

- `index.html` — 5,709 lines: HTML body (575–1248), one inline `<style>` (10–573, ~330 rules),
  main inline `<script>` (1252–5538), and a second IIFE `<script>` (5539–5707, onboarding tour).
- `api/*.ts` — 7 Vercel serverless functions (459 lines total): `generate`, `find-fabric`,
  `enhance-texture`, `acg-search`, `acg-map`, `s3proxy`, `s3-proxy/[...path].ts`.
- Three.js **r128** loaded from CDN; GLTFLoader/DracoLoader/TransformControls/GLTFExporter
  loaded dynamically at runtime via `loadScripts()` and patched onto the global `THREE`.
- No build step on the frontend. No tests.

### 2.1 The central hazard: dual source of truth

State lives in **two** places that must stay in sync:

1. **~35 global singleton variables** (declared lines 1584–1683): `currentModelKey`,
   `meshEntries`, `currentModel`, `scene`/`camera`/`renderer`/`gltfLoader`, `roomMode`,
   `sBrightness/sRoughness/sMetalness/sSheen/sScale/sNorm`, `baseColorHex`, room state
   (`roomGroup`, `roomElements`, `roomVisible`, `explodeVal`, `activeRoomSection`),
   move state (`transformControls`, `furnitureMoveMode`, `tcMode`), curtain state
   (`curtainState`, `curtainMeshEntries`), selection/drag state, and runtime caches
   (`polyCache`, `texCache`, `enhanceCache`, `_gltfSceneCache`).
2. **The DOM itself** — 254 `getElementById` + 20 `querySelector` calls. Functions read
   slider values and `.active`/`.sel` classes straight off elements, and branch on `roomMode`
   to pick the `s-brightness` vs `s-brightness-r` element variant.

**This is why sequencing matters more than tooling.** React must own the DOM, but the current
logic reads state *from* the DOM. State must be unified into a single store *before* React
touches the UI, or all 254 reads become silent bugs.

### 2.2 Coupling inventory

- **~90 inline HTML event handlers** (74 `onclick`, 11 `oninput`, 4 `onchange`, 1 `onkeydown`)
  calling **~45 global functions** — the DOM hard-depends on these being on `window`.
- **Module-scope listeners** on `document`/`window`/`canvas`: drag mousemove/mouseup,
  orbit controls, wheel zoom, dblclick, Escape-to-close, resize.
- **Runtime `THREE.*` global patching** is timing-dependent (TransformControls only exists
  after a promise resolves). ES module imports eliminate this entire race class.

### 2.3 Confirmed cleanup targets

- `api/s3-proxy/[...path].ts` — **dead code** (no caller anywhere; frontend uses singular
  `s3proxy.ts?key=`). Delete.
- Tour handlers `_tutClose` / `_tutGoTo` / `_tutNext` — referenced in markup (lines 5514–5521)
  but **no definitions exist**. Already broken. Remove markup or implement intentionally.
- Duplicated `-r`-suffixed room sliders and duplicate "Applied Material" blocks — collapse into
  shared components.

### 2.4 API & deployment (unchanged behavior)

- All 7 functions are portable as-is; Vercel discovers `api/*` regardless of frontend build.
- Frontend keeps calling the same relative `/api/...` paths.
- `vercel.json`: keep `maxDuration` overrides; update output handling for Vite `dist/`
  (framework preset = Vite, output `dist`); ensure the SPA rewrite excludes `/api` and hashed assets.

## 3. Target Architecture

```
src/
  engine/            # pure TS, NO DOM, NO React — the Three.js core
    Engine.ts            scene/camera/renderer/render-loop + dirty flag + resize
    loaders.ts           GLTF/Draco/Transform/Exporter via ES imports (replaces loadScripts)
    model.ts             processGLTF, loadModel, switchModel, mesh-entry build
    materials.ts         PBR/swatch application; brightness/roughness/metalness/sheen/scale/norm
    textures.ts          poly/tex/enhance caches, makeSeamless, greyscale, enhanceTexture client
    room.ts              room load, element toggles, explode, furniture placement/snap
    curtains.ts          curtain meshes/materials/state
    exporter.ts          exportGLB
    raycast.ts           picking, hover, drag-to-apply hit testing
  state/
    store.ts             ONE typed store = the 35 globals; single source of truth; subscribe()
  data/                  static config (LIBRARY, FURNITURE_SLOTS, BEDROOM_SLOTS, POLY_IDS,
                         MATERIAL_MAPS, fabric arrays, CURTAIN_*) — typed, no logic
  api/                   typed fetch wrappers (generate, find-fabric, acg-search, acg-map, s3proxy)
  ui/                    React + Tailwind; subscribes to store, calls engine methods
    Sidebar / Topbar / ProductStrip / Viewport / ConfigPanel
    FabricBar / FabricFinderModal / Tour / shared (Slider, Swatch, Chip…)
  styles/              Tailwind entry + small CSS layer for keyframes/tour/pseudo-elements
  main.tsx
api/                   # serverless funcs — UNCHANGED (delete dead s3-proxy/[...path].ts)
```

**The defining invariant:** `ui/` talks to `engine/` and `state/` **only** through method calls
and store subscriptions. The UI never reaches into Three.js; the engine never reads the DOM.
This inversion is the entire point of the refactor.

### 3.1 State store design

- Single typed module holding all runtime state currently in the 35 globals.
- Exposes typed getters, mutation methods, and a `subscribe(listener)` for React.
- Slider values become store fields (not DOM reads). The `roomMode` branch becomes a store flag;
  the `-r` element duplication disappears because one React `<Slider>` binds to one store field.
- The engine reads/writes the store, not the DOM. React renders from the store.

### 3.2 Styling strategy (pixel-identical)

- CSS custom properties in `:root` (colors, fonts, `--sidebar-w`/`--topbar-h`/etc.) → Tailwind
  `theme.extend` config. Class names (`sb-*`, `cp-*`, `finder-*`…) become Tailwind utilities on components.
- Keep a **small hand-written CSS layer** for what utilities can't express: the 9 `@keyframes`,
  the spotlight-tour `box-shadow` cutout, tooltip-arrow `::before` variants, dual-ring spinner
  pseudo-elements, glassmorphism `backdrop-filter`, range-thumb `appearance`, scrollbar styling.

## 4. Phased Plan (engine-first / strangler — Approach A)

Each phase ends in a **runnable app** that must pass the smoke checklist (§5) before the next begins.
Legacy `index.html` and new React UI coexist until Phase 5.

- **Phase 0 — Tooling baseline.** Add Vite + TS (`allowJs`, loose `strict:false` initially),
  React, Tailwind. Make the **existing code build and run unchanged** through Vite.
  Gate: full smoke checklist passes on the Vite build before any logic changes. This is the baseline.
- **Phase 1 — Unify state.** Introduce `state/store.ts`; migrate the 35 globals into it; replace
  global reads/writes. No behavior change. Gate: smoke checklist.
- **Phase 2 — Extract engine modules.** Carve the DOM-independent Three.js core into `engine/*`
  and `data/*` and `api/*` wrappers. Replace `loadScripts()` global-patching with ES imports.
  One module per agent, in waves; each extraction gated by smoke checklist.
- **Phase 3 — Sever DOM reads.** Route remaining DOM reads through the store/engine API so the
  engine no longer calls `getElementById`. Still vanilla DOM UI. Gate: smoke checklist.
- **Phase 4 — React + Tailwind UI.** Replace the static HTML body with the `ui/` component tree
  driven by the store; engine mounts to `<canvas>` via a ref and is untouched. Port CSS → Tailwind
  + small CSS layer, pixel-identical. Collapse `-r` duplication. Gate: smoke checklist + visual diff.
- **Phase 5 — Cleanup & deploy config.** Delete dead code (`s3-proxy/[...path].ts`, orphan tour
  handlers), tighten `tsconfig` toward `strict`, update `vercel.json` for Vite `dist/`. Gate: full
  smoke checklist on a Vercel preview deploy.

### 4.1 Agent execution model

- Module boundaries are defined and reviewed **before** any agent edits code.
- Each module extraction is one agent's task. Agents run in **waves within a phase** and never
  edit the same file in parallel (disjoint module ownership) — this avoids the corruption that
  parallel edits to one coupled file would cause.
- Realistic concurrency: ~4–8 agents per wave. Wide fan-out is only safe in Phase 4+ once modules
  are isolated. The "100 agents" idea is explicitly rejected for a single coupled file.

## 5. Smoke Checklist (the gate for every phase)

Drafted here; run **manually** at each phase boundary. Each must behave identically to baseline:

1. App loads; default model (chair) renders; orbit/zoom/pan work.
2. Switch model: chair → sofa → bed (wooden + fabric).
3. Apply a fabric swatch by click; apply by drag-drop onto a mesh.
4. Material sliders: brightness, roughness, metalness, sheen, pattern scale, normal/bump — each
   changes the render live.
5. Zone selection: select-all / deselect-all / individual mesh checkboxes.
6. Replace-fabric upload (diffuse upload → seamless → enhance).
7. Room view toggle; room element toggles (walls/floor/windows/doors/rug/ceiling); explode.
8. Room sections: living ↔ bedroom; furniture move mode (translate/rotate/nudge).
9. Curtains: shape, fabric, color.
10. Fabric Finder modal: upload tab (analyze & add), search tab (ACG search, quick filters).
11. AI render (`/api/generate`) — product mode and room mode.
12. Export GLB (`/api/...` + GLTFExporter).
13. Onboarding tour runs (and orphan `_tut*` handlers confirmed dead/removed).

## 6. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Dual source of truth → silent breakage | Unify state (Phase 1) **before** React (Phase 4). |
| No tests → can't localize regressions | Smoke checklist gates every phase; app always runnable. |
| Three.js r128 + ESM import compatibility | Phase 0 verifies the exact r128 examples import cleanly before any extraction; pin versions. |
| Runtime global-patching races | Replaced with synchronous ES imports in Phase 2. |
| Parallel agents corrupting one file | Disjoint module ownership; no parallel edits to the same file. |
| Visual drift during CSS→Tailwind | Pixel-identical mandate + visual diff at Phase 4 gate. |
| `vercel.json` SPA rewrite breaking `/api` or hashed assets | Phase 5 verifies on a Vercel preview deploy. |

## 7. Open Questions

- None blocking. Stack, scope, sequencing, visuals, and the smoke-gate approach are decided.
- To confirm during Phase 0: exact npm package + version for the r128 example loaders that import
  cleanly under Vite (three@0.128 examples are pre-ESM-standardization).
