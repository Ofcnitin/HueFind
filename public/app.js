(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("searchForm");
  const queryInput = $("queryInput");
  const hexInput = $("hexInput");
  const nativeColor = $("nativeColor");
  const colorWheel = $("colorWheel");
  const wheelKnob = $("wheelKnob");
  const swatch = $("swatch");
  const selectedColor = $("selectedColor");
  const searchButton = $("searchButton");
  const resultsGrid = $("resultsGrid");
  const loader = $("loader");
  const emptyState = $("emptyState");
  const errorBox = $("errorBox");
  const resultsTitle = $("resultsTitle");
  const feedMeta = $("feedMeta");
  const statusLamp = $("statusLamp");
  const statusText = $("statusText");
  const dialog = $("imageDialog");
  const dialogImage = $("dialogImage");
  const dialogTitle = $("dialogTitle");
  const dialogSource = $("dialogSource");
  const dialogLink = $("dialogLink");

  let currentColor = "#8B5CF6";
  let busy = false;

  function normalizeHex(value) {
    const raw = String(value || "").trim().replace(/^#/, "");
    return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw.toUpperCase()}` : null;
  }

  function hexToRgb(hex) {
    const clean = hex.slice(1);
    return {
      r: Number.parseInt(clean.slice(0, 2), 16),
      g: Number.parseInt(clean.slice(2, 4), 16),
      b: Number.parseInt(clean.slice(4, 6), 16)
    };
  }

  function rgbToHsv({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = ((b - r) / d) + 2;
      else h = ((r - g) / d) + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
  }

  function setColor(hex, syncNative = true) {
    const valid = normalizeHex(hex);
    if (!valid) return false;
    currentColor = valid;
    if (syncNative) nativeColor.value = valid;
    hexInput.value = valid;
    swatch.style.background = valid;
    document.documentElement.style.setProperty("--accent", valid);
    selectedColor.textContent = valid;
    const hsv = rgbToHsv(hexToRgb(valid));
    const angle = hsv.h;
    const radius = 22;
    const saturation = Math.max(.08, hsv.s);
    const x = 30 + Math.cos((angle - 90) * Math.PI / 180) * radius * saturation;
    const y = 30 + Math.sin((angle - 90) * Math.PI / 180) * radius * saturation;
    wheelKnob.style.left = `${x}px`;
    wheelKnob.style.top = `${y}px`;
    wheelKnob.style.background = valid;
    return true;
  }

  function setStatus(label, good = true) {
    statusText.textContent = label;
    statusLamp.classList.toggle("bad", !good);
  }

  function showError(message) {
    errorBox.hidden = false;
    errorBox.textContent = message;
  }

  function clearError() {
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function sourceLabel(source) {
    return ({ google: "Google Images", bing: "Bing Images", pexels: "Pexels", unsplash: "Unsplash" })[source] || source;
  }

  function renderResults(items) {
    resultsGrid.innerHTML = "";
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "card";
      card.tabIndex = 0;

      const image = document.createElement("img");
      image.loading = "lazy";
      image.decoding = "async";
      image.src = item.thumbnailUrl || item.imageUrl;
      image.alt = item.title || "HueFind result";
      image.referrerPolicy = "no-referrer";

      const score = document.createElement("span");
      score.className = "card-score";
      score.textContent = `${item.score}%`;

      const overlay = document.createElement("div");
      overlay.className = "card-overlay";

      const title = document.createElement("div");
      title.className = "card-title";
      title.textContent = item.title;

      const meta = document.createElement("div");
      meta.className = "card-meta";
      const source = document.createElement("span");
      source.textContent = sourceLabel(item.source);
      const color = document.createElement("span");
      color.textContent = item.colorHex ? `COLOR ${item.colorHex}` : "DISCOVERY";
      meta.append(source, color);

      overlay.append(title, meta);
      card.append(image, score, overlay);

      const open = () => openDialog(item);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });

      fragment.append(card);
    });

    resultsGrid.append(fragment);
  }

  function openDialog(item) {
    dialogImage.src = item.imageUrl || item.thumbnailUrl;
    dialogImage.alt = item.title || "HueFind image";
    dialogTitle.textContent = item.title || "Image";
    dialogSource.textContent = `${sourceLabel(item.source)} · ${item.score}% MATCH`;
    dialogLink.href = item.sourceUrl || item.imageUrl;
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function setLoading(value) {
    busy = value;
    searchButton.disabled = value;
    searchButton.querySelector(".button-face").textContent = value ? "SEARCHING…" : "SEARCH";
    loader.hidden = !value;
    if (value) {
      emptyState.hidden = true;
      resultsGrid.hidden = true;
    } else {
      resultsGrid.hidden = false;
    }
  }

  async function search() {
    clearError();
    const query = queryInput.value.trim();
    if (!query) {
      showError("Tell HueFind what you want to see first.");
      queryInput.focus();
      return;
    }
    if (!normalizeHex(currentColor)) {
      showError("Please enter a valid 6-digit HEX color.");
      hexInput.focus();
      return;
    }

    setLoading(true);
    setStatus("Searching…");
    resultsTitle.textContent = `Finding “${query}”`;
    feedMeta.textContent = `Theme ${currentColor} · ${query}`;
    const params = new URLSearchParams({ q: query, color: currentColor, page: "1", perSource: "30" });

    try {
      const response = await fetch(`/api/search?${params.toString()}`, {
        headers: { accept: "application/json" }
      });
      const data = await response.json();
      if (!response.ok) {
        const retry = response.status === 429 ? " Please wait a moment and try again." : "";
        throw new Error(`${data.message || "Search failed."}${retry}`);
      }

      if (!data.results?.length) {
        resultsGrid.innerHTML = "";
        emptyState.hidden = false;
        emptyState.querySelector("h3").textContent = "Nothing surfaced yet.";
        emptyState.querySelector("p").textContent = "Try a broader subject or a different color.";
      } else {
        emptyState.hidden = true;
        renderResults(data.results);
        resultsTitle.textContent = `${data.results.length} visual finds`;
        const activeProviders = Object.entries(data.providers || {}).filter(([, v]) => v.ok).map(([k]) => sourceLabel(k));
        feedMeta.textContent = `${activeProviders.join(" · ") || "No sources"} · ${data.tookMs}ms`;
      }

      setStatus("Online");
    } catch (error) {
      showError(error?.message || "HueFind could not complete the search.");
      setStatus("Check connection", false);
    } finally {
      setLoading(false);
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!busy) void search();
  });

  hexInput.addEventListener("input", () => {
    const valid = normalizeHex(hexInput.value);
    if (valid) setColor(valid);
  });

  nativeColor.addEventListener("input", () => setColor(nativeColor.value));

  colorWheel.addEventListener("click", (event) => {
    const rect = colorWheel.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(x, y);
    if (distance > rect.width / 2) return;
    const hue = (Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360;
    const saturation = Math.min(100, Math.max(55, (distance / (rect.width / 2)) * 100));
    const lightness = 54;
    const c = (1 - Math.abs(2 * lightness / 100 - 1)) * (saturation / 100);
    const x2 = c * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness / 100 - c / 2;
    let r = 0, g = 0, b = 0;
    if (hue < 60) [r, g, b] = [c, x2, 0];
    else if (hue < 120) [r, g, b] = [x2, c, 0];
    else if (hue < 180) [r, g, b] = [0, c, x2];
    else if (hue < 240) [r, g, b] = [0, x2, c];
    else if (hue < 300) [r, g, b] = [x2, 0, c];
    else [r, g, b] = [c, 0, x2];
    const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
    setColor(`#${toHex(r)}${toHex(g)}${toHex(b)}`);
  });

  $("randomColor").addEventListener("click", () => {
    const random = `#${crypto.getRandomValues(new Uint8Array(3)).reduce((hex, n) => hex + n.toString(16).padStart(2, "0"), "")}`;
    setColor(random);
  });

  $("closeDialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  setColor(currentColor);
  queryInput.focus();
})();
