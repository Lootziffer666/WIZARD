# Active Context: Asset Pilot

## Current State

**Status**: ✅ AssetPilot MVP gebaut (KI-gestützte Asset-Suche + lokale Previews)

Nächste Evolutionsstufe: **agentisches Kreativstudio** (siehe `assetpilot.md`
im Repo-Root – die neue Leitvision). Asset Pilot wird vom Asset-Browser zum
*Produktionsleiter*, der aus einer Spielidee Starter Kits + Missing-Asset-Listen
erzeugt und Assets nach Stil/Genre/Atmosphäre (visuelle Grammatik) castet.

## Recently Completed

- [x] AssetPilot GUI: Galerie (Suche/Filter) + Claude-Chat-Panel
- [x] `search_assets` Tool (serverseitig) via Anthropic SDK
- [x] API-Route `/api/chat` mit Tool-Loop, apiKey aus Settings oder Env
- [x] SettingsModal (API-Key/Modell); ImportModal + sampleCatalog entfernt (toter Code)
- [x] **Echte Asset-Datenbank aus assets.txt**: 2470 Assets (Unity + Fab) geparst
      und in SQLite (@libsql/client) mit FTS5-Volltextsuche geladen
- [x] **2026-07-10 Sanierung**: db.ts vollständig async (libsql ist Promise-basiert —
      die libsql-Migration hatte JEDE API-Route zur Laufzeit gebrochen), Galerie auf
      Server-FTS umgestellt (`/api/assets?q=`, debounced, `ids`-Param für KI-Treffer),
      Image-Route-Importe + fehlendes await gefixt, brief.ts-Kategorie-Match
      Präfix→Contains (Rollen waren immer leer), seed.mjs/analyze-images.mjs auf
      libsql portiert, scripts/seed.ts gelöscht
- [x] `src/lib/db.ts`: SQLite/FTS5-Modul, `searchAssets`/`searchLibrary`/`getFacets`
- [x] `src/app/api/assets/route.ts`: GET-Endpoint (q/category/platform/publisher/limit, action=facets)
- [x] Chat-Route auf DB-Suche umgestellt (Tool-Schema an echte Felder angepasst,
      System-Prompt übersetzt DE→EN für Katalog-Suche)
- [x] GUI lädt Katalog jetzt aus `/api/assets` statt Sample-Katalog
- [x] **Fab-Preview-Pics lokal heruntergeladen**: alle 1437 Fab-Bilder → `data/images/<id>.img`
      via `scripts/download-images.mjs` (Konkurrenz 24, idempotent)
- [x] `src/app/api/image/[id]/route.ts`: liefert lokales Bild (Sniff Magic-Bytes → Content-Type),
      sonst 307-Redirect auf Original-URL (Remote-Fallback). Galerie nutzt `/api/image/<id>` als Thumbnail
- [x] `data/images/` ist **committed** (alle 2470 Bilder Fab+Unity, ~52MB) – persist im Repo/Deployment; Route liefert sie lokal aus, Remote-Redirect nur noch als Fallback
- [x] typecheck + lint + build grün, commit & push

## Current Structure

| File/Directory | Purpose |
|----------------|---------|
| `src/app/page.tsx` | Haupt-GUI (Galerie + Chat) – lädt Katalog via `/api/assets` |
| `src/app/api/chat/route.ts` | Claude-Proxy mit DB-`search_assets` Tool-Loop |
| `src/app/api/assets/route.ts` | Asset-Suche/Facets API (FTS5) |
| `src/lib/db.ts` | SQLite (@libsql/client, async) + FTS5, Seed aus `src/data/assets.json` |
| `src/lib/brief.ts` | buildProductionBrief() (Rollen-Starter-Kit + Missing-Assets) |
| `src/lib/types.ts` | Asset-Typen |
| `src/data/assets.json` | Geparste 2470 Assets (Quelle für Seed) |
| `data/assets.db` | Vorgebaute SQLite-DB (committed) |
| `scripts/seed.mjs` | DB-Seed-Skript (libsql) |
| `scripts/analyze-images.mjs` | Style-Tag-Anreicherung (heuristisch oder --vision) |
| `src/components/AssetGallery.tsx` | Galerie + Filter |
| `src/components/ChatPanel.tsx` | Chat mit Claude |
| `src/components/SettingsModal.tsx` | API-Key/Modell |
| `src/components/AssetCard.tsx` | Einzelne Asset-Karte |

## Current Focus

Nächste Schritte, abgeleitet aus `assetpilot.md` (Vision: agentisches Studio).
Konkrete, mit der vorhandenen DB/Assets umsetzbare Kandidaten:

1. **Production-Brief-Modus** (höchste Priorität laut Vision):
   Aus einer Spielidee → kuratierter *Starter Kit* + *Missing-Asset-Liste*.
   Neue API + KI-Tool, das Brief in Kategorie/Stil-Filter übersetzt.
2. **Stil/Genre/Atmosphären-Suche** ("visuelle Grammatik"):
   Angereicherte Metadaten statt nur Namens-FTS5. Quelle: Kategorie-Taxonomie
   + abgeleitete Stichworte (Wüste, Urban, Fantasy, Horror, Cartoon, Realistisch …).
3. **Asset-Casting**: Asset bekommt eine *Rolle* in einer Szene (nicht nur Treffer).
4. **Quellen-Modell**: Fab / UEFN / LEGO / Star-Wars / Eigene unterscheiden
   (DB-Spalte `source` ergänzen).
5. **Semantische Suche (Embeddings)** als langfristiges Upgrade der FTS5-Suche.
6. **Templates-Fähigkeiten**: 38 Genre-Templates als "Fähigkeiten" modellieren.

Noch offen / externe Systeme (Konzept, nicht im Repo):
mini-me, Creative Director (GPT), 3D-RE-GEN, SHADED, ANVIL, CUE-AGENT,
Unreal in a Box. Diese sind Teil der Vision, aber eigene Baustellen.

## Session History

- 2026-07-07: assets.txt geparst → SQLite/FTS5-DB (2470 Assets), KI-Chat an DB
  angeschlossen, lokale Previews (alle 2470) heruntergeladen + committet.
- 2026-07-07: `assetpilot.md` (Vision-Brainstorming) ins Repo gelegt → Scope
  erweitert sich zum agentischen Kreativstudio. Memory-Bank an Vision angepasst
  (brief/product/architecture/context).

## Wichtige Hinweise

- **DB-Client ist `@libsql/client` und rein ASYNC** — jeder execute/batch-Aufruf
  muss awaited werden; `getDb()` liefert `Promise<Client>`. Die frühere
  better-sqlite3-Doku ist obsolet; ein synchroner Aufrufstil bricht ALLE Routen.
- Positionale `?`-Parameter über `args: [...]`.
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
