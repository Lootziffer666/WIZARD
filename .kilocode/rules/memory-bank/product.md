# Product Context: Asset Pilot

## Warum es existiert

Entwickler haben tausende Assets, aber kein Werkzeug, das aus einer *Idee* einen
Produktionsplan macht. Asset Pilot wendet die Bibliothek an, statt sie nur
durchzublättern.

## Probleme, die es löst

1. **Idee→Prototyp zu langsam**: keine Brücke von "Ko-op-Spiel für Jake & mich"
   zu konkreten Assets/Templates.
2. **Nur Namenssuche**: man findet "Star Wars Haus" nicht, aber "begehbare
   Wüstenarchitektur mit runden Türen, staubig, warmer Lichtstimmung" wäre der
   eigentliche Bedarf (visuelle Grammatik).
3. **Kein Produktionsgedächtnis**: welches Asset passt in welchen Kontext?
4. **Zusammengewürfelt statt Welt**: SHADED-Vereinheitlichung fehlt.

## Wie es funktionieren soll (User Flow – Zielbild)

1. Nutzer beschreibt Spielidee (natürlich, oft Deutsch).
2. Creative Director (GPT) + mini-me erzeugen Brief/Konzept.
3. Asset Pilot durchsucht die Bibliothek nach Stil/Genre/Atmosphäre/Inhalt.
4. Asset Pilot schlägt Templates (als Fähigkeiten) + Assets (gecastet) vor.
5. Missing-Asset-Liste + Starter-Kit werden erzeugt.
6. Optional: 3D-RE-GEN analysiert Referenzbilder räumlich.
7. SHADED vereinheitlicht die Welt; CUE-AGENT prüft Spielbarkeit.
8. Ergebnis: spielbarer UE/UEFN-Prototyp.

## Aktueller Stand (MVP-Basis ist live)

- `/api/assets` (FTS5-Suche + Facets), `/api/chat` (KI-Tool gegen DB),
  `/api/image/[id]` (lokale Previews), Galerie + Chat-GUI.
- Daten: 2.470 Assets (Unity + Fab), lokal heruntergeladene Previews.

## Experience-Ziele

- **Idee → konkrete Produktionsentscheidung**, nicht "bester Asset".
- **Richtig für diese Welt**, nicht nur technisch passend.
- **Belegbar spielbar** (CUE-AGENT), nicht "gut aussehend".

## Integrationspunkte

- DB: `src/lib/db.ts` (@libsql/client + FTS5), `data/assets.db`.
- Bilder: `data/images/<id>.img`, Route `/api/image/[id]`.
- KI: Anthropic SDK in `/api/chat`.
- Geplant: Templates-Quellen, Stil-Metadaten, 3D-RE-GEN, SHADED, ANVIL, CUE-AGENT.
