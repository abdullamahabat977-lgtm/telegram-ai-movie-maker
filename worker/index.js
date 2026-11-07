const MAX_AUTH_AGE_SECONDS = 60 * 60 * 24;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256(keyBytes, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message))
  );
}

async function validateTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  if (!receivedHash) return null;

  params.delete("hash");
  params.delete("signature");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  // Telegram Mini Apps validation:
  // secret_key = HMAC_SHA256(key=bot_token, data="WebAppData")
  const secretKey = await hmacSha256(
    new TextEncoder().encode(botToken),
    "WebAppData"
  );
  const calculatedHash = toHex(await hmacSha256(secretKey, dataCheckString));

  if (calculatedHash.length !== receivedHash.length) return null;
  let mismatch = 0;
  for (let i = 0; i < calculatedHash.length; i++) {
    mismatch |= calculatedHash.charCodeAt(i) ^ receivedHash.charCodeAt(i);
  }
  if (mismatch !== 0) return null;

  const authDate = Number(params.get("auth_date"));
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(authDate) || authDate > now + 60) return null;
  if (now - authDate > MAX_AUTH_AGE_SECONDS) return null;

  let user = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    return null;
  }

  return user;
}

async function handleGenerate(request, env) {
  if (!env.BOT_TOKEN) {
    return json({ error: "Server setup is incomplete: BOT_TOKEN secret is missing." }, 503);
  }

  const initData = request.headers.get("x-telegram-init-data") || "";
  const telegramUser = await validateTelegramInitData(initData, env.BOT_TOKEN);
  if (!telegramUser) {
    return json({ error: "Telegram authentication failed. Reopen the Mini App from Telegram." }, 401);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const prompt = String(input.prompt || "").trim();
  if (prompt.length < 8 || prompt.length > 4000) {
    return json({ error: "Please provide a prompt between 8 and 4000 characters." }, 400);
  }

  if (!env.AI_VIDEO_API_URL || !env.AI_VIDEO_API_KEY) {
    return json({
      error: "د AI ویډیو جوړولو خدمت لا نه دی نښلول شوی. لومړی باید د ویډیو جوړولو Provider وټاکو او API Key یې تنظیم کړو."
    }, 503);
  }

  // Provider-neutral adapter contract. Most providers need a custom adapter
  // for their own payload format and asynchronous job polling.
  let providerResponse;
  try {
    providerResponse = await fetch(env.AI_VIDEO_API_URL, {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.AI_VIDEO_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        prompt,
        duration: Number(input.duration) || 10,
        aspectRatio: input.aspectRatio || "16:9",
        style: input.style || "cinematic",
        scenes: Array.isArray(input.scenes) ? input.scenes : [],
        telegramUserId: telegramUser?.id
      })
    });
  } catch {
    return json({ error: "د ویډیو خدمت ته اتصال ونه شو." }, 502);
  }

  const responseText = await providerResponse.text();
  let providerData;
  try {
    providerData = JSON.parse(responseText);
  } catch {
    providerData = { message: responseText.slice(0, 500) };
  }

  if (!providerResponse.ok) {
    return json({
      error: "د ویډیو خدمت غوښتنه ونه منله.",
      providerStatus: providerResponse.status,
      details: providerData
    }, 502);
  }

  return json({ ok: true, result: providerData });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "telegram-ai-movie-maker",
        telegramConfigured: Boolean(env.BOT_TOKEN),
        videoProviderConfigured: Boolean(env.AI_VIDEO_API_URL && env.AI_VIDEO_API_KEY)
      });
    }

    if (url.pathname === "/api/generate" && request.method === "POST") {
      return handleGenerate(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "API route not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
