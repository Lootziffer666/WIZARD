# WIZARD

**Production Lead in the Agent-Driven Game Studio Ecosystem**

WIZARD (formerly Asset Pilot) translates game ideas into suitable assets, serves as the central knowledge base, and acts as the interface between creative vision and available materials.

---

## Overview

WIZARD is not just a simple asset database search tool—it understands production intent. Users describe an idea (e.g., "a coop game for Jake and me in a dusty desert town with improvised tech"), and WIZARD delivers not only individual assets but:

- Role-based starter kits (Environment, Characters, Props, Materials, Audio, VFX, UI)
- Missing asset lists—what's still needed for production
- Semantic search by style, atmosphere, genre—not just by name
- Chat interface powered by Claude that uses the asset database as a tool

### Position in the Ecosystem

```
mini-me (Idea)
 ↓
WIZARD (Assets + Starter Kit + Production Brief)
 ↓
SWIFT (2D/3D Decision → Procedural Sprite Sheets)
 ↓
SHADED (World Cohesion, visuals without scripting)
 ↓
CUE-AGENT (Playability Check)
```

ANVIL orchestrates the entire process. WIZARD is the production lead—it knows which assets are available, which are missing, and how to translate an idea into existing resources.

---

## Tech Stack

| Layer      | Technology                   |
|------------|------------------------------|
| Framework  | Next.js 16 (App Router)      |
| UI         | React 19 + Tailwind CSS v4   |
| Database   | SQLite via @libsql/client (WASM, no native build) |
| AI         | Anthropic Claude API (tool-calling, Chat Interface) |
| Search     | SQLite FTS5 (Full-text search, bm25 ranking) |
| Deployment | Vercel (recommended) or any Node.js host |

Important: The app uses bun as the package manager. For Vercel, it automatically switches.

---

## Features

### 1. Semantic Asset Search

The database contains 2,470 assets from the Unity Asset Store and Fab. Search works by:
- Title/Name
- Category (e.g., 3d/props, audio/sound-fx, vfx/particles)
- Publisher
- Platform (unity or fab)
- Style/Atmosphere (evaluated from previews): dusty, medieval, neon, horror, sci-fi, desert, cute, urban …
- Free-text combinations

### 2. AI Chat (Claude)

The chat interface on the right in the UI is a full-featured Claude agent with two tools:

**search_assets** — Free-text search in the database with style/atmosphere, category, publisher, and platform.

**build_production_brief** — From a game idea (in German or English), a complete role-based starter kit is generated:
- Environment, Characters, Props, Materials, Audio, VFX, UI
- Up to 4 suitable assets per role
- Missing asset list: which roles are underserved

The chat responds in German and automatically translates search terms to English when necessary.

### 3. Asset Gallery

- Fast client-side full-text search across the loaded catalog
- Filter by asset type (StaticMesh, SkeletalMesh, Material, Texture, Blueprint, Animation, Sound, Particle)
- Highlight mode: show only assets found by the AI chat
- Clicking an asset opens a modal with all details, tags, and store link

### 4. Healthcheck

GET `/api/health` returns DB status, path, mode, and asset count. Used for debugging and deployment validation.

---

## Setup

### Prerequisites

- Node.js 20+ or Bun 1.x
- Git

### Local Setup

```bash
git clone https://github.com/Lootziffer666/WIZARD.git
cd WIZARD
bun install # ← bun, not npm
bun dev # → http://localhost:3000
```

> Note: The app uses bun as its runtime. If you prefer npm, you can replace bun with npm in all commands—it works, but the lockfile is optimized for bun.

When first started, the database is automatically created from `src/data/assets.json` (1.1 MB, 2,470 assets).

### Adding API Key

Click the ⚙️ icon in the top right → click on API Key → enter your Anthropic API key. The key is stored in localStorage and never transmitted to third parties.

---

## Database

### Structure

```sql
assets (
 id TEXT PRIMARY KEY,
 title TEXT,
 category TEXT, -- e.g. "3d/props/weapons"
 publisher TEXT,
 platform TEXT, -- "unity" or "fab"
 url TEXT, -- Store link
 image TEXT, -- CDN preview URL
 addedAt INTEGER,
 analysis TEXT -- AI analysis field (room for later)
)

assets_fts (FTS5 virtual table)
 id, title, category, publisher, analysis
 tokenize = unicode61
```

### Modes

**Local (default for development and self-hosting):**

```env
DATABASE_PATH=./data/assets.db
```

→ LibSQL opens the local SQLite file.

**Remote (Turso/Cloudflare D1, etc.):**

```env
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token
```

→ LibSQL connects to a remote database. The local seed is bypassed.

