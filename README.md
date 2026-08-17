🎨 HueFind

Find anything. Discover it in your color.

[🚀 Live Demo — HueFind](https://huefind.ofcnitin.workers.dev?utm_source=chatgpt.com)

HueFind is a color-aware visual discovery engine built for people who don't just want to search for something — they want to discover it in a specific visual mood, tone, and color.

Type what you're looking for, choose a color from the wheel or enter a HEX code, and HueFind brings visual results together into one beautiful, unified feed. 🌈


---

✨ What makes HueFind different?

Traditional image search asks:

> "What are you looking for?"



HueFind asks:

> "What are you looking for — and what should it feel like?" 🎨



🔎 Search anything

Search for virtually anything:

🐕 Dogs

🐈 Cats

🎌 Anime

🌿 Nature

🏙️ Architecture

🎮 Gaming

👗 Fashion

🖼️ Art

🌌 Aesthetic wallpapers

🎨 Color palettes


Your imagination is the limit.

🎨 Search by color

Choose your visual theme using:

🌈 Interactive color wheel

🔢 HEX color input

🎲 Random color generation


For example:

Query:   "Japanese street"
Color:   #8B5CF6

HueFind searches for imagery matching both the subject and your chosen color direction.


---

🌐 Multiple sources. One feed.

HueFind combines results from multiple image-search providers into a single experience:

Source	Integration

🔍 Google Images	SerpApi
🔎 Bing Images	SerpApi.org
📸 Pexels	Pexels API
🌄 Unsplash	Unsplash API


Instead of jumping between different websites, HueFind aggregates the results into one unified masonry feed.


---

🧠 Smart Result Ranking

Every result is processed through HueFind's ranking system.

Results consider factors such as:

🎯 Search relevance

🎨 Color relevance

📍 Provider ranking

🔗 Source quality

🧹 Duplicate removal


The result is a feed designed to surface the most useful visuals first.


---

🖥️ Designed like a physical interface

HueFind intentionally uses a skeuomorphic visual language rather than another flat modern dashboard.

Think:

> 🖥️ Physical controls
🎛️ Tactile buttons
🎨 Color controls
🗂️ Visual cards
✨ Subtle depth & shadows



The goal is to make searching feel more like interacting with an instrument than filling out a form.


---

⚡ Architecture

┌───────────────┐
                    │    HueFind    │
                    │   Frontend    │
                    └───────┬───────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │ Cloudflare      │
                   │ Worker          │
                   └────────┬────────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        🔍 Google       🔎 Bing        📸 Pexels
        Images          Images
             │              │              │
             └──────────────┼──────────────┘
                            │
                            ▼
                       🌄 Unsplash
                            │
                            ▼
                  ┌──────────────────┐
                  │ Normalize        │
                  │ Deduplicate      │
                  │ Rank             │
                  │ Cache            │
                  └────────┬─────────┘
                           │
                           ▼
                    🎨 HueFind Feed

🛠️ Built with

Frontend: HTML · CSS · JavaScript

Backend: Cloudflare Workers

Static Assets: Cloudflare Workers Static Assets

Rate Limiting: Cloudflare Durable Objects

Caching: Cloudflare Cache API

Source Control: GitHub

API Secrets: Cloudflare Secrets


No unnecessary backend platform.
No exposed API keys.
No third-party database required. 🔐


---

🔐 Security

HueFind keeps provider credentials away from the browser.

Browser
   │
   │ Search request
   ▼
Cloudflare Worker
   │
   ├── 🔐 API Secrets
   ├── 🛡️ Rate Limiting
   ├── ⚡ Cache
   │
   ▼
Image APIs

Security features

🔒 API keys remain server-side

🛡️ IP-based rate limiting

⚡ Edge caching

🧹 Input validation

🔗 HTTPS-only external URLs

🧩 Provider failure isolation



---

🚀 Getting Started

1. Clone the repository

git clone https://github.com/Ofcnitin/HueFind.git
cd HueFind

2. Install dependencies

npm install

3. Configure local secrets

Copy:

.dev.vars.example

to:

.dev.vars

Then add:

SERPAPI_KEY=
SERPAPI_ORG_KEY=
PEXELS_API_KEY=
UNSPLASH_ACCESS_KEY=

> ⚠️ Never commit .dev.vars.



4. Run checks

npm run check

5. Start development

npm run dev


---

☁️ Cloudflare Deployment

Authenticate Wrangler:

npx wrangler login

Add your secrets:

npx wrangler secret put SERPAPI_KEY
npx wrangler secret put SERPAPI_ORG_KEY
npx wrangler secret put PEXELS_API_KEY
npx wrangler secret put UNSPLASH_ACCESS_KEY

Deploy:

npm run deploy


---

🎯 Example

Imagine you want:

> "Cyberpunk city"



and choose:

#00FFFF

HueFind transforms that into a color-aware visual search and returns a unified collection of imagery with a cyan/blue visual direction. 🌃💠

Or:

> "Anime girl" + #FF69B4



💗 → pink-toned visual discovery.

Or:

> "Forest" + #228B22



🌲 → green-toned imagery.


---

📸 Attribution

HueFind surfaces imagery from third-party providers and preserves source information.

Images remain hosted by their respective providers; HueFind does not rehost the images.

Always review the current usage and attribution requirements of:

SerpApi

SerpApi.org

Pexels

Unsplash


before deploying a public production service.


---

🗺️ Roadmap

HueFind is currently focused on its core experience.

Potential future improvements:

[ ] ♾️ Infinite visual discovery

[ ] 🎨 More advanced color matching

[ ] 🧠 Improved semantic search

[ ] 🖼️ Image similarity search

[ ] ❤️ Personal collections

[ ] 📌 Save / organize discoveries

[ ] 🌈 Multi-color palettes

[ ] 🔀 Advanced visual filters

[ ] 📱 Progressive Web App support



---

🤝 Contributing

Ideas, improvements, and bug reports are welcome.

If you find something that could make HueFind better:

1. ⭐ Star the repository


2. 🍴 Fork the project


3. 🛠️ Make your changes


4. 📤 Open a pull request




---

