# Active Context: Next.js Starter Template

## Current State

**Status**: ✅ AssetPilot GUI gebaut (KI-Asset-Suche für Unreal-Projekte)

Next.js 16 App mit einer klickbaren Oberfläche, die Claude über Tool-Use auf
einen Asset-Katalog zugreifen lässt (ohne alle Assets in den Kontext zu laden).
Zielgruppe: Nutzer ohne Unreal-/Programmierkenntnisse ("GUI für Doofis").

## Recently Completed

- [x] AssetPilot GUI: Galerie (Suche/Filter) + Claude-Chat-Panel
- [x] `search_assets` Tool (serverseitig) via Anthropic SDK
- [x] API-Route `/api/chat` mit Tool-Loop, apiKey aus Settings oder Env
- [x] ImportModal (JSON-Upload/Paste) + SettingsModal (API-Key/Modell)
- [x] Beispiel-Katalog mit 16 Assets (src/lib/sampleCatalog.ts)
- [x] **Echte Asset-Datenbank aus assets.txt**: 2470 Assets (Unity + Fab) geparst
      und in SQLite (better-sqlite3) mit FTS5-Volltextsuche geladen
- [x] `src/lib/db.ts`: SQLite/FTS5-Modul, `searchAssets`/`searchLibrary`/`getFacets`
- [x] `src/app/api/assets/route.ts`: GET-Endpoint (q/category/platform/publisher/limit, action=facets)
- [x] Chat-Route auf DB-Suche umgestellt (Tool-Schema an echte Felder angepasst,
      System-Prompt übersetzt DE→EN für Katalog-Suche)
- [x] GUI lädt Katalog jetzt aus `/api/assets` statt Sample-Katalog
- [x] **Fab-Preview-Pics lokal heruntergeladen**: alle 1437 Fab-Bilder → `data/images/<id>.img`
      via `scripts/download-images.mjs` (Konkurrenz 24, idempotent)
- [x] `src/app/api/image/[id]/route.ts`: liefert lokales Bild (Sniff Magic-Bytes → Content-Type),
      sonst 307-Redirect auf Original-URL (Remote-Fallback). Galerie nutzt `/api/image/<id>` als Thumbnail
- [x] `data/images/` ist **committed** (1437 Fab-Bilder, ~14MB) – liegen nicht mehr nur im ephemeren Sandbox-FS, sondern persistence im Repo/Deployment
- [x] typecheck + lint + build grün, commit & push

## Current Structure

| File/Directory | Purpose |
|----------------|---------|
| `src/app/page.tsx` | Haupt-GUI (Galerie + Chat) – lädt Katalog via `/api/assets` |
| `src/app/api/chat/route.ts` | Claude-Proxy mit DB-`search_assets` Tool-Loop |
| `src/app/api/assets/route.ts` | Asset-Suche/Facets API (FTS5) |
| `src/lib/db.ts` | SQLite (better-sqlite3) + FTS5, Seed aus `src/data/assets.json` |
| `src/lib/types.ts` | Asset/Catalog-Typen |
| `src/lib/search.ts` | Token-Suche (Client-Galerie, weiter genutzt) |
| `src/data/assets.json` | Geparste 2470 Assets (Quelle für Seed) |
| `data/assets.db` | Vorgebaute SQLite-DB (committed) |
| `scripts/seed.ts` | DB-Seed-Skript |
| `src/components/AssetGallery.tsx` | Galerie + Filter |
| `src/components/ChatPanel.tsx` | Chat mit Claude |
| `src/components/SettingsModal.tsx` | API-Key/Modell |
| `src/components/AssetCard.tsx` | Einzelne Asset-Karte |

## Current Focus

Nächste sinnvolle Schritte (noch nicht gebaut):
1. Semantische Suche (Embeddings) statt reiner Token/FTS5-Suche
2. Kategorie-/Plattform-Filter in der Galerie (aktuell nur Typ + Text)
3. Thumbnails größer / Lazy-Loading in Galerie
4. ImportModal wieder aktivieren (aktuell nicht eingebunden)

## Wichtige Hinweise

- **Runtime ist Node** (nicht Bun): `bun:sqlite` funktioniert NICHT; es wird
  `better-sqlite3` verwendet. `next.config.ts` setzt `serverExternalPackages`.
- Named-Parameter in better-sqlite3: JS-Objekt-Keys OHNE Sigil (`{id: ...}`),
  nicht `{ $id: ... }`. Im Code werden daher **positionale `?`** genutzt (sicher
  für beide Runtimes).
- `assets.txt` ist ein Browser-Console-Dump (CRLF, JS-Literal-Format). Parser in
  `/tmp/kilo/parse.mjs` (CRLF-Strip + Feld-Block-Regex).
- Build braucht `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` (Google Fonts).

## Quick Start Guide

### To add a new page:

Create a file at `src/app/[route]/page.tsx`:
```tsx
export default function NewPage() {
  return <div>New page content</div>;
}
```

### To add components:

Create `src/components/` directory and add components:
```tsx
// src/components/ui/Button.tsx
export function Button({ children }: { children: React.ReactNode }) {
  return <button className="px-4 py-2 bg-blue-600 text-white rounded">{children}</button>;
}
```

### To add a database:

Follow `.kilocode/recipes/add-database.md`

### To add API routes:

Create `src/app/api/[route]/route.ts`:
```tsx
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Hello" });
}
```

## Available Recipes

| Recipe | File | Use Case |
|--------|------|----------|
| Add Database | `.kilocode/recipes/add-database.md` | Data persistence with Drizzle + SQLite |

## Pending Improvements

- [ ] Add more recipes (auth, email, etc.)
- [ ] Add example components
- [ ] Add testing setup recipe

## Session History

| Date | Changes |
|------|---------|
| Initial | Template created with base setup |
