# System Patterns: Asset Pilot

## Architektur-Überblick (aktuell gebaut)

```
src/
├── app/
│   ├── page.tsx                 # GUI: Galerie + Chat (lädt Katalog via /api/assets)
│   ├── api/
│   │   ├── assets/route.ts      # GET: FTS5-Suche (q/category/platform/publisher) + facets
│   │   ├── chat/route.ts        # POST: Claude-Proxy mit search_assets-Tool-Loop
│   │   └── image/[id]/route.ts  # GET: lokales Bild (Magic-Bytes-Sniff) od. 307→Remote
│   └── layout.tsx, globals.css
├── components/
│   ├── AssetGallery.tsx, AssetCard.tsx, ChatPanel.tsx,
│   └── SettingsModal.tsx
├── lib/
│   ├── db.ts                    # SQLite (better-sqlite3) + FTS5, Seed aus assets.json
│   ├── types.ts                 # Asset/Catalog-Typen
│   └── search.ts                # Token-Suche (Client-Galerie)
├── data/assets.json             # 2.470 geparste Assets (Seed-Quelle)
└── scripts/seed.ts, download-images.mjs

data/
├── assets.db                    # vorgebaute SQLite-DB (committed)
└── images/<id>.img              # 2.470 lokale Preview-Bilder (committed)
```

## Schlüssel-Design-Entscheidungen

- **Runtime ist Node** → `better-sqlite3` (nicht `bun:sqlite`). `next.config.ts`
  setzt `serverExternalPackages`.
- **Named Parameter**: better-sqlite3 erwartet JS-Keys OHNE Sigil → im Code
  werden **positionale `?`** genutzt (sicher für beide Runtimes).
- **FTS5**: `assets_fts` Virtual Table über `title, category, publisher`,
  `bm25()`-Ranking, Präfix-Match (`"token"*`).
- **Bilder**: Ursprungs-URL in DB; lokal gespiegelt in `data/images/<id>.img`;
  Route dient als einheitlicher Endpunkt mit Remote-Fallback.
- **assets.txt** ist ein Browser-Console-Dump (CRLF, JS-Literal). Parser nutzt
  CRLF-Strip + Feld-Block-Regex.

## Geplante/angestrebte Komponenten (aus assetpilot.md)

| Komponente | Zweck | Status |
|------------|-------|--------|
| Creative Director (GPT) | Brief/Kontext/Stil | Konzept |
| mini-me | Ideen-/Genre-Generator | Konzept |
| Asset Pilot | Produktionsleiter, Suche, Starter Kits, Missing-Asset-Listen | **MVP gebaut** |
| 3D-RE-GEN | räumliche Szenenanalyse aus Bildern | extern/Konzept |
| SHADED | Weltzustands-/Kohärenz-System (Shader) | Konzept |
| ANVIL | Orchestrator über alle Schritte | Konzept |
| CUE-AGENT | Qualitäts-/Spielbarkeits-Prüfer | Konzept |
| Unreal in a Box | autonomer Container (UE/UEFN/MCP) | Infrastruktur |

## Styling

- Tailwind CSS 4, dunkles Theme (neutral-950 Oberfläche, emerald-Akzente).

## State Management

- Galerie/Chat sind Client Components; Daten kommen aus `/api/assets`.
- KI-Fund-IDs (`foundIds`) werden vom Chat zurückgegeben und in der Galerie
  hervorgehoben.
