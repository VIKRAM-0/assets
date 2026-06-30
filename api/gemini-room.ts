import { GoogleGenAI } from '@google/genai';

const PROMPT = `You are a photorealistic interior design visualizer. You will receive two images.

IMAGE 1 = a real photograph of the user's room (may contain existing furniture).
IMAGE 2 = a clean 3D render of the furniture (sofa and/or accent chair) shown on a neutral background, with the exact custom fabrics and colors the user has chosen.

YOUR TASK: Produce a single photorealistic image of IMAGE 1's room with the furniture from IMAGE 2 placed naturally inside it.

RULES — READ CAREFULLY:

1. FURNITURE: Place only the sofa and/or chair shown in IMAGE 2. Do not add any other items — no coffee table, no plants, no rug, no bookcase, no cushions, no lamps, no decorations. Only what is visible in IMAGE 2.

2. FABRIC FIDELITY: The fabric color, pattern, texture, and weave of the sofa and chair must look exactly as they do in IMAGE 2. You may add realistic lighting and shadows on top of the fabric, but do not change the underlying color, pattern, or design. The fabric design is fixed.

3. ROOM: Remove any existing moveable furniture from IMAGE 1 (sofas, chairs, tables, rugs, lamps, cushions). Keep all permanent architecture: walls, floor, ceiling, windows, doors, fireplace, baseboards, wall art. Do not alter the room's colors, lighting, or style in any way.

4. REALISM: The placed furniture should look photorealistic — natural perspective, correct scale, floor contact, and soft shadow — as if professionally photographed inside IMAGE 1's room.

Output exactly one photorealistic image: IMAGE 1's room with only the furniture from IMAGE 2 placed inside it.`;

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
