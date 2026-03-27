import { Router, Request, Response } from 'express';
import { HfInference } from '@huggingface/inference';

const router = Router();

/**
 * Using Hugging Face Inference API — free tier, no billing required.
 * Model: stabilityai/stable-diffusion-xl-base-1.0 (text-to-image)
 * Free tier: ~1000 requests/day
 */
const HF_MODEL = 'stabilityai/stable-diffusion-xl-base-1.0';

const VALID_STYLES = ['cartoon', 'flat', 'anime', 'pixel', 'sketch'] as const;
type StyleType = (typeof VALID_STYLES)[number];

// Style-specific prompts — descriptive enough for text-to-image
const STYLE_PROMPTS: Record<StyleType, string> = {
  cartoon: 'cartoon illustration style, bold outlines, vibrant saturated colors, simplified features, fun animated look, high quality digital art, clipart',
  flat:    'flat design illustration, clean geometric shapes, minimal details, solid colors, no shadows, modern vector art style, clipart',
  anime:   'anime art style, large expressive eyes, clean line art, cel shading, vibrant colors, Japanese animation aesthetic, high quality, clipart',
  pixel:   'pixel art style, 16-bit retro video game aesthetic, limited color palette, visible pixels, nostalgic arcade game character, clipart',
  sketch:  'pencil sketch illustration, hand-drawn lines, cross-hatching shading, artistic sketch style, black and white with subtle tones, clipart',
};

const NEGATIVE_PROMPT = 'blurry, ugly, deformed, low quality, watermark, text, signature';

function validateRequest(body: unknown): {
  valid: boolean;
  error?: string;
  data?: { imageBase64: string; styleId: StyleType; prompt: string };
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { imageBase64, styleId, prompt } = body as Record<string, unknown>;

  if (typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return { valid: false, error: 'Invalid or missing imageBase64' };
  }

  if (!VALID_STYLES.includes(styleId as StyleType)) {
    return { valid: false, error: `Invalid styleId. Must be one of: ${VALID_STYLES.join(', ')}` };
  }

  if (typeof prompt !== 'string' || prompt.length < 10) {
    return { valid: false, error: 'Invalid or missing prompt' };
  }

  if (imageBase64.length > 14_000_000) {
    return { valid: false, error: 'Image too large. Max 10MB.' };
  }

  return {
    valid: true,
    data: { imageBase64, styleId: styleId as StyleType, prompt },
  };
}

router.post('/generate', async (req: Request, res: Response) => {
  const validation = validateRequest(req.body);
  if (!validation.valid || !validation.data) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const { styleId } = validation.data;

  if (!process.env.HF_TOKEN) {
    res.status(500).json({ error: 'Server misconfiguration: missing HF_TOKEN' });
    return;
  }

  try {
    const hf = new HfInference(process.env.HF_TOKEN);

    const stylePrompt = STYLE_PROMPTS[styleId];

    const blob = await hf.textToImage({
      model: HF_MODEL,
      inputs: stylePrompt,
      parameters: {
        negative_prompt: NEGATIVE_PROMPT,
        width: 512,
        height: 512,
        num_inference_steps: 20,
        guidance_scale: 7.5,
      },
    });

    // Convert blob to base64 data URI to return to app
    const buffer = Buffer.from(await (blob as unknown as Blob).arrayBuffer());
    const base64 = buffer.toString('base64');
    const imageUrl = `data:image/png;base64,${base64}`;

    res.json({ imageUrl });
  } catch (err: unknown) {
    console.error('[generate] Error:', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    res.status(500).json({ error: message });
  }
});

export { router as generateRoute };
