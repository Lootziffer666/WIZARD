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
- [x] typecheck + lint + build grün, commit & push

## Current Structure

| File/Directory | Purpose |
|----------------|---------|
| `src/app/page.tsx` | Haupt-GUI (Galerie + Chat + Modals) |
| `src/app/api/chat/route.ts` | Claude-Proxy mit `search_assets` Tool-Loop |
| `src/lib/types.ts` | Asset/Catalog-Typen |
| `src/lib/search.ts` | Token-basierte Asset-Suche |
| `src/lib/sampleCatalog.ts` | 16 Beispiel-Assets |
| `src/components/AssetGallery.tsx` | Galerie + Filter |
| `src/components/ChatPanel.tsx` | Chat mit Claude |
| `src/components/SettingsModal.tsx` | API-Key/Modell |
| `src/components/ImportModal.tsx` | JSON-Import |
| `src/components/AssetCard.tsx` | Einzelne Asset-Karte |

## Current Focus

Nächste sinnvolle Schritte (noch nicht gebaut):
1. Echten UE-5.8-Asset-Export (MCP/Editor-Utility) → JSON erzeugen
2. Semantische Suche (Embeddings) statt reiner Token-Suche
3. Thumbnails aus UE exportieren (Data-URL im Katalog)
4. Optional: direkte UE-Anbindung via MCP statt nur Katalog-Import

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
