# Telegram AI Movie Maker

A Telegram Mini App starter built with:
- Telegram Mini Apps WebApp SDK
- Cloudflare Workers (serverless API)
- Static frontend in `public/`

## Important distinction

**BotFather is not a serverless hosting platform.** @BotFather creates/configures the Telegram bot and connects its Mini App URL. This repository uses **Cloudflare Workers** for serverless hosting and API routes. See the official Telegram and Cloudflare documentation linked below.

## Current status

- Responsive Pashto (RTL) Mini App interface: ready
- Telegram WebApp SDK integration: ready
- Server-side Telegram `initData` HMAC validation: ready
- Serverless health endpoint: ready
- Video generation provider adapter: intentionally not activated until you choose a provider and configure its API credentials
- MP4 rendering/export: depends on the selected AI video provider

The Generate button will explain when the provider is not configured. The app does not pretend to create a real video without an AI provider.

## Project layout

```
public/
  index.html
  styles.css
  app.js
worker/
  index.js
wrangler.toml
package.json
```

## 1. Install and run locally

Requirements: Node.js 20+ and an active Cloudflare account.

```bash
npm install
```

Create a local secrets file named `.dev.vars` beside `wrangler.toml` (never commit it):

```env
BOT_TOKEN="YOUR_TELEGRAM_BOT_TOKEN"
AI_VIDEO_API_URL=""
AI_VIDEO_API_KEY=""
```

Start local development:

```bash
npm run dev
```

## 2. Deploy to Cloudflare Workers

Log in once:

```bash
npx wrangler login
```

Set the Telegram token as a Cloudflare secret:

```bash
npx wrangler secret put BOT_TOKEN
```

Only after choosing a compatible video-generation provider, add its endpoint and key. Keep keys as secrets, not in frontend code or `wrangler.toml`:

```bash
npx wrangler secret put AI_VIDEO_API_URL
npx wrangler secret put AI_VIDEO_API_KEY
```

Deploy:

```bash
npm run deploy
```

Wrangler prints the deployed `workers.dev` URL.

## 3. Connect the Mini App in @BotFather

1. Open @BotFather and select your bot.
2. Use `/setmenubutton` to set a menu button, or configure the Main Mini App using BotFather's Mini App settings.
3. Set the Web App URL to the HTTPS URL printed by Wrangler.
4. Open the bot and launch the Mini App.

The bot username is not hard-coded in this repository.

## API

- `GET /api/health` — service/configuration status (does not reveal secrets)
- `POST /api/generate` — validates Telegram `initData`, then forwards a generation request to the configured provider

The provider adapter currently expects a JSON POST body containing `prompt`, `duration`, `aspectRatio`, `style`, and `scenes`. It expects a JSON response from the provider. Real providers often have different request formats and asynchronous job APIs, so the adapter must be tailored to the provider you select.

## Security notes

- Never put the Telegram bot token or AI provider keys in `public/`.
- Never trust `initDataUnsafe` for authentication. The Worker validates the raw `initData`.
- `.dev.vars` and `.env*` are excluded from Git.
- Add rate limiting, usage quotas, and persistent job storage before opening generation to the public.

## Official documentation

- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Cloudflare Workers secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/
