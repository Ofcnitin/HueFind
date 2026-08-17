import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
  "x-content-type-options": "nosniff"
};

const MAX_QUERY_LENGTH = 120;
const MAX_PER_SOURCE = 40;
const RATE_LIMITS = { minute: 10, hour: 60 };

const COLOR_FAMILIES = [
  ["red", [255, 0, 0]],
  ["orange", [255, 128, 0]],
  ["yellow", [255, 220, 0]],
  ["green", [50, 180, 70]],
  ["turquoise", [40, 190, 180]],
  ["blue", [40, 100, 220]],
  ["violet", [130, 70, 210]],
  ["pink", [240, 100, 170]],
  ["brown", [130, 80, 45]],
  ["black", [20, 20, 20]],
  ["gray", [130, 130, 130]],
  ["white", [245, 245, 245]]
];

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra }
  });
}

function normalizeHex(value) {
  const raw = String(value || "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return `#${raw.toUpperCase()}`;
}

function hexToRgb(hex) {
  const clean = hex.slice(1);
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16)
  };
}

function colorDistance(a, b) {
  const ar = hexToRgb(a);
  const br = hexToRgb(b);
  return Math.sqrt(
    ((ar.r - br.r) ** 2) +
    ((ar.g - br.g) ** 2) +
    ((ar.b - br.b) ** 2)
  );
}

function nearestColorFamily(hex) {
  const rgb = hexToRgb(hex);
  let best = COLOR_FAMILIES[0];
  let bestDistance = Infinity;
  for (const family of COLOR_FAMILIES) {
    const [, c] = family;
    const distance = Math.sqrt(
      ((rgb.r - c[0]) ** 2) +
      ((rgb.g - c[1]) ** 2) +
      ((rgb.b - c[2]) ** 2)
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = family;
    }
  }
  return best[0];
}

