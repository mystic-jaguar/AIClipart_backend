# AI Clipart Generator — Backend

Node.js/TypeScript backend that proxies image generation requests to Hugging Face's Inference API.

---

## Prerequisites

- Node.js 18+
- A free [Hugging Face](https://huggingface.co/settings/tokens) account and API token

---

## Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your token
copy .env.example .env
```

Edit `.env`:
```
HF_TOKEN=hf_your_huggingface_token_here
PORT=3000
ALLOWED_ORIGINS=*
```

---

## Running

```bash
# Development (auto-restarts on changes)
npm run dev

# Production build
npm run build

# Run production build
npm start
```

Server runs on `http://localhost:3000` by default.

---

## Tunnel to Emulator (Cloudflare — no account needed)

Run this in a separate terminal while the backend is running:

```bash
npx cloudflared tunnel --url http://localhost:3000
```

Copy the generated URL (e.g. `https://xxxx.trycloudflare.com`) and paste it into:
`AIClipartGenerator/src/services/api.ts` → `API_BASE`

---

## Deploy to Render

```bash
# Push to GitHub first
git init
git add .
git commit -m "initial backend"
git remote add origin https://github.com/YOUR_USERNAME/clipart-backend.git
git push -u origin main
```

Then on [Render](https://render.com):
1. New → Web Service → Connect your GitHub repo
2. Configure:
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Instance Type: Free
3. Add environment variables:
   ```
   HF_TOKEN=hf_your_huggingface_token_here
   PORT=3000
   ALLOWED_ORIGINS=*
   ```
4. Copy the generated domain (e.g. `https://clipart-backend.onrender.com`) and update `API_BASE` in `AIClipartGenerator/src/services/api.ts`

> Note: Render's free tier spins down after 15 min of inactivity. First request after idle may take ~30s to wake up.

---

## Project Structure

```
backend/
├── src/          # TypeScript source files
├── .env          # Environment variables (not committed)
├── .env.example  # Env template
├── package.json
└── tsconfig.json
```
