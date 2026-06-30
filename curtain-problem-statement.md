# Curtain Configurator — Problem Statement

## What Exists Right Now

### 3D Assets
The bedroom GLB contains two curtain node groups: `curtains_1` and `curtains_2`.  
Both are discovered at room-load time by `_buildBedroomCurtainEntries()`, which traverses
those nodes and collects every child `Mesh` into `curtainMeshEntries[]`.  
All curtain meshes share a **single** `sharedGreyMat` (`MeshStandardMaterial`) so any
material change applies uniformly to all panels at once.

There are **no curtain nodes in the living-room GLB** — curtains are bedroom-only for now.

---

### State Model
```
curtainState = { shape, fabric, color }
```

| Dimension | Options | Default |
|-----------|---------|---------|
| `shape`   | sheer · drape · roman · blinds · pleated · none | drape |
| `fabric`  | linen · cotton · velvet · silk · voile | linen |
| `color`   | 8 hex presets (white → dark) | #c8b89a (cream) |

---

### Fabric Types (`CURTAIN_FABRICS`)

| ID | Roughness | Opacity | PolyHaven ID | Normal/Rough Fallback (S3) |
|----|-----------|---------|-------------|----------------------------|
| linen  | 0.90 | 1.00 | `rough_linen` | cotton_fabric/ |
| cotton | 0.85 | 1.00 | `fabric_pattern_05` | cotton_fabric/ |
| velvet | 0.55 | 1.00 | **none** | cotton_fabric/ |
| silk   | 0.35 | 1.00 | **none** | leather_fabric/ |
| voile  | 0.95 | 0.72 | `rough_linen` | cotton_fabric/ |

Velvet and silk have no PolyHaven ID so they always fall back to the same S3
normal maps used by linen/cotton. Their visual difference comes only from
roughness and color; there is no distinct surface microdetail.

---

### Shape Effects (Material-Only — No Geometry Change)

| Shape | What changes in the material |
|-------|------------------------------|
| drape | Baseline — preset roughness + color |
| sheer | opacity = 0.42, roughness +0.04, transparent |
| roman | roughness −0.12, color ×1.18 (lighter) |
| pleated | roughness +0.10, color ×0.78 (darker) |
| blinds | Special: metalness 0.55, roughness 0.25, no fabric texture |
| none  | All curtain meshes hidden (`visible = false`) |

**Critical gap:** Shape is purely a material trick. The actual curtain geometry
in the GLB never changes. A "roman blind" shape still looks like draped curtains
in the 3D view.

---

### Texture Pipeline

When `setCurtainFabric()` is called:
1. `_applyCurtainMaterial()` (async) runs
2. Tries PolyHaven → fetches normal + roughness map for `preset.polyId`
3. On failure (or polyId=null) → falls back to S3 URLs in `normFallback` / `roughFallback`
4. Calls `_buildCurtainMat(normTex, roughTex)` to assemble a new `MeshStandardMaterial`
5. Applies it to all `curtainMeshEntries`

When `setCurtainColor()` is called:
- Only `_applyCurtainColor()` runs — mutates `material.color` and `material.opacity` in-place
- No texture reload, instant update

UV repeat is hardcoded at `8 × 8` for both normal and roughness maps.  
There is no diffuse/albedo texture — base color comes entirely from `curtainState.color`.

A `_roomLoadGen` guard prevents stale texture callbacks from firing after the
room is destroyed or switched.

---

### UI — Two Separate Control Points

#### 1. Right Panel (`#curtain-config-panel`)
Visible when bedroom curtains are toggled ON via the "🪟 Curtains" chip.

- **Shape grid** — 6 buttons (sheer / drape / roman / blinds / pleated / none)
- **Fabric swatches** — 5 small circle buttons (gradient swatches), built by `_initCurtainFabricSwatches()`
- **Color presets** — 8 circle chips built alongside fabric swatches

#### 2. Bottom Fabric Bar (`buildCurtainLibrary()`)
Shown in the bottom strip when the user clicks "Change Curtain Fabric" in the
right-panel piece list (room mode, curtain entry selected).

- **Fabric type swatches** — same 5 swatches, built from `CURTAIN_FABRICS`, tagged with `data-cfab`
- **Color chips** — same 8 colors, tagged with `data-cclr`
- **Shape selector is NOT present** in the bottom bar — shape is only changeable from the right panel

