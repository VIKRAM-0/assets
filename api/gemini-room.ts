import { GoogleGenAI } from '@google/genai';

const PROMPT = `You are a photorealistic interior design visualizer. You will receive two images.

IMAGE 1 = the user's real room photograph.
IMAGE 2 = a 3D scene showing the configured furniture (sofa, chair, or both) with the exact custom fabrics and materials the user has chosen.

YOUR TASK: Produce a single photorealistic image of IMAGE 1's room with the furniture from IMAGE 2 placed naturally inside it.

WHAT YOU MUST PRESERVE FROM IMAGE 2 — FABRIC AND DESIGN:
- The fabric pattern, color, weave, and texture of every furniture piece must be preserved exactly as shown in IMAGE 2.
- You may adapt how the fabric is lit (shadows, highlights, shading) to match the real room's lighting — but the underlying pattern, color, and design must NOT change.
- Think of it this way: the fabric design is fixed; only the lighting on top of it adapts to the room.

WHAT YOU MUST PRESERVE FROM IMAGE 1 — THE ROOM:
- Walls, floor, ceiling, windows, doors, light fixtures, baseboards — all must look identical to IMAGE 1.
- Do not apply any color grading, filters, or style changes to the room.

STEPS:
1. If IMAGE 1 has any moveable furniture (sofas, chairs, beds, tables, rugs, floor lamps, cushions, objects), remove them — keep only permanent architecture.
2. Place all furniture pieces from IMAGE 2 (there may be a sofa, an accent chair, or both) into the cleared room at natural positions with correct floor contact, realistic perspective, and a soft contact shadow.
3. Render the furniture photorealistically under the room's lighting — but with the exact same fabric pattern and color from IMAGE 2 intact.

Output exactly one photorealistic image: IMAGE 1's room with IMAGE 2's furniture placed inside it, fabric designs unchanged.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomPhoto, furnitureRender } = req.body || {};
  if (!roomPhoto || !furnitureRender) {
    return res.status(400).json({ error: 'Missing roomPhoto or furnitureRender' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY environment variable' });
  }

  // Strip data URL prefix if present
  const roomBase64 = roomPhoto.replace(/^data:image\/[a-z]+;base64,/, '');
  const furnBase64 = furnitureRender.replace(/^data:image\/[a-z]+;base64,/, '');

  // Detect mime type from prefix
  const roomMime = roomPhoto.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const furnMime = furnitureRender.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          { inlineData: { data: roomBase64,  mimeType: roomMime } },
          { inlineData: { data: furnBase64,  mimeType: furnMime } },
          { text: PROMPT },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        generatedImageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!generatedImageUrl) {
      return res.status(500).json({ error: 'No generated image returned from Gemini' });
    }

    return res.status(200).json({ imageUrl: generatedImageUrl });
  } catch (error: any) {
    console.error('gemini-room error:', error);
    return res.status(500).json({ error: error?.message || 'Failed to generate image' });
  }
}
