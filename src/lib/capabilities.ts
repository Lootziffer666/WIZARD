/**
 * Templates als Fähigkeiten (assetpilot.md: „Templates nicht als Genres
 * betrachten, sondern als Sammlung von Fähigkeiten" + „Feature Casting").
 *
 * Statt „Coop Template" zu suchen, wird eine Spielidee deterministisch in
 * benötigte FÄHIGKEITEN zerlegt (Inventar, Quests, Multiplayer, …). Für jede
 * Fähigkeit werden passende Systeme/Templates aus dem Katalog gecastet; was
 * kaum abgedeckt ist, landet als FEHLENDE FUNKTION auf der Missing-Liste
 * („Uns fehlt kein Turm — uns fehlt eine Landmarke").
 */

import { searchLibrary, type LibraryAsset } from "./db";

export type CapabilityId =
  | "inventory"
  | "quest"
  | "savegame"
  | "camera"
  | "multiplayer"
  | "crafting"
  | "vehicles"
  | "combat"
  | "dialogue"
  | "ai"
  | "ui";

interface CapabilityDef {
  id: CapabilityId;
  label: string;
  /** OR-verknüpfte FTS-Suchwörter (englischer Katalog). */
  terms: string[];
  /** Optionale Kategorie-Präfixe, die zuerst probiert werden. */
  categories?: string[];
}

export const CAPABILITIES: CapabilityDef[] = [
  { id: "inventory", label: "Inventar", terms: ["inventory", "loot", "item"], categories: ["game-mechanics", "gameplay-features"] },
  { id: "quest", label: "Questsystem", terms: ["quest", "mission", "objective"], categories: ["game-mechanics", "rpg"] },
  { id: "savegame", label: "Savegame", terms: ["save", "persistence", "serialization"], categories: ["tools"] },
  { id: "camera", label: "Kamera", terms: ["camera", "cinemachine", "follow"], categories: ["tools"] },
  { id: "multiplayer", label: "Multiplayer", terms: ["multiplayer", "network", "coop", "lobby"], categories: ["network-multiplayer"] },
  { id: "crafting", label: "Crafting", terms: ["crafting", "building", "resource"], categories: ["game-mechanics", "simulation"] },
  { id: "vehicles", label: "Fahrzeuge", terms: ["vehicle", "car", "driving"], categories: ["vehicles-transportation", "racing"] },
  { id: "combat", label: "Kampf", terms: ["combat", "weapon", "melee", "shooter"], categories: ["combat", "weapons-combat", "spells-combat", "shooter"] },
  { id: "dialogue", label: "Dialoge", terms: ["dialogue", "dialog", "conversation"], categories: ["dialog-systems"] },
  { id: "ai", label: "AI", terms: ["ai", "behavior", "pathfinding", "npc"], categories: ["artificial-intelligence"] },
  { id: "ui", label: "UI", terms: ["ui", "hud", "menu", "gui"], categories: ["gui-kit", "widgets", "icons"] },
];

interface CastRule {
  re: RegExp;
  caps: CapabilityId[];
  why: string;
}

const CAST_RULES: CastRule[] = [
  { re: /coop|koop|multiplayer|zusammen|together|zu zweit|for .* and me/i, caps: ["multiplayer", "camera"], why: "Koop/Multiplayer → Netzwerk + geteilte Kamera" },
  { re: /quest|mission|bürokratie|bureaucracy|aufgaben|fetch/i, caps: ["quest", "dialogue"], why: "Quests/Bürokratie → Questsystem + Dialoge" },
  { re: /rpg|adventure|story|märchen|fairy|erzähl/i, caps: ["dialogue", "quest", "savegame", "inventory"], why: "RPG/Story → Dialoge, Quests, Speichern, Inventar" },
  { re: /craft|bauen|build|sammeln|gather|survival/i, caps: ["crafting", "inventory", "savegame"], why: "Crafting/Survival → Crafting, Inventar, Speichern" },
  { re: /fahr|vehicle|car|race|rennen|driving/i, caps: ["vehicles"], why: "Fahren/Rennen → Fahrzeuge" },
  { re: /kampf|combat|fight|battle|shooter|schie(ß|ss)/i, caps: ["combat", "ai"], why: "Kampf → Kampfsystem + Gegner-AI" },
  { re: /npc|händler|merchant|bewohner|villager|enem(y|ies)|gegner/i, caps: ["ai", "dialogue"], why: "NPCs → AI + Dialoge" },
  { re: /stealth|schleich|chase|verfolgung|parkour/i, caps: ["ai", "camera"], why: "Stealth/Chase → AI-Wahrnehmung + Kamera" },
  { re: /inventar|inventory|loot|items?/i, caps: ["inventory"], why: "Items/Loot → Inventar" },
  { re: /speicher|save|fortschritt|progress|session/i, caps: ["savegame"], why: "Fortschritt/Sessions → Savegame" },
];

export interface CapabilityCastResult {
  /** Benötigte Fähigkeiten mit Begründung. */
  required: { id: CapabilityId; label: string; why: string }[];
  /** Gecastete Systeme/Templates je Fähigkeit (id, title, url, category). */
  cast: Record<string, { id: string; title: string; category: string; url: string }[]>;
  /** Fähigkeiten ohne brauchbare Abdeckung — die Missing-FUNCTION-Liste. */
  missingCapabilities: { id: CapabilityId; label: string }[];
}

/** Zerlegt eine Spielidee in benötigte Fähigkeiten (deterministisch, de/en). */
export function castCapabilities(brief: string): { id: CapabilityId; label: string; why: string }[] {
  const picked = new Map<CapabilityId, string>();
  for (const rule of CAST_RULES) {
    if (!rule.re.test(brief)) continue;
    for (const cap of rule.caps) {
      if (!picked.has(cap)) picked.set(cap, rule.why);
    }
  }
  // UI braucht jedes Spiel — als Basis-Fähigkeit immer dabei.
  if (!picked.has("ui")) picked.set("ui", "Basis: jedes Spiel braucht lesbare UI-Zustände");
  return [...picked.entries()].map(([id, why]) => ({
    id,
    label: CAPABILITIES.find((c) => c.id === id)!.label,
    why,
  }));
}

/** Castet für jede benötigte Fähigkeit Systeme/Templates aus dem Katalog. */
export async function buildCapabilityCast(brief: string, maxPerCapability = 3): Promise<CapabilityCastResult> {
  const required = castCapabilities(brief);
  const cast: CapabilityCastResult["cast"] = {};
  const missingCapabilities: CapabilityCastResult["missingCapabilities"] = [];

  for (const req of required) {
    const def = CAPABILITIES.find((c) => c.id === req.id)!;
    let hits: LibraryAsset[] = [];

    for (const cat of def.categories ?? []) {
      if (hits.length >= maxPerCapability) break;
      const res = await searchLibrary({ category: cat, limit: maxPerCapability - hits.length });
      hits = hits.concat(res.filter((r) => !hits.some((h) => h.id === r.id)));
    }
    if (hits.length < maxPerCapability) {
      const res = await searchLibrary({
        query: def.terms.join(" "),
        matchMode: "or",
        limit: maxPerCapability - hits.length,
      });
      hits = hits.concat(res.filter((r) => !hits.some((h) => h.id === r.id)));
    }

    cast[req.id] = hits.slice(0, maxPerCapability).map((h) => ({
      id: h.id,
      title: h.title,
      category: h.category,
      url: h.url,
    }));
    if (cast[req.id].length === 0) missingCapabilities.push({ id: req.id, label: req.label });
  }

  return { required, cast, missingCapabilities };
}