Both locations sync active states via `document.querySelectorAll('[data-cfab]')` and
`document.querySelectorAll('[data-cclr]')` in `setCurtainFabric()` / `setCurtainColor()`.

---

### Toggle
`toggleBedroomCurtains()` flips `bedroomCurtainsVisible`.  
When turned OFF: all curtain meshes are hidden.  
When turned ON: `_applyCurtainMaterial()` is called to restore the last state.  
The config panel shows/hides accordingly.

---

## What Is Missing / Needs to Be Achieved

### 1. Shape Has No Geometry Effect
**Problem:** "Roman", "Pleated", "Blinds" are just material tweaks. The curtain in the 3D
view always looks like the same draped panel regardless of the shape selected.

**Goal:** Each shape should either (a) swap to a different curtain GLB mesh/variant, or
(b) show a clear visual difference that makes the shape label meaningful. Currently the
labels are misleading — "Blinds" just makes the curtain metallic/shiny but it still
looks like a drape.

---

### 2. Velvet and Silk Have No Distinct Normal Map
**Problem:** Both `velvet` and `silk` have `polyId: null` and share the cotton normal map
as fallback. Their microdetail looks identical to linen/cotton — only roughness differs.

**Goal:** Find or host proper normal maps:
- Velvet: a crushed/pile-effect normal (directional micro-fibers)
- Silk: a smooth/subtle cross-weave normal (low relief)

---

### 3. No Diffuse Texture
**Problem:** Curtain color comes from a flat hex. Real fabrics have color variation,
subtle pattern, weave texture.

**Goal:** Each fabric type should have a diffuse/albedo texture tinted by the selected
color, not a flat single color. The color chip should tint the texture (multiply blend)
rather than replace it.

---

### 4. Bottom Bar Missing Shape Control
**Problem:** The bottom fabric bar (shown when curtain piece is selected) has fabric +
color but no shape selector. The user has to go back to the right panel to change shape.

**Goal:** Add the shape picker to `buildCurtainLibrary()` so the full curtain config is
accessible from the bottom bar in one place.

---

### 5. UV Repeat Hardcoded
**Problem:** Normal and roughness maps are always repeated 8×8 regardless of the actual
curtain mesh size. If the mesh UV layout changes, the scale will look wrong.

**Goal:** Compute repeat from `curtainMeshEntry.uvScaleFactor` (currently hardcoded 0.3
in `_buildBedroomCurtainEntries`) similar to how furniture entries compute `physRepeat`.

---

### 6. Living Room Has No Curtains
The living-room GLB has no curtain nodes. The curtain config panel is not shown
for living-room mode. There is no plan in the code to add curtains there.

**Goal:** Decide whether curtains should be added to the living-room scene (requires
GLB update with curtain mesh), or document it as explicitly out of scope.

---

### 7. Curtain State Not Saved in Material Snapshot
`modelMaterialSnapshots` captures furniture material state when fabrics are applied,
but `curtainState` is a plain object that is reset to defaults on every room load
(`curtainState = { shape:'drape', fabric:'linen', color:'#c8b89a' }` in
`buildBedroomRoom()`). Navigating away and back resets all curtain customisation.

**Goal:** Include curtain state in the snapshot / restore system so customisation
survives room navigation.

---

## Summary Table

| Area | Status |
|------|--------|
| Curtain mesh detection (bedroom) | ✅ Working |
| Shared material across all panels | ✅ Working |
| Fabric type switching (texture reload) | ✅ Working |
| Color picking (instant, no reload) | ✅ Working |
| Shape switching (material-only) | ⚠️ Works but geometry never changes |
| Velvet / Silk distinct normal maps | ❌ Missing |
| Diffuse texture per fabric | ❌ Missing |
| Shape control in bottom bar | ❌ Missing |
| UV repeat calibrated to mesh scale | ❌ Hardcoded |
| Curtains in living room | ❌ Not planned |
| Curtain state persists across navigation | ❌ Resets to defaults |
| PolyHaven + S3 fallback texture chain | ✅ Working |
| Generation guard (crash prevention) | ✅ Working |
| Toggle show/hide | ✅ Working |
| Piece list "Change Curtain Fabric" row | ✅ Working |
| Bottom bar fabric + color when selected | ✅ Working |
