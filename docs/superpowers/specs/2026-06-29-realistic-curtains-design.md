# Realistic Curtains — Design Spec

**Date:** 2026-06-29
**Status:** Approved (via brainstorming dialogue)
**Scope:** Bedroom curtains only (living room has no curtain nodes — out of scope).
**Target file:** `index.html` (single-file vanilla-JS app, Three.js **r128** from CDN).

---

## Goal

Make the 5 existing curtain fabrics — **linen, cotton, velvet, silk, voile** —
look genuinely realistic when placed and recolored, then add user-facing
size sliders. The user's priority is realism; sliders are the chosen control
mechanism for a later phase.

Ordering (user-approved): **Phase 1 realism + persistence first, Phase 2 size sliders second.**

Out of scope: net fabric (needs an S3-hosted opacity map the user will provide later),
geometry-swapping per shape, and living-room curtains.

---

## Key Constraint: Three.js r128

The app is locked to r128 (CDN). This governs every material decision:

- Color management uses `renderer.outputEncoding = THREE.sRGBEncoding` (set at
  `index.html:4320`) and per-texture `texture.encoding = THREE.sRGBEncoding |
  THREE.LinearEncoding` — **NOT** the r152+ `outputColorSpace` / `colorSpace` API.
  `tryLoadTex(url, isSrgb)` (`index.html:1698`) already sets this correctly.
- `MeshPhysicalMaterial.sheen` in r128 is a **`THREE.Color`** (or `null`), not a
  float, and there is **no** `sheenColor` / `sheenRoughness` (those are r133+).
- No material-level anisotropy (r153+). Texture-filter anisotropy
  (`tex.anisotropy`) is fine and already used.
- Skip KTX2/Basis — unjustified complexity. Use PolyHaven 1K/2K JPG.

Add a `// TODO[three-upgrade]: .encoding -> .colorSpace when upgrading past r151`
comment near the curtain material code.

---

## Phase 1 — Realism + Persistence

### 1.1 Fix fabric → texture mappings (`CURTAIN_FABRICS`, `index.html:1636`)

| Fabric | Current polyId | New polyId | Notes |
|--------|----------------|------------|-------|
| linen  | `rough_linen` | `rough_linen` (keep) | diffuse near-cream, raw OK |
| cotton | `fabric_pattern_05` | `fabric_pattern_05` (keep) | diffuse light grey, raw OK |
| velvet | `null` | `velour_velvet` | real pile normal; desaturate diffuse; physical+sheen |
| silk   | `null` | `crepe_satin` | real weave normal; desaturate diffuse |
| voile  | `rough_linen` (wrong) | `crepe_georgette` | sheer/gauzy source; keep opacity 0.72 |

Add two per-fabric flags:
- `desaturateDiffuse: true` for velvet and silk (their PolyHaven diffuse is darkly
  tinted and would corrupt dark color chips — run through existing
  `makeGreyscaleTex()` at `index.html:1711` before use as `map`).
- `physical: true` for velvet (build `MeshPhysicalMaterial` for sheen).

### 1.2 Add diffuse to `getPolyMaps()` (`index.html:1751`)

Add `POLY_DIFF_KEYS = ['diff','Diffuse','diffuse','Diff','albedo','Albedo']`,
fetch `diffUrl = pickPolyUrl(files, POLY_DIFF_KEYS)`, return
`{ normUrl, roughUrl, diffUrl }`. Backward-compatible — existing callers that
destructure `{normUrl, roughUrl}` are unaffected.

### 1.3 Load diffuse in `_applyCurtainMaterial()` (`index.html:3514`)

