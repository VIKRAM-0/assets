# Procedural Venetian Blinds — Design

## Problem
The "Blinds" curtain style re-skins the same vertical-pleat drape mesh, so it never
reads as blinds. Replace it with real horizontal slat geometry generated at runtime.

## Decisions (user-approved)
- **Slat look:** faux-wood — matte slats tinted by the colour chip (no metalness).
- **Tilt:** fixed ~32° (half-open), no slider in v1.
- Reuses the existing colour/size controls and the warm-light/colour-fidelity fix.

## Approach
Generate a `THREE.Group` (`_blindsGroup`) of thin tilted slats sized & oriented to the
curtain's base bounding box.

- **Anchor:** capture the curtain bounding box + room-facing normal ONCE at entry-build
  time (nodes at base scale) → `_curtainBaseBox`, `_curtainFace`. Blinds dims derive from
  this × the width/length factors, so sizing stays stable.
- **Orientation:** local basis — `+Z` = room-facing normal (≈ −X), `+Y` = up,
  `+X` = window width axis (`cross(up, face)`, ≈ world Z). Slats are `PlaneGeometry`
  (width × slatH) in local XY (normal faces room), tilted around local X.
- **Slats:** count = clamp(round(height / 0.06), 20, 70); pitch = height/count;
  slatH = pitch·1.08 (slight overlap when tilted). Plus a darker head rail box on top.
- **Material:** `MeshStandardMaterial`, chip colour, roughness 0.62, metalness 0,
  DoubleSide. Cast + receive shadows → inter-slat self-shadowing sells the look under
  the directional key.

## Integration (existing hooks)
- `_applyCurtainMaterial`: if shape==='blinds' → hide drape meshes, `_applyBlinds()`, return;
  else hide `_blindsGroup` and continue. (none → hide both.)
- `_applyCurtainColor`: blinds branch updates slat + rail material colour live (no rebuild).
- `_applyCurtainSize`: blinds branch rebuilds with new factors.
- `toggleBedroomCurtains`: hide branch also hides `_blindsGroup`.
- Room rebuild (`_curtainNodes = []`): `_disposeBlinds()` + clear base box/face.

## Out of scope (v1)
Pull-cords/ladder strings, per-slat curvature, vertical blinds, tilt slider.

## Verification
Headless harness (existing CDP rig): set shape=blinds across colours/sizes, screenshot;
confirm horizontal slats with inter-slat shadows, correct colour, correct window coverage,
and that switching away restores the drape.
