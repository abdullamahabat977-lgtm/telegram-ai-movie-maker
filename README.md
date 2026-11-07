# Telegram Manual Movie Studio

A Telegram Mini App for **making and editing movies by hand**. It does not generate films with AI and does not call an AI video-generation provider.

## What it does

- Import your own photos and video clips from your device
- Arrange scenes in a simple timeline
- Move scenes up and down
- Set each scene duration
- Add a text title or dialogue to each scene
- Choose cover/contain image fitting
- Add a music/audio file
- Preview the movie
- Export a rendered WebM video in the browser

The source media is processed locally in the user's browser. The current first version exports WebM; MP4 export and a richer multi-track editor are future improvements. Large projects may exceed mobile browser memory limits, so start with short clips.

## Architecture

- Telegram Mini App frontend: HTML, CSS, JavaScript
- Serverless hosting: Cloudflare Workers static assets
- No AI video API, no AI provider key, and no AI film generation
- The Worker only serves the app and a health endpoint

**BotFather is not a serverless host.** Use @BotFather to configure the bot's Mini App URL. Cloudflare Workers hosts the app.

## Local development

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

## Deploy

```bash
npx wrangler login
npm run deploy
```

Wrangler prints the HTTPS URL. Add that URL in @BotFather using the Mini App settings or `/setmenubutton`.

## Official documentation

- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- Cloudflare Workers static assets: https://developers.cloudflare.com/workers/static-assets/
- Wrangler configuration: https://developers.cloudflare.com/workers/wrangler/configuration/

## Current limitations

- Export format: WebM (not MP4 yet)
- No cloud project storage or user accounts yet
- No collaborative editing yet
- Browser/device memory limits apply, especially on lower-end phones
