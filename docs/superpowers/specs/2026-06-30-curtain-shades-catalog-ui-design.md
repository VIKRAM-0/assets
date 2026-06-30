# Curtain Configurator Overhaul — Shades, Catalog & UI

**Date:** 2026-06-30
**Status:** Design approved (user), pending spec review → implementation plan
**Scope owner:** curtain feature in `index.html` (single-file Three.js r128 app)

## Problem

The bedroom curtain configurator has three gaps:

1. **Shades look unprofessional.** The Drape reads well because it's a hand-modeled GLB
   with baked folds. Blinds and Roman are procedural but primitive — blinds use
   zero-thickness planes + a chunky valance box (CAD-like); Roman is a soft sine ripple.
   The user directly compared them: *"drape looks professional, fix the blinds."*
2. **Catalog is thin.** 5 fabrics, 8 generic color dots — not grounded in real
   window-treatment materials or designer palettes.
3. **UI is flat.** Style buttons, fabric circles, color dots, two sliders — no visual
   preview of what each option produces, weak hierarchy.

## Decisions (user-approved)

- **Shade realism = ALL PROCEDURAL, rebuilt well.** No new GLB assets, no asset sourcing.
  Procedural geometry flexes to any window size and is driven by existing color/fabric/size
  controls. Rationale: blinds are geometric/repetitive — procedural can match GLB quality
  once slat thickness + rails + cords + materials are real. Cloth (drape) stays the GLB.
- **No Roller shade** (was offered as an easy add; user declined). Phase 1 = blinds + roman only.
- **Catalog: expand + realistic materials + curated palettes + vendor-anchored.** Naming
  anchored on The Shade Store (drapery), Hunter Douglas (shades), IKEA (fabric names).
- **UI: visual previews + grouped redesign**, stays in the right panel. Previews are
  stylized SVG/CSS, NOT live 3D renders (performance + simplicity).
- **Phased rollout:** Phase 1 (shade rebuild) → Phase 2 (fabric/color catalog) →
  Phase 3 (UI). Each ships and is visually verified before the next.

## Hard constraints

- **Three.js r128 lock.** `MeshPhysicalMaterial.sheen` is a `THREE.Color`; `outputEncoding`/
  `texture.encoding` API; `ACESFilmicToneMapping`. All material code targets r128.
- **Drapery HEADER styles stay GLB-only.** Pinch-pleat / grommet / ripplefold folds are
  baked into the Drape GLB; restyling them procedurally requires cloth simulation = OUT OF
  SCOPE. "More styles" means more SHADES, not more drape headers. The existing Drape is the
  single drapery option. (Sheer/Pleated currently reskin the drape mesh — unchanged here.)
- **New fabrics need textures.** Use a PolyHaven map where a good match exists; otherwise the
  fabric falls back to an existing map differentiated by roughness/sheen/normalScale (still
  visually distinct, not a unique weave photo). Must degrade gracefully (flat color) if a
  texture fails to load — matches existing `_buildCurtainMat` behaviour.
- **On-demand rendering.** App renders only on `markDirty()` — any verification screenshot
  must follow an explicit `renderer.render()`.
- **Single-file app.** All changes land in `index.html`. Keep functions small and focused;
  the curtain code is already a large region — group new shade builders together.

---

## Phase 1 — Shade realism (procedural rebuild)

### Blinds — rebuilt (`_buildBlindsGeometry`)

Current problems: slats are `PlaneGeometry` (no thickness), tilt makes them look like floating
ribbons; head element is an oversized box ("valance"); no cords.

New geometry (reuses the existing `_curtainPanelFrame(offset)` orientation helper from the
z-fight fix — snaps square to the wall, so no regression):

- **Slats:** thin **`BoxGeometry`** (width × slatThickness ≈ 0.003 × slatHeight), not planes.
  Slat width = **2″ standard** → `slatH ≈ 0.05` world units; count = `clamp(round(height/slatH), 16, 60)`.
  Keep the fixed pleasant tilt (`BLINDS_TILT ≈ 32°`) via `rotation.x`. Optional subtle crown
  (very slight curve) deferred — flat-with-thickness is enough.
