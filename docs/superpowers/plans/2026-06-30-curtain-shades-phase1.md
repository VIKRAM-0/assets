# Curtain Shades Phase 1 — Blinds & Roman Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the procedural Blinds and Roman shades so they read as professional window treatments instead of CAD-like planes.

**Architecture:** All procedural, no new GLB assets. Blinds become solid slats (boxes with real thickness) on a slim headrail + bottom rail with ladder cords; Roman becomes a flat-fold panel with crisp dowel ridges. Both reuse the existing `_curtainPanelFrame(offset)` orientation helper (snaps square to the wall — prevents the z-fighting fixed earlier) and the existing dispose/apply/size hooks. Spec: `docs/superpowers/specs/2026-06-30-curtain-shades-catalog-ui-design.md`.

**Tech Stack:** Three.js r128 (hard lock), single-file `index.html`, headless CDP verification harness (chrome-headless-shell via Node WebSocket) against `localhost:5173` (dev-proxy → prod S3).

## Global Constraints

- Three.js **r128** only — `MeshStandardMaterial`/`MeshPhysicalMaterial`, `BoxGeometry`, `CylinderGeometry`, `PlaneGeometry`; no post-r128 APIs.
- All edits land in `index.html`. Keep the shade builders grouped where they already live (`_buildBlindsGeometry` ~line 3855, `_buildRomanGeometry` ~line 3918).
- Reuse `_curtainPanelFrame(offset)` (line 3840) for orientation+position — do NOT reintroduce a raw `_curtainFace` basis (that caused the z-fight).
- Procedural geometry must clear the window glass plane: backmost world-X of the group **< 2.043** (measured glass plane). Verify by measurement, not screenshot (swiftshader does not render z-fighting).
- App renders on-demand: every verification screenshot must follow an explicit `renderer.render(scene,camera)`.
- Blinds keep the fixed tilt `BLINDS_TILT` (line 3821); no tilt slider.
- Both shades must keep working across width/length size factors and restore the Drape mesh when the style switches away (existing `_applyCurtainMaterial`/`_applyCurtainSize` hooks — unchanged by this plan).
- **Commits are gated on explicit user go-ahead** (repo rule). Each task ends with a commit step; run it only when the user says to commit. We are on `main` — branch first if committing.

---

## Verification harness (shared)

Create one reusable probe script used by every task's test step. It drives the app through the real code path and dumps geometry/material facts as JSON.

**File:** `scratchpad/phase1-probe.mjs` (in the session scratchpad dir)

