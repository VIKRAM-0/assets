import { GoogleGenAI } from '@google/genai';

const PROMPT = `You are a precise interior compositing tool. You will receive two images and must follow these rules without exception.

IMAGE 1 = the user's real room photograph.
IMAGE 2 = a 3D render of furniture with custom fabric/material that the user has configured.

ABSOLUTE CONSTRAINTS — violating any of these makes the output wrong:
- The fabric color, pattern, texture, and material of the furniture in your output must be IDENTICAL to IMAGE 2. Do not improve it, reinterpret it, make it "look more real", or substitute any color or texture. Copy it exactly.
- Every part of the room that is not furniture must look IDENTICAL to IMAGE 1: walls, floor, ceiling, windows, doors, light fixtures, baseboards, paint color, flooring material. Do not alter, enhance, or stylize the room in any way.
- Do not add any objects that are not in IMAGE 2 (no extra cushions, plants, rugs, lamps, artwork).
- Do not apply any artistic filter, style transfer, or color grading to either the room or the furniture.

YOUR ONLY TASK:
1. Look at IMAGE 1. If it contains any moveable furniture (sofas, chairs, beds, tables, rugs, floor lamps, cushions, decorative objects), erase those items so the room is empty — keeping only the permanent architecture.
2. Take the furniture shown in IMAGE 2 and place it in the cleared area of IMAGE 1 at a natural position with correct floor contact and a subtle shadow. Scale it to realistic proportions relative to the room.
3. The furniture's appearance (fabric, color, texture) must match IMAGE 2 exactly — the only change is that it now sits inside the real room from IMAGE 1.

Output exactly one image: the real room from IMAGE 1 with only the furniture from IMAGE 2 placed inside it.`;

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