- **Headrail:** slim box at top (`height ~0.04`, depth ~0.05), darker tint.
- **Bottom rail:** matching slim box at the base (heavier-looking than a slat) — anchors the stack.
- **Ladder cords:** 2 thin vertical lines/cylinders down the face at ~1/4 and 3/4 width,
  spanning headrail→bottom rail. Sells "real blinds." Use thin `CylinderGeometry` or
  `LineSegments`; tinted near-white/grey.
- **Material:** faux-wood `MeshStandardMaterial`, `roughness ≈ 0.62`, `metalness 0`,
  tinted by `curtainState.color`. `castShadow`+`receiveShadow` on slats for inter-slat shadow.
- **Depth safety:** backmost extent must clear the window glass plane (X ≈ 2.043 measured) —
  the snapped frame already keeps this; verify backX < glass by measurement (see Verification).

### Roman — rebuilt (`_buildRomanGeometry`)

Current: `PlaneGeometry` displaced by `foldDepth*sin(phase*π)` — soft, vague ripples.

New = **flat-fold Roman** (Hunter Douglas flat-fold):
- **Even horizontal fold bands** (numFolds ≈ `clamp(round(height/0.30), 4, 9)`), each fold a
  flatter face with a **dowel ridge** at the fold line (sharper crease than a sine) — bulges
  toward the room (+Z = `_curtainFace`, away from glass).
- **Stacked header** at top (a few compressed folds) + a slim **headrail** box.
- Reuses the **fabric material** (so fabric/color/texture/warm-light fidelity all apply),
  as it does today. `computeVertexNormals()` after displacement so folds catch light.
- Keep the `_curtainPanelFrame` orientation + standoff (no z-fight).

### Phase 1 acceptance

- Blinds read as real venetian blinds (thickness, rails, cords, slat shadows) at close/steep
  camera; no z-fighting at any size (backX clears glass by measurement).
- Roman reads as structured flat-fold fabric with crisp fold lines, correct fabric material/color.
- Both flex correctly across width/length factors and restore the Drape on style switch.

---

## Phase 2 — Fabric & color catalog

### Fabric catalog: 5 → 9

Keep Linen, Cotton, Velvet, Silk, Voile. Add **Wool, Jacquard, Blackout, Cotton-blend**.
PBR starting values (`MeshStandardMaterial`, `metalness 0`; sheen via `MeshPhysicalMaterial`
where flagged). Tune against the live HDRI/exposure rig during implementation.

| Fabric | roughness | sheen | opacity / light | normal (weave) | physical? |
|--------|-----------|-------|-----------------|----------------|-----------|
| Linen | 0.90 | none–low | semi-sheer→opaque | medium–strong | no |
| Cotton | 0.85 | none–low | opaque | subtle–medium | no |
| Cotton-blend | 0.78 | low | opaque | subtle–medium | no |
| Velvet | 0.60 face + **high sheen** | high (sheenColor≈base) | opaque | medium | **yes** |
| Silk / faux-silk | 0.38 | med–high | opaque | subtle | yes (sheen) |
| Voile / sheer | 0.65 | low | **sheer** (opacity ~0.35, `transparent`, `depthWrite:false`) | subtle | no |
| Wool / wool-blend | 0.90 | low (soft halo) | opaque/darkening | medium–strong | no |
| Jacquard / damask | 0.55 | medium | opaque | **strong** (pattern relief) | no |
| Blackout | 0.86 | none–low | **blackout** (opacity 1) | subtle | no |

Differentiators: roughness spread is the main visual separator (silk lowest → sharp highlight;
linen/wool highest → matte). Velvet = high sheen + fold highlights. Voile is the only one
needing real transparency. Each fabric maps to a PolyHaven texture id or a differentiated fallback.

### Color palettes (replace 8 flat dots)

6 curated groups (hex), bedroom-weighted, with per-fabric recommendations and bestseller defaults.