```js
// Usage: node phase1-probe.mjs <shape>   e.g. node phase1-probe.mjs blinds
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
const SHAPE = process.argv[2] || 'blinds';
const CHROME='/Users/bhartendukodes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const URL='http://localhost:5173/';
const OUT='/private/tmp/claude-501/-Users-bhartendukodes-Livi-asset-designer-dev/bdf5c7ff-6adb-4e47-af6d-8a477b72276e/scratchpad';
const PORT=9371;
const chrome=spawn(CHROME,['--headless=new',`--remote-debugging-port=${PORT}`,'--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage','--disable-gpu-sandbox','--window-size=1500,950','--hide-scrollbars','about:blank'],{stdio:['ignore','pipe','pipe']});
chrome.stderr.on('data',()=>{});
async function gt(){for(let i=0;i<40;i++){try{const r=await fetch(`http://127.0.0.1:${PORT}/json/list`);const p=(await r.json()).find(t=>t.type==='page');if(p?.webSocketDebuggerUrl)return p.webSocketDebuggerUrl;}catch{}await sleep(250);}throw new Error('no target');}
const ws=new WebSocket(await gt());let id=0;const pend=new Map();
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}});
await new Promise(r=>ws.addEventListener('open',r));
const send=(m,p={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
const evel=async e=>(await send('Runtime.evaluate',{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value;
async function shot(n){await evel(`(()=>{renderer.render(scene,camera);return 1;})()`);await sleep(150);const s=await send('Page.captureScreenshot',{format:'png'});if(s.result?.data)fs.writeFileSync(`${OUT}/${n}.png`,Buffer.from(s.result.data,'base64'));}
const errs=[];await send('Page.enable');await send('Runtime.enable');
ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);if(m.method==='Runtime.exceptionThrown')errs.push(JSON.stringify(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text));});
await send('Page.navigate',{url:URL});await sleep(4500);
await evel(`(async()=>{if(!roomMode)toggleRoomView();setRoomSection('bedroom');const t0=Date.now();while(Date.now()-t0<85000){const e=curtainMeshEntries;if(e.length&&e[0].mesh&&e[0].mesh.material){const mm=Array.isArray(e[0].mesh.material)?e[0].mesh.material[0]:e[0].mesh.material;if(mm&&mm.map)break;}await new Promise(r=>setTimeout(r,500));}return 'ready';})()`);
await evel(`(()=>{[...document.querySelectorAll('button')].forEach(b=>{if(/^\\s*skip\\s*$/i.test(b.textContent||''))b.click();});return 1;})()`);
await sleep(600);
await evel(`(async()=>{setCurtainFabric('linen');setCurtainShape('${SHAPE}');setCurtainColor('#8a6a42');const t0=Date.now();while(Date.now()-t0<20000){const g=(${SHAPE==='roman'?'_romanGroup':'_blindsGroup'});if(g)break;await new Promise(r=>setTimeout(r,300));}await new Promise(r=>setTimeout(r,1400));return 1;})()`);
const facts = await evel(`(()=>{
  const g = ${SHAPE==='roman'?'_romanGroup':'_blindsGroup'};
  if(!g) return JSON.stringify({error:'group null'});
  const bb=new THREE.Box3().setFromObject(g); const s=bb.getSize(new THREE.Vector3());
  const byType={}; g.traverse(o=>{ if(o.geometry){const t=o.geometry.type; byType[t]=(byType[t]||0)+1;} });
  const drapeVisible = curtainMeshEntries.some(e=>e.mesh.visible);
  return JSON.stringify({
    geomCounts: byType,
    sizeWHD:[+s.x.toFixed(3),+s.y.toFixed(3),+s.z.toFixed(3)],
    backX:+bb.max.x.toFixed(3), clearsGlass: bb.max.x < 2.043,
    childMeshes: g.children.length,
    drapeVisible
  });
})()`);
console.log('FACTS', facts);
// resize stress
await evel(`(async()=>{setCurtainSize('width',1.3);setCurtainSize('length',0.8);await new Promise(r=>setTimeout(r,900));return 1;})()`);
console.log('RESIZE', await evel(`(()=>{const g=${SHAPE==='roman'?'_romanGroup':'_blindsGroup'};const bb=new THREE.Box3().setFromObject(g);return JSON.stringify({backX:+bb.max.x.toFixed(3),clearsGlass:bb.max.x<2.043});})()`));
await evel(`(async()=>{setCurtainSize('width',1);setCurtainSize('length',1);await new Promise(r=>setTimeout(r,400));return 1;})()`);
await shot('phase1-'+SHAPE);
console.log('JS errors:', errs.length?errs.join(' | '):'none');
ws.close();chrome.kill();process.exit(0);
```

The dev-proxy must be running: `UPSTREAM=https://asset-designer-dev.vercel.app PORT=5173 node dev-proxy.mjs`.

---

## Task 1: Blinds — solid slats + slim rails (faux-wood)

Replace zero-thickness `PlaneGeometry` slats and the chunky valance with real 2″ louvers (boxes with thickness) on a slim headrail + bottom rail.

**Files:**
- Modify: `index.html` — `_buildBlindsGeometry` (function at ~line 3855, replace its body from the `slatMat`/`count`/loop/rail section through `scene.add(grp)`; keep the dispose + frame setup at the top).

**Interfaces:**
- Consumes: `_curtainPanelFrame(offset)` → `{position, quaternion}`; `_curtainBaseBox` (`{center,size}`); `curtainState.{color,widthFactor,lengthFactor}`; `BLINDS_TILT`.
- Produces: `_blindsGroup` (THREE.Group) with `userData.slatMat` + `userData.railMat` (so `_applyCurtainColor`'s blinds branch keeps working — it sets `slatMat.color` / `railMat.color`). Slat children use `BoxGeometry`. Group backmost world-X < 2.043.

- [ ] **Step 1: Write the failing test** — save the shared harness above as `scratchpad/phase1-probe.mjs`.

- [ ] **Step 2: Run it against current code to capture the BEFORE state**

Run: `node scratchpad/phase1-probe.mjs blinds`
Expected (current code): `geomCounts` shows `PlaneGeometry` slats + one `BoxGeometry` (the valance). This is the state we are replacing. Note `clearsGlass:true` already (frame fix).

- [ ] **Step 3: Replace the blinds material + geometry build**

In `_buildBlindsGeometry`, keep the top (dispose, early-returns, `wf/lf/sz/width/height`, `grp`, `frame`) and replace everything from `const slatMat = ...` down to (but not including) `grp.userData.slatMat = ...` with:

```js
  // Faux-wood louvers: solid boxes (real thickness) so edges catch light.
  const slatMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(curtainState.color), roughness: 0.62, metalness: 0,
  });
  const railMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(curtainState.color).multiplyScalar(0.7), roughness: 0.7, metalness: 0,
  });

  const tilt      = BLINDS_TILT;
  const slatDepth = 0.05;                         // 2" louver (front-to-back when flat)
  const thickness = 0.004;                        // ~3-4 mm
  const projPitch = Math.max(0.02, slatDepth * Math.cos(tilt)); // visible vertical pitch when tilted
  const count     = Math.min(60, Math.max(16, Math.round(height / projPitch)));
  const pitch     = height / count;

  // Box local axes: X = louver length (window width), Y = thickness, Z = louver depth.
  const slatGeo = new THREE.BoxGeometry(width, thickness, slatDepth);
  for (let i = 0; i < count; i++) {
    const slat = new THREE.Mesh(slatGeo, slatMat);
    slat.position.y = height / 2 - pitch * (i + 0.5);
    slat.rotation.x = tilt;                        // tilt about the louver's long axis
    slat.castShadow = true; slat.receiveShadow = true;
    grp.add(slat);
  }

  // Slim headrail (top) + heavier bottom rail — both solid boxes, depth kept small to stay clear of glass.
  const headrail = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.05, 0.06), railMat);
  headrail.position.y = height / 2 + 0.03;
  headrail.castShadow = true; headrail.receiveShadow = true;
  grp.add(headrail);

  const bottomrail = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.03, slatDepth * 0.7), railMat);
  bottomrail.position.y = -height / 2 - 0.015;
  bottomrail.castShadow = true; bottomrail.receiveShadow = true;
  grp.add(bottomrail);
```

(The existing `grp.userData.slatMat = slatMat; grp.userData.railMat = railMat; _blindsGroup = grp; scene.add(grp);` lines stay as-is at the end.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `node scratchpad/phase1-probe.mjs blinds`
Expected:
- `geomCounts` shows `BoxGeometry` for slats (count 16–60) + 2 rail boxes; NO `PlaneGeometry`.
- `clearsGlass:true` in both `FACTS` and `RESIZE`.
- `drapeVisible:false`.
- `JS errors: none`.
- Open `scratchpad/phase1-blinds.png` and confirm: solid louvers with visible thickness/edges, slim rails (no chunky valance), inter-slat shadows.

- [ ] **Step 5: Commit** (only on user go-ahead; branch first if on `main`)

```bash
git add index.html
git commit -m "feat(curtains): rebuild blinds as solid faux-wood louvers with slim rails"
```

---

## Task 2: Blinds — ladder cords

Add the two vertical ladder cords that make blinds read as real.

**Files:**
- Modify: `index.html` — `_buildBlindsGeometry` (append cord meshes after the bottom rail, before the `userData`/`scene.add` lines).

**Interfaces:**
- Consumes: `grp`, `width`, `height`, `slatDepth`, `tilt` from Task 1's scope (same function).
- Produces: 2 `CylinderGeometry` cord meshes parented to `grp`, sitting toward the room side so they render in front of the louvers. A `cordMat` stored on `grp.userData.cordMat`.

- [ ] **Step 1: Write the failing test** — extend the probe expectation: `geomCounts` must include `CylinderGeometry: 2`. Run current code to confirm it's absent:

Run: `node scratchpad/phase1-probe.mjs blinds`
Expected: `geomCounts` has NO `CylinderGeometry`.

- [ ] **Step 2: Add the cords**

In `_buildBlindsGeometry`, immediately after the `bottomrail` block and before `grp.userData.slatMat = ...`, insert:

```js
  // Ladder cords down the face (toward the room) — the detail that sells "real blinds".
  const cordMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xeae6dc), roughness: 0.8, metalness: 0 });
  const cordLen = height + 0.06;
  const cordGeo = new THREE.CylinderGeometry(0.004, 0.004, cordLen, 6); // axis = local Y (vertical)
  for (const xf of [-0.28, 0.28]) {
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.set(width * xf, 0, slatDepth * 0.5 + 0.005); // +Z = toward room, in front of louvers
    grp.add(cord);
  }
  grp.userData.cordMat = cordMat;
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `node scratchpad/phase1-probe.mjs blinds`
Expected:
- `geomCounts` includes `CylinderGeometry: 2`.
- `clearsGlass:true` still holds (cords are toward the room, not the wall).
- `JS errors: none`.
- `scratchpad/phase1-blinds.png`: two light vertical cords visible over the louvers.

- [ ] **Step 4: Update dispose if needed**

Verify `_disposeBlinds` (line 3823) disposes the whole group via `traverse(o=>o.geometry&&o.geometry.dispose())` and the stored materials. If `cordMat` is not disposed, add `if (_blindsGroup.userData.cordMat) _blindsGroup.userData.cordMat.dispose();` alongside the existing `slatMat`/`railMat` disposal. Re-run `node scratchpad/phase1-probe.mjs blinds` and confirm `JS errors: none`.

- [ ] **Step 5: Commit** (only on user go-ahead)

```bash
git add index.html
git commit -m "feat(curtains): add ladder cords to procedural blinds"
```

---

## Task 3: Roman — flat-fold panel with dowel ridges

Replace the soft sine ripple with a flat-fold profile: a mostly-flat panel bulging toward the room with crisp horizontal dowel ridges at each fold seam.

**Files:**
- Modify: `index.html` — `_buildRomanGeometry` (function at ~line 3918; replace the displacement loop that currently does `pos.setZ(i, foldDepth * Math.sin(phase * Math.PI))` and the `numFolds`/`foldDepth` constants).

**Interfaces:**
- Consumes: `keepMat` (the reused fabric material), `_curtainBaseBox`, `_curtainPanelFrame(offset)`, `curtainState.{color,widthFactor,lengthFactor}`.
- Produces: `_romanGroup` with `userData.mat` (reused fabric material — unchanged) + `userData.railMat`. Panel uses `PlaneGeometry` with ridge displacement toward +Z (room). Group backmost world-X < 2.043.

- [ ] **Step 1: Run the probe to capture BEFORE state**

Run: `node scratchpad/phase1-probe.mjs roman`
Expected (current): one `PlaneGeometry` + one `BoxGeometry` rail; `clearsGlass:true`. The fold profile is a soft single bulge per band (we are sharpening it).

- [ ] **Step 2: Replace the fold displacement**

In `_buildRomanGeometry`, replace the segment-count + displacement section. Change the `PlaneGeometry` segment count and the fold loop. Find:

```js
  const geo = new THREE.PlaneGeometry(width, height, 24, 96);
  const pos = geo.attributes.position;
  const numFolds  = Math.max(4, Math.round(height / 0.42));
  const foldDepth = Math.min(0.09, height * 0.05);
  for (let i = 0; i < pos.count; i++) {
    const v = (pos.getY(i) + height / 2) / height; // 0 bottom .. 1 top
    const phase = (v * numFolds) % 1;
    pos.setZ(i, foldDepth * Math.sin(phase * Math.PI)); // one bulge per fold
  }
```

Replace with:

```js
  const geo = new THREE.PlaneGeometry(width, height, 8, 160); // denser vertical segments for crisp ridges
  const pos = geo.attributes.position;
  const numFolds  = Math.min(9, Math.max(4, Math.round(height / 0.30)));
  const foldH     = height / numFolds;
  const ridgeDepth = Math.min(0.06, foldH * 0.28);  // how far each dowel ridge bulges toward the room
  const baseBow    = Math.min(0.015, height * 0.008); // gentle overall outward bow so it isn't a flat board
  for (let i = 0; i < pos.count; i++) {
    const yy = pos.getY(i);                          // -height/2 .. height/2
    const up = (yy + height / 2);                    // 0 bottom .. height top
    const seam = (up / foldH) % 1;                   // 0 at a seam, rises to 1 at next seam
    const d = Math.min(seam, 1 - seam);              // distance to nearest seam (0 = on the ridge)
    const ridge = ridgeDepth * Math.exp(-Math.pow(d / 0.16, 2)); // gaussian bump centred on the seam
    const bow   = baseBow * Math.sin((up / height) * Math.PI);
    pos.setZ(i, ridge + bow);                        // +Z = toward room (away from glass)
  }
```

(Keep the following `pos.needsUpdate = true; geo.computeVertexNormals();` and the rest of the function — `_curtainPanelFrame`, panel mesh, railMat/rail, userData, `scene.add` — unchanged.)

- [ ] **Step 3: Run the test to verify it passes**

Run: `node scratchpad/phase1-probe.mjs roman`
Expected:
- `geomCounts`: one `PlaneGeometry` + one `BoxGeometry` (rail).
- `clearsGlass:true` in `FACTS` and `RESIZE` (ridges bulge toward the room, +Z, never toward glass).
- `JS errors: none`.
- `scratchpad/phase1-roman.png`: a mostly-flat fabric panel with crisp evenly-spaced horizontal ridges (flat-fold roman look), correct fabric texture/color — not a soft wavy ripple.

- [ ] **Step 4: Visual cross-check across fabrics/colors**

Run the probe twice more editing the harness `setCurtainFabric`/`setCurtainColor` calls to `velvet`+`#6a2a3a` and `cotton`+`#36454f`; confirm folds + material read correctly and `clearsGlass:true` each time.

- [ ] **Step 5: Commit** (only on user go-ahead)

```bash
git add index.html
git commit -m "feat(curtains): rebuild roman as flat-fold panel with dowel ridges"
```

---

## Self-Review

**Spec coverage (Phase 1 only):**
- Blinds slat thickness → Task 1 (BoxGeometry). ✓
- 2″ standard slat width → Task 1 (`slatDepth=0.05`). ✓
- Slim headrail + bottom rail (replace chunky valance) → Task 1. ✓
- Ladder cords → Task 2. ✓
- Faux-wood material → Task 1 (`roughness 0.62`, `metalness 0`). ✓
- Fixed tilt → Task 1 (`BLINDS_TILT`). ✓
- Roman flat-fold + dowel ridges + reuse fabric material → Task 3. ✓
- Depth safety (clears glass) → every task's test asserts `clearsGlass`. ✓
- Flex across size factors → probe `RESIZE` check. ✓
- Drape restores on switch → out of scope for these builders (unchanged hooks); spot-checked via `drapeVisible:false` while a shade is active.

**Placeholder scan:** none — every code step has complete code and exact run commands.

**Type consistency:** `_blindsGroup.userData.slatMat/railMat/cordMat` and `_romanGroup.userData.mat/railMat` match the names used by `_applyCurtainColor` / `_disposeBlinds` / `_disposeRoman`. `_curtainPanelFrame(offset)` returns `{position,quaternion}` as consumed.

**Out of scope (Phase 1):** fabric catalog expansion, color palettes, UI previews (Phases 2 & 3 — separate plans).
