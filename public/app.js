(() => {
  const tg = window.Telegram?.WebApp;
  const promptEl = document.getElementById("prompt");
  const countEl = document.getElementById("char-count");
  const scenesEl = document.getElementById("scenes");
  const statusEl = document.getElementById("status");
  const generateBtn = document.getElementById("generate");
  let sceneNumber = 0;

  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.("#10131d");
    tg.setBackgroundColor?.("#10131d");
    const firstName = tg.initDataUnsafe?.user?.first_name;
    if (firstName) document.getElementById("user-chip").textContent = firstName;
  }

  function addScene() {
    sceneNumber += 1;
    const card = document.createElement("article");
    card.className = "scene-card";
    card.innerHTML = `
      <div class="scene-top">
        <span class="scene-title">صحنه ${sceneNumber}</span>
        <button class="remove-scene" type="button" aria-label="صحنه لرې کول">×</button>
      </div>
      <div class="scene-fields">
        <input class="scene-place" placeholder="ځای (مثلاً د کابل ښار)" aria-label="د صحنې ځای">
        <input class="scene-action" placeholder="عمل (څه پېښېږي؟)" aria-label="د صحنې عمل">
        <input class="scene-camera full" placeholder="د کامرې حرکت (مثلاً ورو نږدې کېدل)" aria-label="د کامرې حرکت">
      </div>`;
    card.querySelector(".remove-scene").addEventListener("click", () => card.remove());
    scenesEl.appendChild(card);
  }

  addScene();
  document.getElementById("add-scene").addEventListener("click", addScene);
  promptEl.addEventListener("input", () => {
    countEl.textContent = `${promptEl.value.length} / 4000`;
  });

  async function checkHealth() {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      if (!data.videoProviderConfigured) {
        document.getElementById("provider-note").textContent =
          "د پروژې بنسټ چمتو دی؛ د حقیقي ویډیو جوړولو لپاره باید AI Provider ونښلول شي.";
      }
    } catch {
      // The interface can still be previewed without an API connection.
    }
  }
  checkHealth();

  generateBtn.addEventListener("click", async () => {
    const prompt = promptEl.value.trim();
    if (prompt.length < 8) {
      statusEl.textContent = "مهرباني وکړئ د فلم کیسه لږ تر لږه ۸ توري ولیکئ.";
      promptEl.focus();
      return;
    }

    const scenes = [...scenesEl.querySelectorAll(".scene-card")].map((card) => ({
      place: card.querySelector(".scene-place").value.trim(),
      action: card.querySelector(".scene-action").value.trim(),
      camera: card.querySelector(".scene-camera").value.trim()
    }));

    generateBtn.disabled = true;
    generateBtn.textContent = "غوښتنه لېږل کېږي...";
    statusEl.textContent = "ستاسو د فلم معلومات سرور ته لېږل کېږي.";

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-telegram-init-data": tg?.initData || ""
        },
        body: JSON.stringify({
          prompt,
          duration: Number(document.getElementById("duration").value),
          aspectRatio: document.getElementById("ratio").value,
          style: document.getElementById("style").value,
          scenes
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "غوښتنه بشپړه نه شوه.");
      statusEl.textContent = data.result?.video_url
        ? "فلم جوړ شو: " + data.result.video_url
        : "غوښتنه ومنل شوه. د Provider ځواب: " + JSON.stringify(data.result);
    } catch (error) {
      statusEl.textContent = error.message || "له سرور سره اړیکه ونه شوه.";
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = "<span>✦</span> فلم جوړول";
    }
  });
})();
