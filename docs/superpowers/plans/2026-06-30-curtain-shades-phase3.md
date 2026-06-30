# Curtain Shades Phase 3 — UI Redesign (Preview Tiles + Fabric Cards) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the curtain panel's plain text style-buttons and bare fabric circles with visual preview tiles (mini SVG per style, grouped Drapery/Shades) and fabric cards (swatch + name + 2-word descriptor).

**Architecture:** Presentation-only changes in `index.html` — static markup for the style tiles, a render-loop change for the fabric cards, plus CSS. All existing handlers (`setCurtainShape`, `setCurtainFabric`) and their id/class contracts are preserved so no behavior changes. Color groups (Phase 2) and the size sliders are untouched. Spec: `docs/superpowers/specs/2026-06-30-curtain-shades-catalog-ui-design.md` (Phase 3). User-approved direction: full redesign (style tiles + fabric cards).

**Tech Stack:** Three.js r128 (no 3D changes here), single-file `index.html`, inline SVG, headless CDP probe against `localhost:5173`.

## Global Constraints

- All edits in `index.html`. Style markup at ~lines 894-900 (`.curtain-shape-grid`); style CSS at ~208-216; fabric render in `_initCurtainFabricSwatches` ~lines 3505-3525; `setCurtainShape` ~3760; `setCurtainFabric` ~3765-3775.
- **Preserve the JS contracts:** style buttons keep `id="cshape-<id>"` and class `curtain-shape-btn` (so `setCurtainShape`'s `querySelectorAll('.curtain-shape-btn')` + `getElementById('cshape-'+id)` still work). Fabric cards keep `id="cfab-<id>"`; the fabric active-toggle selector changes from `.curtain-swatch` to `.curtain-fab-card` in BOTH `_initCurtainFabricSwatches` sync and `setCurtainFabric` — update both.
- Previews are inline SVG / CSS only — NO live 3D thumbnails, NO external images.
- Do NOT change `renderCurtainColorGroups`, the color data, `_buildCurtainMat`, the size sliders, or any 3D/material code.
- The bottom fabric BAR (separate component using `data-cfab`) is out of scope — leave it.
- Commits gated on explicit user go-ahead. Branch: `curtain-shades-phase3` (already created; it also carries one uncommitted Phase 2 default-color fix — that is expected and unrelated to these tasks).
- Visual acceptance is by screenshot; structural acceptance by the probe (tiles/cards present, click still toggles active, zero JS errors).

---

## Verification harness (shared)

**File:** `scratchpad/phase3-probe.mjs` (controller-created; do not modify). Run: `node scratchpad/phase3-probe.mjs`. It opens the bedroom curtain panel, screenshots it to `phase3-panel.png`, and prints:
`STRUCT {"styleTiles":N,"styleSvgs":N,"groupLabels":[...],"fabricCards":N,"fabricDescs":N}`, then a click test `CLICK {"blindsActive":bool,"velvetActive":bool}` (calls `setCurtainShape('blinds')` then `setCurtainFabric('velvet')` and checks the active class lands), then `JS errors: ...`.

(Controller validates the probe against current code before Task 1; on current code `styleSvgs:0` and `fabricCards:0` — that is the BEFORE state.)

---

## Task 1: Style preview tiles (grouped Drapery / Shades + None)

**Files:**
- Modify: `index.html` — replace the `.curtain-shape-grid` block (~lines 894-900) with grouped tile markup; update `.curtain-shape-btn` CSS (~208-211) and add group-label + tile styles.

**Interfaces:**
- Consumes: `setCurtainShape(id)` (unchanged).
- Produces: 6 tile buttons keeping `id="cshape-<id>"` + class `curtain-shape-btn`, each containing an inline SVG preview + a label span, under "Drapery" and "Shades" group labels, plus a full-width None/Clear button.

- [ ] **Step 1: Run the probe to capture BEFORE state**

Run: `node scratchpad/phase3-probe.mjs`
Expected: `STRUCT` shows `styleSvgs:0` (plain text buttons), `groupLabels:[]`; `CLICK` shows `blindsActive:true`, `velvetActive:true` (handlers work today); `JS errors: none`.

- [ ] **Step 2: Replace the style markup**

Replace the entire `<div class="curtain-shape-grid"> ... </div>` block (the 6 `curtain-shape-btn` buttons, ~lines 894-900) with:

```html
              <div class="curtain-style-group-label">Drapery</div>
              <div class="curtain-shape-grid">
                <button class="curtain-shape-btn active" id="cshape-drape" onclick="setCurtainShape('drape')" title="Drape">
                  <svg viewBox="0 0 48 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 3 Q6 15 9 27 M19 3 Q16 15 19 27 M29 3 Q26 15 29 27 M39 3 Q36 15 39 27"/></svg>
                  <span>Drape</span>
                </button>
                <button class="curtain-shape-btn" id="cshape-pleated" onclick="setCurtainShape('pleated')" title="Pleated">
                  <svg viewBox="0 0 48 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7 L14 3 L20 7 L26 3 L32 7 L38 3 L44 7"/><path d="M11 6 V27 M23 6 V27 M35 6 V27"/></svg>
                  <span>Pleated</span>
                </button>
                <button class="curtain-shape-btn" id="cshape-sheer" onclick="setCurtainShape('sheer')" title="Sheer">
                  <svg viewBox="0 0 48 30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 2" stroke-opacity="0.6"><path d="M9 3 Q6 15 9 27 M19 3 Q16 15 19 27 M29 3 Q26 15 29 27 M39 3 Q36 15 39 27"/></svg>
                  <span>Sheer</span>
                </button>
              </div>
              <div class="curtain-style-group-label">Shades</div>
              <div class="curtain-shape-grid">
                <button class="curtain-shape-btn" id="cshape-roman" onclick="setCurtainShape('roman')" title="Roman">
                  <svg viewBox="0 0 48 30" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="7" y="3" width="34" height="3" rx="1" fill="currentColor" stroke="none"/><path d="M9 12 H39 M9 18 H39 M9 24 H39" fill="none"/><rect x="7" y="26" width="34" height="3" rx="1" fill="currentColor" stroke="none"/></svg>
                  <span>Roman</span>
                </button>
                <button class="curtain-shape-btn" id="cshape-blinds" onclick="setCurtainShape('blinds')" title="Blinds">
                  <svg viewBox="0 0 48 30" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="7" y="3" width="34" height="3" rx="1" fill="currentColor" stroke="none"/><path d="M9 10 H39 M9 14 H39 M9 18 H39 M9 22 H39 M9 26 H39" fill="none"/></svg>
                  <span>Blinds</span>
                </button>
              </div>
              <button class="curtain-shape-btn curtain-shape-none" id="cshape-none" onclick="setCurtainShape('none')">Clear / None</button>
```

- [ ] **Step 3: Update the CSS**

Replace the `.curtain-shape-btn` and `.curtain-shape-btn.active` and `.curtain-shape-btn:hover...` rules (lines ~209-211) with these, and add the new rules:

```css
.curtain-shape-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:6px}
.curtain-style-group-label{font-size:9px;font-weight:700;letter-spacing:.06em;color:var(--text-muted);text-transform:uppercase;margin:6px 0 4px}
.curtain-shape-btn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 4px;font-size:9.5px;font-weight:500;border:1px solid var(--border);background:var(--surface);color:var(--text-muted);border-radius:8px;cursor:pointer;transition:all .15s;font-family:var(--font-b)}
.curtain-shape-btn svg{width:100%;height:24px;color:var(--text-mid)}
.curtain-shape-btn.active{background:var(--accent-pale);border-color:var(--accent);color:var(--accent)}
.curtain-shape-btn.active svg{color:var(--accent)}
.curtain-shape-btn:hover:not(.active){border-color:var(--border-strong);color:var(--text);background:var(--bg)}
.curtain-shape-none{width:100%;flex-direction:row;justify-content:center;padding:6px;font-size:10px;margin-top:2px}
```

(Note: the existing `.curtain-shape-grid` rule at line 208 is replaced by the first line above; if a duplicate remains, keep only this one.)

- [ ] **Step 4: Verify tiles render + clicks still work**

Run: `node scratchpad/phase3-probe.mjs`
Expected: `STRUCT` shows `styleTiles:6`, `styleSvgs:6`, `groupLabels:["Drapery","Shades"]`; `CLICK` shows `blindsActive:true` (the Blinds tile gets `.active` when clicked); `JS errors: none`. Open `phase3-panel.png` and confirm two labeled groups of icon tiles (Drape/Pleated/Sheer, Roman/Blinds) + a Clear/None button, with the active tile highlighted.

- [ ] **Step 5: Commit** (on user go-ahead)

```bash
git add index.html
git commit -m "feat(curtains): style picker as grouped preview tiles"
```

---

## Task 2: Fabric cards (swatch + name + descriptor)

**Files:**
- Modify: `index.html` — the fabric loop inside `_initCurtainFabricSwatches` (~lines 3508-3524); the `.curtain-fabric-row` CSS (~line 212) + add card styles; the active-toggle selector in `setCurtainFabric` (~3765, change `.curtain-swatch` → `.curtain-fab-card`).

**Interfaces:**
- Consumes: `CURTAIN_FABRICS`, `setCurtainFabric(id)`, `curtainState.fabric`.
- Produces: 9 fabric cards keeping `id="cfab-<id>"` and class `curtain-fab-card`, each = swatch dot + name + descriptor. The fabric active-toggle (clear-all) selector becomes `.curtain-fab-card` everywhere it was `.curtain-swatch`.

- [ ] **Step 1: Replace the fabric render loop**

Replace the body of the `if (row) { ... }` block in `_initCurtainFabricSwatches` (the `row.innerHTML=''` + the `CURTAIN_FABRICS.forEach(...)` loop, ~lines 3508-3524) with:

```js
    row.innerHTML = '';
    const FAB_DESC = { linen:'natural slub', cotton:'soft matte', velvet:'luxe pile', silk:'lustrous',
      voile:'sheer airy', 'cotton-blend':'easy care', wool:'warm dense', jacquard:'woven pattern', blackout:'room-darkening' };
    CURTAIN_FABRICS.forEach(f => {
      const card = document.createElement('button');
      card.className = 'curtain-fab-card' + (f.id === curtainState.fabric ? ' active' : '');
      card.id = 'cfab-' + f.id;
      card.title = f.label;
      card.onclick = () => setCurtainFabric(f.id);
      const dot = document.createElement('span');
      dot.className = 'curtain-fab-dot';
      dot.style.background = f.swatch;
      const txt = document.createElement('span');
      txt.className = 'curtain-fab-text';
      const nm = document.createElement('span');
      nm.className = 'curtain-fab-name';
      nm.textContent = f.label;
      const ds = document.createElement('span');
      ds.className = 'curtain-fab-desc';
      ds.textContent = FAB_DESC[f.id] || '';
      txt.appendChild(nm); txt.appendChild(ds);
      card.appendChild(dot); card.appendChild(txt);
      row.appendChild(card);
    });
```

- [ ] **Step 2: Update `setCurtainFabric`'s clear-active selector**

In `setCurtainFabric` (~line 3765), change:

```js
  document.querySelectorAll('.curtain-swatch').forEach(b => b.classList.remove('active'));
```
to:
```js
  document.querySelectorAll('.curtain-fab-card').forEach(b => b.classList.remove('active'));
```

- [ ] **Step 3: Replace `.curtain-fabric-row` CSS + add card styles**

Replace the `.curtain-fabric-row{...}` rule (~line 212) and the now-unused `.curtain-swatch*` rules (213-216) with:

```css
.curtain-fabric-row{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.curtain-fab-card{display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid var(--border);background:var(--surface);border-radius:8px;cursor:pointer;transition:all .15s;text-align:left;font-family:var(--font-b)}
.curtain-fab-card:hover:not(.active){border-color:var(--border-strong);background:var(--bg)}
.curtain-fab-card.active{border-color:var(--accent);background:var(--accent-pale)}
.curtain-fab-dot{width:20px;height:20px;border-radius:50%;flex-shrink:0;border:1px solid rgba(0,0,0,.12)}
.curtain-fab-text{display:flex;flex-direction:column;line-height:1.15;min-width:0}
.curtain-fab-name{font-size:10.5px;font-weight:600;color:var(--text)}
.curtain-fab-desc{font-size:8.5px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
```

- [ ] **Step 4: Verify cards render + selection works**

Run: `node scratchpad/phase3-probe.mjs`
Expected: `STRUCT` shows `fabricCards:9`, `fabricDescs:9`; `CLICK` shows `velvetActive:true` (clicking the Velvet card toggles its active state and the others clear); `JS errors: none`. Open `phase3-panel.png` and confirm a 2-column grid of fabric cards each showing a colored dot + name + small descriptor, with the active card highlighted, and the color groups + sliders below unchanged.

- [ ] **Step 5: Commit** (on user go-ahead)

```bash
git add index.html
git commit -m "feat(curtains): fabric picker as cards with name + descriptor"
```

---

## Self-Review

**Spec coverage (Phase 3):**
- Style preview tiles with SVG, grouped Drapery/Shades → Task 1. ✓
- None as a separate clear control → Task 1 (`.curtain-shape-none`). ✓
- Fabric cards: swatch + name + 2-word descriptor → Task 2. ✓
- Color groups + size sliders unchanged → explicitly out of scope (constraints). ✓
- Stylized SVG/CSS, no 3D thumbnails → Task 1 inline SVG. ✓
- No behavioral regression: id/class contracts preserved; `setCurtainShape` unchanged; `setCurtainFabric` selector updated in lockstep with the card class. ✓

**Placeholder scan:** none — full markup, CSS, and JS provided.

**Type consistency:** style buttons keep `cshape-<id>` + `curtain-shape-btn`; fabric cards use `cfab-<id>` + `curtain-fab-card`, and the clear-active selector is updated to `.curtain-fab-card` in both `_initCurtainFabricSwatches` (only renders; clearing happens in setter) and `setCurtainFabric`. `FAB_DESC` keys match all 9 fabric ids including `cotton-blend`.

**Out of scope:** color data/render, size sliders, the bottom fabric bar, all 3D/material code.
