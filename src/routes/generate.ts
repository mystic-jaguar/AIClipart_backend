import { Router, Request, Response } from 'express';
import Replicate from 'replicate';

const router = Router();

// Replicate model: stability-ai/sdxl for image-to-image style transfer
// Docs: https://replicate.com/stability-ai/sdxl
const MODEL_VERSION =
  '7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc' as `${string}/${string}:${string}`;

const VALID_STYLES = ['cartoon', 'flat', 'anime', 'pixel', 'sketch'] as const;
type StyleType = (typeof VALID_STYLES)[number];

// Style-specific negative prompts to improve output quality
const NEGATIVE_PROMPTS: Record<StyleType, string> = {
  cartoon: 'photorealistic, blurry, dark, gloomy, ugly, deformed',
  flat: 'photorealistic, 3d, shadows, gradients, complex textures, blurry',
  anime: 'photorealistic, western cartoon, blurry, ugly, deformed, extra limbs',
  pixel: 'photorealistic, smooth, anti-aliased, blurry, high resolution details',
  sketch: 'color, photorealistic, blurry, painted, digital art',
};

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

  // Rough size check — base64 of 10MB raw = ~13.3MB string
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

  const { imageBase64, styleId, prompt } = validation.data;

  if (!process.env.REPLICATE_API_TOKEN) {
    res.status(500).json({ error: 'Server misconfiguration: missing API token' });
    return;
  }

  try {
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Convert base64 to data URI for Replicate
    const imageDataUri = `data:image/jpeg;base64,${imageBase64}`;

    const output = await replicate.run(MODEL_VERSION, {
      input: {
        prompt,
        image: imageDataUri,
        negative_prompt: NEGATIVE_PROMPTS[styleId],
        prompt_strength: 0.8,   // How much to deviate from original image
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width: 512,
        height: 512,
      },
    });

    // Replicate returns an array of image URLs
    const outputArray = output as string[];
    if (!outputArray || outputArray.length === 0) {
      res.status(500).json({ error: 'No output from AI model' });
      return;
    }

    res.json({ imageUrl: outputArray[0] });
  } catch (err: unknown) {
    console.error('[generate] Error:', err);
    const message = err instanceof Error ? err.message : 'Generation failed';
    res.status(500).json({ error: message });
  }
});

export { router as generateRoute };