- **Neutrals:** `#F5F2EC #EDE6D8 #D9CFC0 #C2B6A3 #A89F90 #8C8377 #6E6960 #FFFFFF`
- **Warm/Earth:** `#E7D3B5 #D9B38C #C68A5E #A9602F #7C4A21 #B08D57 #8A5A3B`
- **Cool/Blue-Grey:** `#DDE3E6 #BFC9CE #9AA9B0 #6F7E87 #4F606B #36454F #283845`
- **Greens:** `#DCE3D2 #B9C4A6 #8FA079 #6B7B53 #46583C #2E4034 #7A8B6F`
- **Jewel:** `#1F4E5F #10403B #3B2A6B #6A1B3A #7A2E2E #8C6A1F #244B7A`
- **Deep/Dark:** `#2B2B2B #1C2733 #3A2C2A #402233 #28332B #4A1F22 #23252A`
- **Bestseller defaults:** ivory `#EDE6D8`, greige `#D9CFC0`, taupe `#A89F90`, navy `#1C2733`.

**Pairing (recommended-color highlighting):** velvet/silk → jewel + deep; linen/wool → neutrals
+ earth + greens; cotton/blend/poly → any (neutrals/cool safest); jacquard → tonal neutral or
single jewel; voile → whites/palest only. Low-roughness fabrics carry saturated/dark; high-
roughness flatter muted neutrals.

### Phase 2 acceptance

- 9 fabrics selectable, each visually distinct, color applied true (no map-neutralizing regression).
- Color picker shows grouped palettes; switching fabric surfaces its recommended colors.

---

## Phase 3 — UI redesign (previews + grouping)

Right-panel `#curtain-config-panel`, reorganized into labeled sections:

- **Style** — tiles, each a **stylized SVG preview** (drape folds / venetian slats / roman
  folds) + label, grouped *Drapery* (Drape, Sheer, Pleated) vs *Shades* (Roman, Blinds).
  Active state highlighted. *None* stays as a separate clear/off control (not a tile).
- **Fabric** — cards: enhanced swatch + name + 2-word descriptor (e.g. "Velvet · luxe pile").
- **Color** — palette groups as labeled rows (scrollable); active fabric's recommended
  swatches visually flagged (e.g. a star/dot); bestsellers shown first.
- **Size** — existing width/length sliders, polished spacing/labels.

Previews are SVG/CSS only (no 3D thumbnails). All existing handlers
(`setCurtainShape/Fabric/Color/Size`) stay; this is presentation + new color-group data.

### Phase 3 acceptance

- Each style/fabric is visually identifiable before selection; sections clearly grouped;
  no behavioural regression in selection/persistence.

---

## Verification (all phases)

Headless CDP harness (existing rig: chrome-headless-shell via Node WebSocket) against
`localhost:5173` (dev-proxy → prod S3). Per the documented lesson, **trust full screenshots +
geometry measurements over single-pixel samples**, and note swiftshader does NOT reproduce
z-fighting — so depth correctness is checked by **AABB-vs-glass measurement** (backmost X <
glass plane X), not by screenshot alone. Render explicitly before each capture. Verify across
fabrics, colors, sizes, and style switches; confirm Drape restores when switching away.

## Out of scope

- New drapery header styles (pinch-pleat/grommet/ripplefold) — needs cloth sim.
- Roller / cellular / woven-wood / vertical shades (not requested; Roller explicitly declined).
- Exact vendor SKU/swatch names (palettes are designer-plausible, not a named swatch deck).
- Living-room curtains (no GLB nodes).
- Tilt slider for blinds (fixed tilt, as previously decided).

## File touchpoints

- `index.html`: `_buildBlindsGeometry`, `_buildRomanGeometry`, `_curtainPanelFrame` (reuse),
  `CURTAIN_FABRICS`, `CURTAIN_COLORS`, `_buildCurtainMat`, `_applyCurtainColor`,
  `#curtain-config-panel` markup + CSS, the fabric/color render helpers (~lines 3154, 3486).
