(() => {
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready(); tg.expand();
    tg.setHeaderColor?.("#10131d"); tg.setBackgroundColor?.("#10131d");
    const name = tg.initDataUnsafe?.user?.first_name;
    if (name) document.getElementById("user-chip").textContent = name;
  }

  const $ = (id) => document.getElementById(id);
  const canvas = $("preview");
  const ctx = canvas.getContext("2d");
  const timeline = $("timeline");
  let scenes = [];
  let selectedId = null;
  let nextId = 1;
  let playing = false;
  let playStartedAt = 0;
  let pausedAt = 0;
  let animationFrame = 0;
  let musicFile = null;

  const totalDuration = () => scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const fmt = (seconds) => {
    const s = Math.max(0, Math.floor(seconds));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };

  function drawPlaceholder(message) {
    ctx.fillStyle = "#111827"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#a78bfa"; ctx.textAlign = "center"; ctx.font = "bold 38px sans-serif";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }

  function drawScene(scene, localTime = 0) {
    ctx.fillStyle = "#090d16"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!scene) { drawPlaceholder("خپل فلم جوړول پیل کړه"); return; }
    const media = scene.element;
    if (media && media.readyState !== 0) {
      const w = media.videoWidth || media.naturalWidth || media.width;
      const h = media.videoHeight || media.naturalHeight || media.height;
      if (w && h) {
        const scale = scene.fit === "contain"
          ? Math.min(canvas.width / w, canvas.height / h)
          : Math.max(canvas.width / w, canvas.height / h);
        const dw = w * scale, dh = h * scale;
        ctx.drawImage(media, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
      }
    }
    if (scene.title) {
      const fontSize = Math.round(canvas.width * 0.047);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      const text = scene.title;
      const maxWidth = canvas.width * 0.88;
      const lines = [];
      let line = "";
      for (const word of text.split(" ")) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
        else line = test;
      }
      if (line) lines.push(line);
      const lineHeight = fontSize * 1.35;
      const y = canvas.height - canvas.height * 0.09 - (lines.length - 1) * lineHeight;
      ctx.fillStyle = "rgba(0,0,0,.52)";
      ctx.fillRect(canvas.width * .04, y - fontSize * 1.15, canvas.width * .92, lines.length * lineHeight + fontSize * .45);
      ctx.fillStyle = "#fff";
      lines.forEach((part, index) => ctx.fillText(part, canvas.width / 2, y + index * lineHeight, maxWidth));
    }
  }

  function renderTimeline() {
    timeline.innerHTML = "";
    if (!scenes.length) {
      timeline.innerHTML = '<div class="empty-state">تر اوسه صحنه نشته. انځورونه یا ویډیوګانې پورته کړه.</div>';
    }
    scenes.forEach((scene, index) => {
      const card = document.createElement("div");
      card.className = "timeline-card" + (scene.id === selectedId ? " selected" : "");
      const thumb = document.createElement("div"); thumb.className = "thumb";
      if (scene.type === "image") {
        const img = document.createElement("img"); img.src = scene.url; thumb.appendChild(img);
      } else {
        const label = document.createElement("span"); label.textContent = "▶ ویډیو"; thumb.appendChild(label);
      }
      const info = document.createElement("div"); info.className = "timeline-info";
      const title = document.createElement("strong"); title.textContent = scene.title || scene.name;
      const meta = document.createElement("span"); meta.textContent = `صحنه ${index + 1} • ${scene.duration} ثانیې`;
      info.append(title, meta);
      const actions = document.createElement("div"); actions.className = "move-actions";
      [["↑","up"],["↓","down"]].forEach(([label, direction]) => {
        const button = document.createElement("button"); button.type = "button"; button.textContent = label;
        button.disabled = direction === "up" ? index === 0 : index === scenes.length - 1;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const target = direction === "up" ? index - 1 : index + 1;
          [scenes[index], scenes[target]] = [scenes[target], scenes[index]];
          renderTimeline(); updateDuration();
        });
        actions.appendChild(button);
      });
      card.append(thumb, info, actions);
      card.addEventListener("click", () => selectScene(scene.id));
      timeline.appendChild(card);
    });
    updateDuration();
  }

  function updateDuration() {
    $("project-time").textContent = totalDuration() + " ثانیې";
  }

  function selectScene(id) {
    selectedId = id;
    const scene = scenes.find((item) => item.id === id);
    $("scene-editor").hidden = !scene;
    $("editor-empty").hidden = Boolean(scene);
    if (scene) {
      $("scene-title").value = scene.title;
      $("scene-duration").value = scene.duration;
      $("scene-fit").value = scene.fit;
      drawScene(scene);
    }
    renderTimeline();
  }

  $("media-input").addEventListener("change", (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
      const url = URL.createObjectURL(file);
      const isImage = file.type.startsWith("image/");
      const element = isImage ? new Image() : document.createElement("video");
      element.src = url;
      if (!isImage) { element.muted = true; element.playsInline = true; element.preload = "auto"; }
      const scene = { id: nextId++, file, name: file.name, type: isImage ? "image" : "video", url, element, duration: 5, title: "", fit: "cover" };
      scenes.push(scene);
      if (isImage) element.onload = () => { if (selectedId === scene.id || scenes.length === 1) drawScene(scene); };
      else element.onloadeddata = () => { if (selectedId === scene.id) drawScene(scene); };
      if (!selectedId) selectedId = scene.id;
    }
    event.target.value = "";
    renderTimeline();
    if (selectedId) selectScene(selectedId);
  });

  $("audio-input").addEventListener("change", (event) => {
    musicFile = event.target.files[0] || null;
    $("export-status").textContent = musicFile ? "د موسیقۍ فایل وټاکل شو: " + musicFile.name : "";
  });

  $("apply-scene").addEventListener("click", () => {
    const scene = scenes.find((item) => item.id === selectedId);
    if (!scene) return;
    scene.title = $("scene-title").value.trim();
    scene.duration = Math.min(60, Math.max(1, Number($("scene-duration").value) || 5));
    scene.fit = $("scene-fit").value;
    renderTimeline(); drawScene(scene);
    $("export-status").textContent = "د صحنې سمون ثبت شو.";
  });

  $("delete-scene").addEventListener("click", () => {
    const index = scenes.findIndex((item) => item.id === selectedId);
    if (index < 0) return;
    URL.revokeObjectURL(scenes[index].url);
    scenes.splice(index, 1);
    selectedId = scenes[index]?.id || scenes[index - 1]?.id || null;
    $("scene-editor").hidden = true; $("editor-empty").hidden = false;
    renderTimeline();
    const scene = scenes.find((item) => item.id === selectedId);
    drawScene(scene);
  });

  function locateScene(time) {
    let cursor = 0;
    for (const scene of scenes) {
      if (time < cursor + scene.duration) return { scene, local: time - cursor };
      cursor += scene.duration;
    }
    return { scene: scenes[scenes.length - 1], local: scenes[scenes.length - 1]?.duration || 0 };
  }

  function renderAt(time) {
    const found = locateScene(time);
    const scene = found.scene;
    if (!scene) return drawScene(null);
    if (scene.type === "video" && scene.element.readyState >= 2) {
      const desired = Math.min(found.local, Math.max(0, (scene.element.duration || scene.duration) - .08));
      if (Math.abs(scene.element.currentTime - desired) > .35) scene.element.currentTime = desired;
      if (playing && scene.element.paused) scene.element.play().catch(() => {});
    } else if (scene.type === "video" && !playing) {
      scene.element.pause();
    }
    drawScene(scene, found.local);
    $("preview-clock").textContent = fmt(time);
  }

  function tick(now) {
    if (!playing) return;
    const time = Math.min((now - playStartedAt) / 1000 + pausedAt, totalDuration());
    renderAt(time);
    if (time >= totalDuration()) { stopPlayback(); return; }
    animationFrame = requestAnimationFrame(tick);
  }

  function stopPlayback() {
    playing = false; cancelAnimationFrame(animationFrame);
    scenes.forEach((scene) => { if (scene.type === "video") scene.element.pause(); });
    pausedAt = 0; renderAt(0);
    $("play-btn").textContent = "▶ چلول";
  }

  $("play-btn").addEventListener("click", () => {
    if (!scenes.length) return;
    if (playing) return;
    if (pausedAt >= totalDuration()) pausedAt = 0;
    playing = true; playStartedAt = performance.now();
    $("play-btn").textContent = "▶ روان دی...";
    animationFrame = requestAnimationFrame(tick);
  });
  $("stop-btn").addEventListener("click", stopPlayback);

  function setOutputSize() {
    const ratio = $("output-ratio").value;
    const dimensions = ratio === "9:16" ? [720,1280] : ratio === "1:1" ? [900,900] : [1280,720];
    canvas.width = dimensions[0]; canvas.height = dimensions[1];
    const scene = scenes.find((item) => item.id === selectedId);
    drawScene(scene);
  }
  $("output-ratio").addEventListener("change", setOutputSize);

  async function exportMovie() {
    if (!scenes.length) { $("export-status").textContent = "لومړی لږ تر لږه یوه صحنه ورزیاته کړه."; return; }
    if (!window.MediaRecorder || !canvas.captureStream) {
      $("export-status").textContent = "ستا براوزر د ویډیو صادرولو اړین امکانات نه لري. مهرباني وکړه نوی Chrome وکاروه.";
      return;
    }
    stopPlayback();
    const button = $("export-btn");
    button.disabled = true;
    $("export-status").textContent = "فلم ثبتېږي؛ مهرباني وکړه دا پاڼه مه بندوه...";
    const stream = canvas.captureStream(24);
    let audioContext, audioElement, audioUrl;
    try {
      if (musicFile) {
        audioContext = new AudioContext();
        audioElement = new Audio();
        audioUrl = URL.createObjectURL(musicFile);
        audioElement.src = audioUrl; audioElement.loop = true;
        const source = audioContext.createMediaElementSource(audioElement);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination); source.connect(audioContext.destination);
        destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
        await audioContext.resume(); await audioElement.play();
      }
      const mime = ["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("د WebM ثبتولو ملاتړ نشته.");
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      const chunks = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = () => reject(new Error("د فلم ثبتول ناکام شول."));
      });
      recorder.start(500);
      const started = performance.now();
      const duration = totalDuration();
      await new Promise((resolve) => {
        const frame = (now) => {
          const time = Math.min((now - started) / 1000, duration);
          renderAt(time);
          $("export-status").textContent = `فلم ثبتېږي: ${Math.round(time / duration * 100)}٪`;
          if (time >= duration) resolve();
          else requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      recorder.stop();
      await stopped;
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "my-manual-movie.webm";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      $("export-status").textContent = "فلم جوړ شو او ښکته شو. فایل WebM دی؛ MP4 ته یې په ویډیو ایډیټر کې اړولای شې.";
    } catch (error) {
      $("export-status").textContent = "ستونزه: " + error.message;
    } finally {
      if (audioElement) { audioElement.pause(); audioElement.src = ""; }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContext) await audioContext.close().catch(() => {});
      stream.getTracks().forEach((track) => track.stop());
      button.disabled = false;
      renderAt(0);
    }
  }
  $("export-btn").addEventListener("click", exportMovie);
  drawPlaceholder("خپل فلم جوړول پیل کړه");
})();