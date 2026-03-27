import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { generateRoute } from './routes/generate';

const app = express();
const PORT = process.env.PORT ?? 8080;

// CORS — restrict to your app's origin in production
app.use(cors({ origin: process.env.ALLOWED_ORIGINS ?? '*' }));

// Body size limit — 10MB max for base64 images (~7.5MB raw)
app.use(express.json({ limit: '10mb' }));

// Rate limiting — 20 requests per IP per 10 minutes
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait before trying again.' },
});
app.use('/api/', limiter);

// Routes
app.use('/api', generateRoute);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
