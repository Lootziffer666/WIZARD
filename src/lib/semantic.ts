/**
 * Semantik-Suche (assetpilot.md: „Visuelle Grammatik" — nicht „Star Wars"
 * suchen, sondern Wüste + Adobe-Architektur + warme Farbpalette + verwittert).
 *
 * Zwei deterministische, key-freie Schichten über der FTS-Suche:
 *
 * 1. **Bilinguale Konzept-Expansion**: deutsche/konzeptuelle Suchbegriffe
 *    werden auf englische Katalog-Vokabeln aufgefächert (wüste → desert sand
 *    dune arid …), damit Stil-/Atmosphäre-Anfragen den englischen Katalog
 *    treffen.
 * 2. **Trigramm-Hash-Embeddings**: Kandidaten (FTS-OR über die expandierte
 *    Query) werden per Kosinus-Ähnlichkeit von Zeichen-Trigramm-Vektoren
 *    reranked. Das ist robust gegen Teilwörter/Tippfehler und braucht weder
 *    API-Key noch Vektor-Datenbank.
 *
 * Der gleiche Codepfad kann später echte Embeddings nutzen (OpenAI-kompatibler
 * /v1/embeddings-Endpoint): nur `textVector` durch den Provider ersetzen —
 * Kandidatensuche, Kosinus und Ranking bleiben identisch.
 */

import { searchLibrary, type LibraryAsset } from "./db";

const DIM = 256;

/** Konzept → Katalog-Vokabeln (bewusst kompakt; erweiterbar ohne Migration). */
const CONCEPTS: Record<string, string[]> = {
  wüste: ["desert", "sand", "dune", "arid", "canyon"],
  desert: ["sand", "dune", "arid", "canyon"],
  staubig: ["dusty", "dust", "weathered"],
  dusty: ["dust", "weathered", "worn"],
  mittelalter: ["medieval", "castle", "knight", "village"],
  medieval: ["castle", "knight", "village", "tavern"],
  fachwerk: ["timber", "half-timbered", "medieval", "village"],
  märchen: ["fairy", "fantasy", "whimsical", "storybook"],
  fairy: ["fantasy", "whimsical", "magical"],
  horror: ["creepy", "haunted", "dark", "abandoned"],
  gruselig: ["horror", "creepy", "haunted", "dark"],
  wald: ["forest", "tree", "woodland", "nature"],
  forest: ["tree", "woodland", "nature", "foliage"],
  stadt: ["city", "urban", "town", "street"],
  dorf: ["village", "town", "rural", "medieval"],
  raumschiff: ["spaceship", "sci-fi", "space", "starship"],
  scifi: ["sci-fi", "futuristic", "space", "cyber"],
  futuristisch: ["futuristic", "sci-fi", "neon", "cyber"],
  verwittert: ["weathered", "worn", "old", "rustic", "damaged"],
  kaputt: ["broken", "damaged", "ruined", "destroyed"],
  improvisiert: ["improvised", "makeshift", "scrap", "junk"],
  technik: ["tech", "machine", "device", "electronics"],
  gemütlich: ["cozy", "warm", "interior", "tavern"],
  wasser: ["water", "ocean", "river", "lake"],
  winter: ["snow", "ice", "frozen", "cold"],
  schnee: ["snow", "winter", "ice", "frozen"],
  waffe: ["weapon", "sword", "gun", "combat"],
  musik: ["music", "soundtrack", "ambient", "theme"],
  charakter: ["character", "creature", "npc", "hero"],
  held: ["hero", "character", "knight", "warrior"],
  fotogrammetrie: ["photogrammetry", "scan", "megascans", "realistic"],
  photogrammetry: ["scan", "megascans", "realistic"],
  megascans: ["quixel", "photogrammetry", "scan", "surface"],
  realistisch: ["realistic", "photogrammetry", "scanned", "pbr"],
  mensch: ["human", "character", "metahuman", "person"],
  human: ["character", "metahuman", "person"],
};

/** Query um Konzept-Vokabeln erweitern (behält Original-Tokens). */
export function expandQuery(query: string): string {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set<string>(tokens);
  for (const t of tokens) {
    for (const syn of CONCEPTS[t] ?? []) out.add(syn);
  }
  return [...out].join(" ");
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Zeichen-Trigramm-Hash-Vektor, L2-normalisiert. Deterministisch, key-frei. */
export function textVector(text: string): Float64Array {
  const v = new Float64Array(DIM);
  const norm = ` ${text.toLowerCase().replace(/[^a-z0-9äöüß ]+/g, " ").replace(/\s+/g, " ").trim()} `;
  for (let i = 0; i + 3 <= norm.length; i++) {
    const tri = norm.slice(i, i + 3);
    const h = fnv1a(tri);
    v[h % DIM] += 1 + ((h >>> 8) % 3) * 0.25; // leichte Hash-Gewichtung gegen Kollisions-Gleichstand
  }
  let len = 0;
  for (let i = 0; i < DIM; i++) len += v[i] * v[i];
  len = Math.sqrt(len) || 1;
  for (let i = 0; i < DIM; i++) v[i] /= len;
  return v;
}

export function cosine(a: Float64Array, b: Float64Array): number {
  let dot = 0;
  for (let i = 0; i < DIM; i++) dot += a[i] * b[i];
  return dot;
}

export interface SemanticHit extends LibraryAsset {
  similarity: number;
}

/**
 * Semantische Suche: expandierte OR-FTS liefert Kandidaten, Trigramm-Kosinus
 * rerankt sie gegen die (expandierte) Query.
 */
export async function semanticSearch(params: {
  query: string;
  category?: string;
  platform?: string;
  publisher?: string;
  limit?: number;
}): Promise<SemanticHit[]> {
  const { query, category, platform, publisher, limit = 20 } = params;
  const expanded = expandQuery(query);

  const candidates = await searchLibrary({
    query: expanded,
    category,
    platform,
    publisher,
    matchMode: "or",
    limit: Math.max(limit * 10, 120),
  });

  const qVec = textVector(expanded);
  const scored = candidates.map((c) => ({
    ...c,
    similarity: Number(cosine(qVec, textVector(`${c.title} ${c.category} ${c.publisher} ${c.analysis ?? ""}`)).toFixed(4)),
  }));
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}
