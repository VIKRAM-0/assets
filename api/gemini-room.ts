import { GoogleGenAI } from '@google/genai';

const PROMPT = `You are a professional interior design visualizer.

I am providing two images in this order:
1. ROOM PHOTO: A real photograph of an interior room (may contain existing furniture)
2. FURNITURE RENDER: A 3D visualization of custom furniture with specific fabrics and materials

Your task is to produce a single photorealistic interior design image:

STEP 1 — Clear the room: Remove ALL moveable items from the ROOM PHOTO — sofas, chairs, beds, tables, rugs, lamps, floor plants, curtains, cushions, and any decorative objects. Preserve only the permanent architecture: walls, floor, ceiling, windows, doors, baseboards, and built-in shelving.

STEP 2 — Place the furniture: Position the furniture piece shown in the FURNITURE RENDER naturally inside the cleared room. Place it against the most appropriate wall or in a natural position on the floor. Scale it to real-world proportions.

STEP 3 — Match the environment: The placed furniture must match the existing lighting, color temperature, and camera perspective of the ROOM PHOTO. It must cast a realistic contact shadow on the floor. The result should look like the furniture was professionally photographed sitting in that real room.

STRICT RULES:
- Preserve the EXACT fabric color, texture, pattern, and material from the FURNITURE RENDER — do not change, improve, or substitute any material
- The floor, walls, ceiling, and windows must look identical to the ROOM PHOTO
- The result must be fully photorealistic — not 3D rendered or illustrated
- Output exactly one image: the room with the furniture placed inside it`;

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
