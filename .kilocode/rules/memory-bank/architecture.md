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
│   ├── db.ts                    # SQLite (@libsql/client, ASYNC) + FTS5, Seed aus assets.json
│   ├── brief.ts                 # buildProductionBrief() (Rollen-Starter-Kit)
│   └── types.ts                 # Asset-Typen
├── data/assets.json             # 2.470 geparste Assets (Seed-Quelle)
└── scripts/seed.mjs, analyze-images.mjs, download-images.mjs

data/
├── assets.db                    # vorgebaute SQLite-DB (committed)
└── images/<id>.img              # 2.470 lokale Preview-Bilder (committed)
```

## Schlüssel-Design-Entscheidungen

- **DB-Client ist `@libsql/client` und rein Promise-basiert.** JEDER
  `execute`/`executeMultiple`/`batch`-Aufruf MUSS awaited werden; `getDb()`
  liefert ein memoiziertes `Promise<Client>` (Schema + Seed abgeschlossen).
  Historischer Bug: Die Migration von better-sqlite3 auf libsql übernahm die
  synchrone Aufrufform — dadurch warf jede API-Route zur Laufzeit
  („Cannot read properties of undefined"). Nie wieder synchron aufrufen.
- **Positionale `?`-Parameter** über `args: [...]`.
- **FTS5**: `assets_fts` Virtual Table über `title, category, publisher, analysis`,
  `bm25()`-Ranking, Präfix-Match (`"token"*`). Die Galerie nutzt DIESE Suche
  über `/api/assets?q=` (debounced) — keine Client-Zweitsuche mehr.
- **Kategorie-Filter ist Contains-Match** (`LIKE '%…%'`): brief.ts filtert mit
  Rollen-Slugs wie `environments`, die realen Kategorien heißen
  `3d/environments/…` — ein Präfix-Match traf nie.
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
