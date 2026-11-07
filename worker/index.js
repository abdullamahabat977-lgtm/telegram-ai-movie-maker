function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "telegram-ai-movie-maker",
        mode: "manual-editor",
        aiGeneration: false,
        serverVideoRendering: false
      });
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  }
};
