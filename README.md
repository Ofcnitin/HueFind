# HueFind

HueFind is a color-aware visual discovery app. A user enters anything they want to see, chooses a color with a color wheel or HEX value, and gets one unified masonry feed assembled from Google Images (SerpApi), Bing Images (SerpApi.org), Pexels, and Unsplash.

## Architecture

- Frontend: framework-free HTML/CSS/JavaScript for a small, fast static asset footprint.
- Backend: Cloudflare Worker.
- Static hosting: Cloudflare Workers Static Assets.
- Rate limiting: SQLite-backed Durable Object, keyed by client IP.
- Response caching: Cloudflare Cache API.
- Secrets: Cloudflare Worker secrets only.
- External image sources:
  - SerpApi Google Images
  - SerpApi.org Bing Images
  - Pexels
  - Unsplash

Cloudflare currently recommends Workers Static Assets for full-stack Worker applications and recommends SQLite-backed Durable Objects for new Durable Object namespaces.

## Required secrets

Set these in Cloudflare:

```text
SERPAPI_KEY
SERPAPI_ORG_KEY
PEXELS_API_KEY
UNSPLASH_ACCESS_KEY
```

For local development, copy `.dev.vars.example` to `.dev.vars` and fill the values. Never commit `.dev.vars`.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.dev.vars.example` to `.dev.vars`.
4. Fill the four API keys.
5. Run `npm run check`.
6. Run `npm run dev`.
7. Open the local URL printed by Wrangler.

## Cloudflare deployment

Authenticate Wrangler:

```bash
npx wrangler login
```

Set the secrets:

```bash
npx wrangler secret put SERPAPI_KEY
npx wrangler secret put SERPAPI_ORG_KEY
npx wrangler secret put PEXELS_API_KEY
npx wrangler secret put UNSPLASH_ACCESS_KEY
```

Deploy:

```bash
npm run deploy
```

The first deployment provisions the SQLite-backed `RateLimiter` Durable Object namespace from `wrangler.jsonc`.

## API

`GET /api/search?q=anime&color=%238B5CF6`

Optional:

- `page` — positive integer, default 1.
- `perSource` — 1–40, default 30.

The response is normalized into one schema regardless of provider.

## Ranking model

The backend deliberately does not download arbitrary third-party images to analyze pixels. Instead it uses the strongest color metadata each provider exposes:

- Pexels: exact HEX color filter plus `avg_color`.
- Unsplash: nearest supported color family plus returned `color`.
- Google/Bing: color wording is added to the query so the search engine itself biases results toward the selected theme.

Every result receives a source, relevance position, color score when provider metadata is available, and a deterministic final score. This avoids turning the Worker into an uncontrolled image proxy.

## Attribution / provider rules

The UI keeps source attribution and opens the original source page when an image is selected. Pexels and Unsplash usage/attribution requirements must be reviewed before production launch. Do not rehost provider images.

## Security

- API keys are never sent to the browser.
- The API rejects malformed/oversized search queries.
- Requests are rate-limited before external providers are called.
- Search responses are edge-cached.
- Provider failures are isolated with `Promise.allSettled`; one provider being unavailable does not break the entire feed.