### Adding/Extending the Database

To add new assets, add them to `src/data/assets.json` following the same format. They will be automatically added to the database on the next start (seed protection: only when `COUNT(*) == 0`).

---

## Deployment on Vercel (Recommended)

### 1. Push to GitHub

If not done yet:

```bash
git remote add origin https://github.com/YOUR-USERNAME/WIZARD.git
git push -u origin main
```

### 2. Import on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Select your GitHub repo
2. Framework: Next.js (detected automatically)
3. Root Directory: `.` (or `wizard/`)
4. Add Environment Variables:
   - `ANTHROPIC_API_KEY` → Your Claude API Key
   - `DATABASE_URL` (optional, only for Turso/Remote DB)
   - `DATABASE_AUTH_TOKEN` (optional, only for Turso)
5. Click Deploy

### 3. Custom Domain

In Vercel → Project Settings → Domains → Enter your domain. Set DNS records according to Vercel's instructions.

---

## File Structure

```
WIZARD/
├── assetpilot.md # Brainstorming document (Vision, Pipeline, Roadmap)
├── src/
│ ├── app/
│ │ ├── page.tsx # Main page (Gallery + Chat)
│ │ ├── layout.tsx # App Shell
│ │ ├── api/
│ │ │ ├── assets/route.ts # GET /api/assets?q=&category=&platform=…
│ │ │ ├── chat/route.ts # POST /api/chat (Claude + Tool-Calling)
│ │ │ ├── health/route.ts # GET /api/health (DB Status)
│ │ │ └── image/[id]/ # GET /api/image/:id (Thumbnail Proxy)
│ ├── components/
│ │ ├── AssetGallery.tsx # Search Gallery + Filter
│ │ ├── AssetCard.tsx # Individual Asset Card
│ │ ├── ChatPanel.tsx # AI Chat Interface
│ │ ├── ImportModal.tsx # (Present, possibly for import use)
│ │ └── SettingsModal.tsx # API Key Settings
│ ├── lib/
│ │ ├── db.ts # LibSQL Client + All DB Operations
│ │ ├── brief.ts # buildProductionBrief() for Starter Kits
│ │ ├── search.ts # Client-Side Search Helpers
│ │ ├── types.ts # TypeScript Types
│ │ └── sampleCatalog.ts # Fallback Catalog (German, unused)
│ └── data/
│ └── assets.json # Seed File (2,470 Assets, 1.1 MB)
├── data/
│ ├── assets.db # Runtime DB (Created on first start)
│ └── images/ # 2,470 .img Thumbnails
├── package.json
├── next.config.ts
├── tsconfig.json
└── bun.lock(b) # Bun Lockfile (npm-compatible)
```

---

## Roadmap

### Immediate / Quick Wins

1. **Vercel Deployment** — You and your son should be able to access it from anywhere. This is the most important step.
2. **Thumbnail Check** — `/api/image/[id]` works for local `.img` files. In Vercel deployment without the images folder, it redirects to the CDN URL from the database. Check if that's sufficient or if blob storage is needed.
3. **Export Production Brief** — `buildProductionBrief()` already yields good results. A "Save" button to export the result as Markdown/JSON would be immediately useful.

### Mid-Term

4. **Missing Asset Workflow** — The missing asset list from the production brief becomes a real ticket/issue. Later, ANVIL could use this as a feedback loop.
5. **SWIFT Integration** — SWIFT can generate sprite sheets for SHADED from FBX models. A "Start SWIFT Request" action in WIZARD that calls the SWIFT CLI and shows the result in SHADED.
6. **Multilingual Support** — UI is currently in German. Chat understands mixed German/English. If your son prefers to work in English, a toggle would be useful.

### Architecture / Larger Projects

7. **ANVIL as Orchestrator** — WIZARD knows which assets it has and which are missing. ANVIL then drives the process: Idea → WIZARD → SWIFT → SHADED → CUE-AGENT → Feedback → Iteration.
8. **Turso Remote DB** — In case the local SQLite doesn't suffice in the long term (multi-user, device synchronization). Turso has a generous free tier.
9. **3D-RE-GEN** — Own tool as an alternative to external projects. WIZARD receives an object list, room structure, and floor height from a reference image analysis—and can then suggest appropriate assets.
10. **User-Specific Experience** — Over time, WIZARD should learn which assets go well together ("this asset works in dusty desert scenes, but not in snow"). The `analysis` field in the DB is prepared for this.

---

## Short Commands

```bash
bun dev # Development server
bun build # Production build
bun start # Production server
bun typecheck # TypeScript check
bun lint # ESLint
```