function colorScore(target, actual) {
  const normalized = normalizeHex(actual);
  if (!normalized) return null;
  const distance = colorDistance(target, normalized);
  return Math.max(0, Math.round(100 * (1 - distance / 441.67295593)));
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function cleanText(value, fallback = "Untitled image") {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.slice(0, 240) || fallback;
}

function normalizeGoogle(payload, source) {
  return (payload?.images_results || []).map((item, index) => {
    const imageUrl = safeUrl(item.original || item.link);
    const thumbnailUrl = safeUrl(item.thumbnail);
    if (!imageUrl && !thumbnailUrl) return null;
    return {
      id: `${source}-${item.position || index + 1}-${encodeURIComponent(item.link || item.original || "")}`,
      source,
      title: cleanText(item.title || item.source, "Image"),
      imageUrl: imageUrl || thumbnailUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      sourceUrl: safeUrl(item.link || item.source_url),
      sourceName: cleanText(item.source, source),
      width: Number(item.original_width) || null,
      height: Number(item.original_height) || null,
      providerPosition: Number(item.position) || index + 1,
      colorHex: null
    };
  }).filter(Boolean);
}

function normalizeBing(payload) {
  return (payload?.data?.images || []).map((item, index) => {
    const imageUrl = safeUrl(item.murl);
    const thumbnailUrl = safeUrl(item.turl);
    if (!imageUrl && !thumbnailUrl) return null;
    return {
      id: `bing-${item.id || index + 1}-${encodeURIComponent(item.purl || item.murl || "")}`,
      source: "bing",
      title: cleanText(item.title, "Image"),
      imageUrl: imageUrl || thumbnailUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      sourceUrl: safeUrl(item.purl),
      sourceName: cleanText(item.purl ? (() => { try { return new URL(item.purl).hostname; } catch { return "Bing Images"; } })() : "Bing Images", "Bing Images"),
      width: null,
      height: null,
      providerPosition: Number(item.position) || index + 1,
      colorHex: null
    };
  }).filter(Boolean);
}

function normalizePexels(payload) {
  return (payload?.photos || []).map((item, index) => {
    const imageUrl = safeUrl(item.src?.large2x || item.src?.large || item.src?.original);
    const thumbnailUrl = safeUrl(item.src?.medium || item.src?.small || item.src?.tiny);
    if (!imageUrl && !thumbnailUrl) return null;
    return {
      id: `pexels-${item.id || index + 1}`,
      source: "pexels",
      title: cleanText(item.alt, "Pexels photo"),
      imageUrl: imageUrl || thumbnailUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      sourceUrl: safeUrl(item.url),
      sourceName: "Pexels",
      width: Number(item.width) || null,
      height: Number(item.height) || null,
      providerPosition: index + 1,
      colorHex: normalizeHex(item.avg_color)
    };
  }).filter(Boolean);
}

function normalizeUnsplash(payload) {
  return (payload?.results || []).map((item, index) => {
    const imageUrl = safeUrl(item.urls?.regular || item.urls?.small);
    const thumbnailUrl = safeUrl(item.urls?.small || item.urls?.thumb || item.urls?.regular);
    if (!imageUrl && !thumbnailUrl) return null;
    return {
      id: `unsplash-${item.id || index + 1}`,
      source: "unsplash",
      title: cleanText(item.alt_description || item.description, "Unsplash photo"),
      imageUrl: imageUrl || thumbnailUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      sourceUrl: safeUrl(item.links?.html),
      sourceName: item.user?.name ? `Unsplash · ${cleanText(item.user.name)}` : "Unsplash",
      width: Number(item.width) || null,
      height: Number(item.height) || null,
      providerPosition: index + 1,
      colorHex: normalizeHex(item.color)
    };
  }).filter(Boolean);
}

function deduplicate(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.imageUrl || item.thumbnailUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function scoreResult(item, targetHex) {
  const relevance = Math.max(0, 100 - (item.providerPosition - 1) * 2.25);
  const color = colorScore(targetHex, item.colorHex);
  const colorComponent = color === null ? 52 : color;
  const sourceBoost = item.source === "pexels" || item.source === "unsplash" ? 2 : 0;
  return Math.round((relevance * 0.58) + (colorComponent * 0.42) + sourceBoost);
}

function sortResults(items, targetHex) {
  return items
    .map(item => ({ ...item, score: scoreResult(item, targetHex) }))
    .sort((a, b) => b.score - a.score || a.providerPosition - b.providerPosition);
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      accept: "application/json",
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Provider returned non-JSON (${response.status})`);
  }
  if (!response.ok) {
    const message = cleanText(data?.message || data?.error || `HTTP ${response.status}`, "Provider request failed");
    throw new Error(message);
  }
  return data;
}

async function searchSerpApi(query, page, perSource, env, colorFamily) {
  if (!env.SERPAPI_KEY) throw new Error("SerpApi key is not configured");
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_images");
  url.searchParams.set("q", `${query} ${colorFamily}`);
  url.searchParams.set("api_key", env.SERPAPI_KEY);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "in");
  url.searchParams.set("ijn", String(Math.max(0, page - 1)));
  return normalizeGoogle(await fetchJson(url), "google");
}

async function searchSerpApiOrg(query, page, perSource, env, colorFamily) {
  if (!env.SERPAPI_ORG_KEY) throw new Error("SerpApi.org key is not configured");
  const url = new URL("https://serpapi.org/api/v1/images-search");
  url.searchParams.set("keyword", `${query} ${colorFamily}`);
  url.searchParams.set("token", env.SERPAPI_ORG_KEY);
  url.searchParams.set("gl", "IN");
  url.searchParams.set("hl", "en");
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(Math.min(100, perSource)));
  return normalizeBing(await fetchJson(url));
}

async function searchPexels(query, page, perSource, env, colorHex) {
  if (!env.PEXELS_API_KEY) throw new Error("Pexels key is not configured");
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(Math.min(80, perSource)));
  url.searchParams.set("color", colorHex);
  url.searchParams.set("locale", "en-US");
  return normalizePexels(await fetchJson(url, {
    headers: { Authorization: env.PEXELS_API_KEY }
  }));
}

function unsplashColorFamily(family) {
  return ({
    violet: "purple",
    turquoise: "teal",
    pink: "magenta",
    brown: "orange",
    gray: null
  })[family] || family;
}

async function searchUnsplash(query, page, perSource, env, colorFamily) {
  if (!env.UNSPLASH_ACCESS_KEY) throw new Error("Unsplash key is not configured");
  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(Math.min(30, perSource)));
  const unsplashColor = unsplashColorFamily(colorFamily);
  if (unsplashColor) url.searchParams.set("color", unsplashColor);
  url.searchParams.set("content_filter", "high");
  const data = await fetchJson(url, {
    headers: {
      Authorization: `Client-ID ${env.UNSPLASH_ACCESS_KEY}`,
      "Accept-Version": "v1"
    }
  });
  return normalizeUnsplash(data);
}

function getClientIp(request) {
  return request.headers.get("CF-Connecting-IP")
    || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
    || "unknown";
}

async function enforceRateLimit(request, env) {
  const ip = getClientIp(request);
  const id = env.RATE_LIMITER.idFromName(ip);
  const stub = env.RATE_LIMITER.get(id);
  const response = await stub.fetch("https://rate-limit/check");
  if (response.status === 429) {
    return response;
  }
  return null;
}

export class RateLimiter extends DurableObject {
  async fetch(request) {
    if (new URL(request.url).pathname !== "/check") {
      return new Response("Not found", { status: 404 });
    }

    const now = Date.now();
    const minuteAgo = now - 60_000;
    const hourAgo = now - 3_600_000;
    let timestamps = (await this.ctx.storage.get("timestamps")) || [];
    timestamps = timestamps.filter(t => t > hourAgo);

    const minuteCount = timestamps.filter(t => t > minuteAgo).length;
    const hourCount = timestamps.length;

    if (minuteCount >= RATE_LIMITS.minute || hourCount >= RATE_LIMITS.hour) {
      const retryAfter = minuteCount >= RATE_LIMITS.minute ? 60 : 3600;
      await this.ctx.storage.put("timestamps", timestamps);
      return new Response(JSON.stringify({
        error: "rate_limited",
        message: "Too many searches. Please try again shortly.",
        retryAfter
      }), {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retryAfter),
          "cache-control": "no-store"
        }
      });
    }

    timestamps.push(now);
    await this.ctx.storage.put("timestamps", timestamps);
    return new Response("ok");
  }
}

async function handleSearch(request, env) {
  const url = new URL(request.url);
  const query = cleanText(url.searchParams.get("q"), "");
  const color = normalizeHex(url.searchParams.get("color"));
  const pageRaw = Number(url.searchParams.get("page") || "1");
  const perSourceRaw = Number(url.searchParams.get("perSource") || "30");

  if (!query || query.length > MAX_QUERY_LENGTH) {
    return json({ error: "invalid_query", message: `Search must be 1–${MAX_QUERY_LENGTH} characters.` }, 400);
  }
  if (!color) {
    return json({ error: "invalid_color", message: "Use a 6-digit HEX color such as #8B5CF6." }, 400);
  }

  const page = Number.isInteger(pageRaw) ? Math.min(20, Math.max(1, pageRaw)) : 1;
  const perSource = Number.isInteger(perSourceRaw)
    ? Math.min(MAX_PER_SOURCE, Math.max(1, perSourceRaw))
    : 30;
  const colorFamily = nearestColorFamily(color);

  const cacheKey = new Request(url.toString(), request);
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  const started = Date.now();
  const providers = [
    ["google", searchSerpApi(query, page, perSource, env, colorFamily)],
    ["bing", searchSerpApiOrg(query, page, perSource, env, colorFamily)],
    ["pexels", searchPexels(query, page, perSource, env, color)],
    ["unsplash", searchUnsplash(query, page, perSource, env, colorFamily)]
  ];

  const settled = await Promise.allSettled(providers.map(([, promise]) => promise));
  const results = [];
  const providerStatus = {};

  settled.forEach((outcome, index) => {
    const [name] = providers[index];
    if (outcome.status === "fulfilled") {
      providerStatus[name] = { ok: true, count: outcome.value.length };
      results.push(...outcome.value);
    } else {
      providerStatus[name] = { ok: false, error: cleanText(outcome.reason?.message, "Provider unavailable") };
    }
  });

  const ranked = sortResults(deduplicate(results), color).slice(0, perSource * 4);
  const response = json({
    query,
    color,
    colorFamily,
    page,
    results: ranked,
    providers: providerStatus,
    tookMs: Date.now() - started
  });

  try {
    await caches.default.put(cacheKey, response.clone());
  } catch {
    // Cache availability is not required for a successful search response.
  }
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      });
    }

    if (url.pathname === "/api/health") {
      return json({
        ok: true,
        name: "HueFind",
        configured: {
          google: Boolean(env.SERPAPI_KEY),
          bing: Boolean(env.SERPAPI_ORG_KEY),
          pexels: Boolean(env.PEXELS_API_KEY),
          unsplash: Boolean(env.UNSPLASH_ACCESS_KEY)
        }
      }, 200, { "cache-control": "no-store" });
    }

    if (url.pathname === "/api/search") {
      const limited = await enforceRateLimit(request, env);
      if (limited) return limited;
      return handleSearch(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};
