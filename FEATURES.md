# LIVINIT Fabric Configurator — Feature Guide

A complete guide to every feature in the app. No technical background needed.

---

## Table of Contents

1. [App Layout](#1-app-layout)
2. [Switching Between Armchair and Sofa](#2-switching-between-armchair-and-sofa)
3. [Browsing the Fabric Library](#3-browsing-the-fabric-library)
4. [Selecting Parts to Fabric](#4-selecting-parts-to-apply-fabric-to)
5. [Applying a Fabric — Click](#5-applying-a-fabric--click)
6. [Applying a Fabric — Drag and Drop](#6-applying-a-fabric--drag-and-drop)
7. [Material Adjustment Sliders](#7-material-adjustment-sliders)
8. [Replace Texture with Your Own Image](#8-replace-texture-with-your-own-image)
9. [Fabric Finder — Search Online Fabrics](#9-fabric-finder--search-online-fabrics)
10. [Fabric Finder — AI Analysis from Your Photo](#10-fabric-finder--ai-analysis-from-your-photo)
11. [My Fabrics — Your Custom Collection](#11-my-fabrics--your-custom-collection)
12. [Upload Your Own 3D Model](#12-upload-your-own-3d-model)
13. [Room View](#13-room-view)
14. [Room Elements Toggles](#14-room-elements-toggles)
15. [Explode View](#15-explode-view)
16. [AI Render](#16-ai-render)
17. [Export GLB](#17-export-glb)
18. [Viewport Navigation](#18-viewport-navigation)

---

## 1. App Layout

The app has three panels:

```
┌─────────────────┬──────────────────────────┬──────────────────┐
│   LEFT PANEL    │       3D VIEWPORT         │   RIGHT PANEL    │
│                 │                           │                  │
│  Fabric Library │   Your 3D furniture       │  Parts list      │
│  (swatches,     │   model, lit and          │  Applied fabric  │
│  series, search)│   rotatable               │  Sliders         │
│                 │                           │                  │
└─────────────────┴──────────────────────────┴──────────────────┘
```

At the very top there is a thin toolbar with:
- **Armchair / Sofa** tabs — switch models
- **Upload GLB** button — load your own 3D model
- **Room View** button — place the furniture in a staged living room
- **Render** button — generate an AI photorealistic image
- **Export** button — download the configured model as a `.glb` file

---

## 2. Switching Between Armchair and Sofa

Click the **Armchair** or **Sofa** tab at the top of the screen.

- The 3D model in the viewport switches instantly.
- The fabric library in the left panel updates to show fabrics specific to that model.
- Any fabric you applied to one model is **remembered** — switching back restores your previous material selections.

---

## 3. Browsing the Fabric Library

The left panel shows all available fabrics grouped into **series** (collections).

**To browse:**
1. Each series name is a collapsible header — click it to expand or collapse that group.
2. Fabrics within a group are shown as small square swatches in a grid.
3. Hover over a swatch to see it enlarge slightly.
4. The swatch image shows the real fabric texture/pattern.

**Vendor collections available:**

| Model | Vendor | Series Examples |
|-------|--------|-----------------|
| Armchair | MityLite Sierra | Abilene, Amarillo, Amuse, Anchor, Archetype, Artisanal EPU, Berwick Tweed, Beso, Bestie, Faux Wood, and more |
| Sofa | Douglass Fabrics | Kaleidoscope Neo, Twist |
| Sofa | Ennis Fabrics | Linum, Challenger |

Custom fabrics you add via the Fabric Finder also appear here under **My Fabrics**.

---

## 4. Selecting Parts to Apply Fabric To

Before applying a fabric, choose **which parts** of the furniture you want to change.

In the **right panel**, under **Parts**, you will see a checkbox list of all the mesh parts detected on the model (e.g., Seat Cushion, Backrest, Left Armrest, Legs/Base).

- **Check** a part to include it in the next fabric apply.
- **Uncheck** a part to exclude it.
- Click **All** to select every part at once.
- Click **None** to deselect everything.

> If you try to apply a fabric with no parts selected, a message will prompt you to select a part first.

---

## 5. Applying a Fabric — Click

1. In the right panel **Parts** section, check the parts you want to change.
2. In the left panel, click any fabric swatch.
3. The fabric is immediately applied to all checked parts in the viewport.
4. The **Applied Material** section in the right panel updates to show the fabric name and a thumbnail preview.

The clicked swatch gets a highlighted border to show it is currently active.

---

## 6. Applying a Fabric — Drag and Drop

Drag-and-drop lets you apply a fabric to one specific part without using the checkboxes.

1. **Click and hold** any swatch in the left panel — a floating ghost image follows your cursor.
2. **Drag** the ghost over the 3D furniture in the viewport.
3. The part under your cursor **glows green** to show it will receive the fabric.
4. **Release** the mouse button to apply the fabric to that specific part only.

> Drag-and-drop ignores the checkbox selection — it always applies to the part under the cursor.

---

## 7. Material Adjustment Sliders

After applying a fabric, fine-tune how it looks using the sliders in the **Material Adjustments** section of the right panel.

| Slider | What It Does | Range |
|--------|-------------|-------|
| **Brightness** | Makes the fabric lighter or darker overall | 0.01 – 2.00 |
| **Roughness** | Low = shiny/glossy surface. High = matte/dull surface | 0 – 1 |
| **Metalness** | Adds a metallic reflective quality (keep near 0 for fabrics) | 0 – 1 |
| **Fabric Fuzz** | Adds a soft sheen effect, like velvet or suede | 0 – 1 |
| **Pattern Scale** | Makes the fabric pattern larger or smaller on the surface | 0.5 – 20 |
| **Bump Strength** | How pronounced the surface texture detail (weave, grain) appears | 0 – 3 |

All sliders update the 3D view **in real time** as you drag them.

---

## 8. Replace Texture with Your Own Image

Already applied a fabric but want to use a different color or pattern image? You can replace just the **color/diffuse texture** while keeping the fabric's surface detail (normal map, roughness, weave structure).

**How to use:**
1. Apply any fabric to your desired parts (see sections 5 or 6 above).
2. In the right panel, look at the **Applied Material** section.
3. A small **image icon button** ( `⊞` ) appears to the right of the fabric swatch thumbnail.
4. Click it — a file picker opens.
5. Select any image from your computer (JPG, PNG, WebP, etc.).
6. The image is applied as the new color texture on all currently-selected parts.

**What stays the same:**
- Normal map (surface detail / weave depth)
- Roughness map (how light scatters across the surface)
- All slider values (brightness, fabric fuzz, scale, etc.)

**What changes:**
- The color and pattern — now your uploaded photo

This is ideal when you have a fabric sample photo or a specific color swatch image you want to visualize on the furniture.

---

## 9. Fabric Finder — Search Online Fabrics

The Fabric Finder lets you search thousands of real fabric textures from **PolyHaven** and **AmbientCG** and add them to your library.

**To open:** Click the **+ Add Fabric** button at the top of the left panel.

**Search mode (no image uploaded):**

1. In the **left column** of the modal, type a keyword in the **Name / Description** field — e.g., `dark linen`, `leather`, `woven cotton`.
2. Optionally pick a **Material Type** from the dropdown (Fabric, Leather, Carpet, etc.).
3. Or click one of the **Quick Filter chips** (Fabric, Leather, Carpet, Woven, Knit, Dark) for instant preset searches.
4. Click **Search Fabrics**.
5. The **right column** shows a grid of matching results with thumbnails.
6. Click any result card — it is added to your **My Fabrics** library automatically.

**What gets added:**
- The fabric's diffuse/color texture
- Its normal map and roughness map from the source library
- It appears immediately in **My Fabrics** in the left panel, ready to apply

> If nothing matches your keyword, the result area will say "No assets found for [query]".

---

## 10. Fabric Finder — AI Analysis from Your Photo

If you have a photo of a fabric you like — a shirt, a sofa in a magazine, a fabric swatch photo — you can upload it and let the AI detect its properties.

**How to use:**
1. Click **+ Add Fabric** to open the Fabric Finder.
2. In the **left column**, either:
   - **Drag and drop** your photo onto the drop zone, or
   - Click **Choose File** to browse and select an image.
3. A preview of your image appears in the drop zone.
4. The right column shows detected properties:
   - **Color** — hex value with a color dot
   - **Material Type** — e.g., linen, velvet, leather
   - **Roughness** — detected surface roughness level
   - **Texture Scale** — suggested pattern scale
5. You can edit the **Name**, **Material Type**, and **Scale** fields to adjust.
6. Click **Save as Material** to add it to **My Fabrics**.
7. Or click **Generate Preview Material** to apply it directly and see it on the furniture.

**What happens technically:**
- Your image is sent to Google Gemini AI, which reads the texture and surface qualities.
- The normal map and roughness map are sourced from PolyHaven based on the detected material type.
- Your photo becomes the diffuse texture; the AI-matched PBR maps handle depth and reflectivity.

**To clear an uploaded image:** Click the **×** button on the image preview to remove it and return to search mode.

---

## 11. My Fabrics — Your Custom Collection

Every fabric you add through the Fabric Finder (via search or AI analysis) is saved to the **My Fabrics** section at the top of the left panel.

- My Fabrics appears as its own collapsible group above the vendor collections.
- Custom fabrics are available for **both the Armchair and Sofa** — they are shared across all models.
- Apply them exactly like any other swatch (click or drag-and-drop).

> Custom fabrics are stored in memory for the current session. Refreshing the page clears them. Export your GLB before refreshing if you want to keep the textures.

---

## 12. Upload Your Own 3D Model

You can replace the default chair or sofa with any GLB model of your own.

**How to use:**
1. Click the **↑ GLB** button in the top toolbar.
2. A file picker opens — select a `.glb` file from your computer.
3. The model loads into the viewport, replacing the current furniture.
4. All fabric application and slider features work the same on your custom model.

**Tips:**
- GLB files with Draco mesh compression are supported.
- The app auto-scales and centers your model regardless of original size.
- Part names are detected automatically based on mesh geometry — complex assemblies may be labeled generically (e.g., "Main Body 1", "Main Body 2").

---

## 13. Room View

Room View places your configured furniture inside a fully staged 3D living room so you can see how it looks in context.

**To enter Room View:**
1. Click the **Room View** button in the top toolbar (it turns highlighted when active).
2. Both the Armchair and Sofa load together inside the room scene.
3. The camera switches to a wider interior angle showing the whole space.

**In Room View, the right panel changes to show:**
- **Room Elements** — toggles for individual room parts (see section 14)
- **Explode View** — separates furniture parts (see section 15)
- **Furniture Parts** — click a furniture piece to select it, then apply fabrics from the left panel
- **Applied Material** — shows what fabric is on the selected piece, with the custom image replace button
- **Material Adjustments** — same sliders, apply to the selected piece

**Returning to Product View:**
Click the **Room View** button again to toggle back. All fabric selections are preserved.

---

## 14. Room Elements Toggles

In Room View, use the toggle chips in the right panel to show or hide individual parts of the room:

| Toggle | What It Controls |
|--------|-----------------|
| **Walls** | The wall surfaces of the room |
| **Floor** | The floor surface |
| **Windows** | Window frames and glass |
| **Doors** | Door frames and panels |
| **Rug** | The area rug / carpet |
| **Ceiling** | The ceiling surface |

- A **highlighted** chip = that element is currently visible.
- Click to toggle off (element hides); click again to toggle back on.

This is useful for rendering angles where a wall would block the camera, or to get a cleaner view of just the furniture.

---

## 15. Explode View

Explode View separates the furniture's individual parts outward from the center so you can inspect every component in detail.

**How to use:**
1. In Room View, find the **Explode View** section in the right panel.
2. Drag the **Explode** slider from 0 to 1 to spread the parts apart.
3. Setting it back to 0 reassembles the furniture.
4. Click **▶ Animate** for a smooth animated explode-and-reassemble sequence (1.2 seconds).

Useful for showing construction detail or checking that every part has the correct fabric applied.

---

## 16. AI Render

Generate a photorealistic image of your furniture using Google Gemini AI.

**How to use:**
1. Configure the furniture with your desired fabrics and adjustments.
2. Position the camera to your preferred angle.
3. Click the **Render** button in the top toolbar.
4. A loading indicator appears while the AI processes (typically 5–15 seconds).
5. The result displays as a full-screen overlay with a **Download** button.

**Two render modes:**

| Mode | When It's Used | Style |
|------|--------------|-------|
| **Product Render** | In standard product view | Staged showroom look, hero shot, clean background |
| **Room Render** | In Room View | Interior photography style, natural daylight, magazine quality |

**If the AI is unavailable:**
The app falls back gracefully — it captures a high-quality screenshot of the current 3D scene and shows that instead. All other features continue working normally.

---

## 17. Export GLB

Download your fully configured furniture as a `.glb` file, with all applied textures baked in.

**How to use:**
1. Apply all fabrics and adjustments as desired.
2. Click the **Export** button in the top toolbar.
3. The file downloads automatically as `chair_custom.glb` or `sofa_custom.glb`.

The exported file can be used in:
- Other 3D software (Blender, Maya, Cinema 4D)
- Web viewers and AR/VR tools
- Game engines (Unity, Unreal)
- Any tool that supports the GLB/glTF 2.0 format

---

## 18. Viewport Navigation

Control the camera in the 3D viewport with your mouse:

| Action | How |
|--------|-----|
| **Rotate / Orbit** | Click and drag with the **left mouse button** |
| **Pan** | Click and drag with the **right mouse button** |
| **Zoom** | Scroll the **mouse wheel** up/down |

The camera orbits around the furniture — the model always stays centered.

In Room View the camera starts at a wider living-room angle but the same controls apply.

---

## Quick Reference — Common Workflows

### Apply a fabric to the seat only
1. In **Parts**, uncheck all → check only **Seat Cushion**
2. Click any swatch in the left panel

### Apply different fabrics to different parts
1. Check only **Backrest** → click Fabric A
2. Check only **Armrests** → click Fabric B
3. Check only **Seat Cushion** → click Fabric C

### Use your own fabric photo
1. Click **+ Add Fabric** → upload your photo in the drop zone
2. AI detects the material properties
3. Click **Save as Material**
4. The fabric appears in My Fabrics — apply it like any other swatch

### Use your photo as the color for an existing fabric's texture maps
1. Apply any fabric (e.g., Cotton) to your desired parts
2. In **Applied Material**, click the image icon button
3. Select your photo — it becomes the color layer while Cotton's weave detail remains

### See the furniture in a room
1. Click **Room View**
2. Use Room Elements toggles to hide any walls blocking your view
3. Click **Render** for a photorealistic interior shot

### Download the result
1. Click **Export** to get the `.glb` file with all textures embedded
