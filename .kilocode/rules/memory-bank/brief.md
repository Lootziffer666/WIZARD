# Project Brief: Asset Pilot (agentisches Kreativstudio)

## Was das Projekt wirklich ist

Kein Asset-Browser, sondern ein **intelligenter Produktionsassistent** für
Spiele-Entwicklung. Ziel: den Weg von einer Idee zum ersten spielbaren Prototyp
massiv verkürzen. Der Nutzer arbeitet auf Ideen-Ebene, nicht auf Asset-Ebene.

Die zentrale Ressource ist eine **SQLite-Wissensbasis** der eigenen Assets
(aktuelle Basis: 2.470 Assets aus Unity Asset Store + Fab, siehe `assets.txt`
bzw. `src/data/assets.json` und `data/assets.db`).

## LeitVision (Quelle: `assetpilot.md` im Repo-Root)

Asset Pilot ist Teil eines agentischen Studios mit festen Rollen:

| Rolle | Entität | Aufgabe |
|-------|---------|---------|
| Creative Director | GPT | Kontext, Stil, Creative Briefs, langfristiger Kontext |
| Ideen-Generator | mini-me | verrückte Konzepte, Genres, Mechaniken, Worldbuilding |
| Produktionsleiter | Asset Pilot | Assets suchen, Templates wählen, Starter Kits, Missing-Asset-Listen |
| Weltkleber | SHADED | visuelle Kohärenz durch Shader/Weltzustände |
| Raum-Sensor | 3D-RE-GEN | räumliche Szenenanalyse aus Bildern |
| Orchestrator | ANVIL | verbindet alle Schritte |
| Qualitäts-Türsteher | CUE-AGENT | prüft "belegbar spielbar" nach jedem Build |
| Werkstatt | Unreal in a Box | autonome Container-Umgebung (UE/UEFN, MCP, Screenshot-Agent) |

## Kernformel (aus der Vision)

`mini-me = Bedeutung · 3D-RE-GEN = Raum · Asset Pilot = Produktion ·
SHADED = Kohärenz · CUE-AGENT = Beweis · ANVIL = Orchestrierung`

Pipeline (Endziel):
`Idee → Absicht → Fähigkeiten → Räume → Assets → Weltlogik → spielbarer Prototyp`

## Wichtigste Prinzipien aus der Vision

- **Nicht nach Namen suchen**, sondern nach Stil/Genre/Atmosphäre ("visuelle Grammatik").
- **Assets casten statt bauen**: Asset bekommt eine Rolle in einer Szene.
- **Missing-Asset-Detection**: fehlende *Funktionen* erkennen, nicht nur Objekte.
- **Produktionsgedächtnis**: welches Asset bewährt sich in welchem Kontext.
- **TRON-Prinzip**: KI repräsentiert nicht die Welt, sie verbessert nur die
  Darstellung. Die Welt bleibt explizit/deterministisch (Bedingungen statt Pixel).
- **Mehrere Container**: domänenspezifische visuelle Grammatik pro Projekt.

## Aktueller, bereits gebauter Stand (MVP-Basis)

- SQLite-DB (`@libsql/client`, FTS5) mit 2.470 Assets, API `/api/assets`.
- KI-Chat (`/api/chat`) mit `search_assets`-Tool gegen die DB.
- Lokale Preview-Bilder (`data/images/<id>.img`) + `/api/image/[id]`.
- GUI (Galerie + Chat) lädt Katalog aus der DB.

## Nächste sinnvolle Schritte (noch nicht gebaut)

Siehe `context.md` → "Current Focus". Konkrete Kandidaten aus der Vision:
1. **Production-Brief-Modus**: aus Spielidee → kuratierter Starter-Kit + Missing-Asset-Liste.
2. **Stil/Genre/Atmosphären-Suche**: angereicherte Metadaten statt nur Namens-FTS.
3. **Asset-Casting**: Assets Rollen in einer Szene zuordnen.
4. **Templates/Quellen-Modell**: Fab/UEFN/LEGO/Star-Wars/Eigene unterscheiden.