Alongside the existing norm/rough fetch, add a third
`tryLoadTex(maps.diffUrl, true)` (**sRGB = true** — it is a color texture).
Pass the loaded `diffTex` into `_buildCurtainMat`. If diffuse fails to load,
fall back to no map (flat color, today's behavior). Respect the `_roomLoadGen`
guard already present.

### 1.4 Rework `_buildCurtainMat(normTex, roughTex, diffTex)` (`index.html:3457`)

- Accept `diffTex` as a third arg.
- If `preset.physical` (velvet): build `MeshPhysicalMaterial` and set
  `mat.sheen = new THREE.Color(curtainState.color).multiplyScalar(0.7)`
  (r128 Color API). All other fabrics stay `MeshStandardMaterial`.
- If `diffTex`: clone, `wrapS=wrapT=RepeatWrapping`, `repeat.set(8,8)`,
  `needsUpdate=true`; if `preset.desaturateDiffuse` run through
  `makeGreyscaleTex()` first; assign as `mat.map`. Keep `mat.color =
  curtainState.color` so the chip tints the (neutral) diffuse via multiply.
- Keep existing shape logic (blinds / sheer / roman / pleated / drape) and the
  `depthWrite: opacity >= 1` transparency guard.
- UV repeat stays hardcoded `8×8` in Phase 1 (Phase 2 recomputes from size).

### 1.5 Velvet sheen on color change (`_applyCurtainColor`, `index.html:3547`)

When mutating color in place, if `m.sheen instanceof THREE.Color`, update it to
`new THREE.Color(curtainState.color).multiplyScalar(0.7)` so velvet's sheen
tracks the chosen color.

### 1.6 Persistence across room navigation

Today `curtainState` is hard-reset to defaults at `index.html:3375` on every
`buildBedroomRoom()`, and `modelMaterialSnapshots` (`index.html:1593`) is keyed
by furniture model, not curtains.

Add a module-level `_savedCurtainState = null`. On every
`setCurtainShape/Fabric/Color` (and Phase 2 size change), write the current
`curtainState` into `_savedCurtainState`. At `index.html:3375`, restore from
`_savedCurtainState` if present instead of always defaulting. This survives
in-session room navigation (matches how the rest of the app persists state in
memory, not localStorage).

---

## Phase 2 — Size Sliders (after Phase 1 lands)

### 2.1 Capture base transform in `_buildBedroomCurtainEntries` (`index.html:3603`)

Each entry currently stores no geometry/transform. Add: `baseScale`
(clone of `mesh.scale`) and `bbox` (`new THREE.Box3().setFromObject(mesh)`),
mirroring the furniture `_baseScale` pattern (`_seatOnFloor`, ~`index.html:3690`).

### 2.2 Width + Length sliders in the curtain config panel

Two sliders (Width X, Length Y), modest range **0.7×–1.4×** to limit fold
distortion. On change: `mesh.scale.x = baseScale.x * widthFactor`,
`mesh.scale.y = baseScale.y * lengthFactor` for every curtain mesh.

### 2.3 Recompute UV repeat from size (fixes hardcoded 8×8, gap #5)

When size changes, recompute `map/normalMap/roughnessMap` `.repeat` proportional
to the new scale so the weave density stays constant instead of stretching:
`repeat.x = 8 * widthFactor`, `repeat.y = 8 * lengthFactor` (so a wider curtain
shows more weave repeats, not a stretched one). This is the realism mitigation
for the slider approach.

### 2.4 Persist size

Extend `curtainState` to `{ shape, fabric, color, widthFactor, lengthFactor }`
and include in `_savedCurtainState` (1.6).

---

## Known Realism Ceiling (stated up front)

Sliders scale the mesh; the **fabric folds are baked into the GLB geometry**, so
stretching widens the folds — recomputing UV repeat keeps the *weave* crisp but
cannot keep the *folds* natural. True per-size folds would require swapping GLB
mesh variants (separate asset work, not in scope). The 0.7×–1.4× clamp keeps
distortion within an acceptable band.

---

## Testing / Verification

No test framework exists (vanilla single-file app; `package.json` has no test
deps). TDD is not applicable. Verification is by running the app and visually
confirming, per fabric:

1. Each fabric loads its correct PolyHaven diffuse (velvet pile, silk weave,
   voile gauze visibly distinct — not all identical cotton-grain).
2. Color chips tint each fabric believably (dark chips don't black out velvet/silk).
3. Velvet shows a sheen rim under the scene lights; others do not.
4. Voile/sheer stay translucent without z-fighting against the wall.
5. Change fabric/color, leave bedroom, return → customization persists.
6. (Phase 2) Sliders resize without weave stretching; size persists.

No console errors; `_roomLoadGen` guard still prevents stale-texture crashes on
fast room switching.
