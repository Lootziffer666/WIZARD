/**
 * SHADED-Pass-Ableitung — der „Weltkleber"-Schritt aus assetpilot.md.
 *
 * Aus einer Spielidee (Brief-Text) wird deterministisch ein Vorschlag für
 * SHADEDs 13 kanonische High-Level-Parameter (CLAUDE.md Invariante 6 im
 * SHADED-Repo) plus passende SWIFT-`--world-states`-Varianten abgeleitet.
 * Kein LLM nötig: Keyword-Regeln (de/en), Werte werden per Maximum gemerged
 * und auf [0,1] geklemmt. Die Namen sind Vertragsbestandteil:
 *  - Params  → window.SHADED.setParams({...})
 *  - States  → python main.py render --world-states ... (SWIFT-Registry)
 */

export const SHADED_PARAMS = [
  "dayNight",
  "storm",
  "rain",
  "wet",
  "puddle",
  "fog",
  "wind",
  "glow",
  "decay",
  "temperature",
  "bloom",
  "autumn",
  "snow",
] as const;

export type ShadedParam = (typeof SHADED_PARAMS)[number];

/** SWIFT core/procedural/world_states.py WORLD_STATE_TRANSFORMS registry. */
export const SWIFT_WORLD_STATES = [
  "dust",
  "aging",
  "heat",
  "soot",
  "sunbleach",
  "humidity",
  "haze",
] as const;

export type SwiftWorldState = (typeof SWIFT_WORLD_STATES)[number];

export interface ShadedPassResult {
  /** Vorschlag für window.SHADED.setParams(...) — nur gesetzte Parameter. */
  params: Partial<Record<ShadedParam, number>>;
  /** SWIFT-Weltzustands-Varianten für Actor-Sheets (--world-states). */
  worldStates: { name: SwiftWorldState; intensity: number }[];
  /** Beispiel-Kommando, mit dem SWIFT passende Actor-Varianten rendert. */
  swiftRenderExample: string;
  /** Welche Regel warum gegriffen hat (nachvollziehbar, testbar). */
  rationale: string[];
}

interface PassRule {
  re: RegExp;
  params?: Partial<Record<ShadedParam, number>>;
  states?: Partial<Record<SwiftWorldState, number>>;
  why: string;
}

const RULES: PassRule[] = [
  {
    re: /desert|wüste|dust|staub|sand|arid/i,
    params: { temperature: 0.7, wind: 0.3 },
    states: { dust: 0.7, sunbleach: 0.5, haze: 0.3 },
    why: "Wüste/Staub → warme Temperatur, Staub-/Sonnenbleiche-Varianten",
  },
  {
    re: /night|nacht|dark|dunkel|moonlit|mondschein/i,
    params: { dayNight: 0.85, glow: 0.6 },
    why: "Nacht/Dunkelheit → dayNight hoch, Warmlicht-Glow",
  },
  {
    re: /rain|regen|verregnet|drizzle/i,
    params: { rain: 0.7, wet: 0.8, puddle: 0.6 },
    states: { humidity: 0.5 },
    why: "Regen → Nässe, Pfützen, Feuchtigkeits-Variante",
  },
  {
    re: /storm|sturm|gewitter|thunder|tempest/i,
    params: { storm: 0.8, wind: 0.8, rain: 0.6 },
    why: "Sturm → Wind + Regen",
  },
  {
    re: /fog|nebel|mist\b|dunst|haze/i,
    params: { fog: 0.7 },
    states: { haze: 0.5 },
    why: "Nebel/Dunst → fog, Haze-Variante",
  },
  {
    re: /winter|schnee|snow|frost|eis\b|ice\b/i,
    params: { snow: 0.8, temperature: 0.1 },
    why: "Winter → Schnee, kalte Temperatur",
  },
  {
    re: /autumn|herbst|fall foliage|laub/i,
    params: { autumn: 0.8 },
    why: "Herbst → autumn",
  },
  {
    re: /ruin|verfall|decay|abandoned|verlassen|ancient|uralt|overgrown|verwittert/i,
    params: { decay: 0.7 },
    states: { aging: 0.7 },
    why: "Verfall/verlassen → decay, Alterungs-Variante",
  },
  {
    re: /horror|creepy|gruselig|haunted|spuk/i,
    params: { dayNight: 0.8, fog: 0.6, decay: 0.5 },
    states: { aging: 0.5 },
    why: "Horror → Nacht, Nebel, Verfall",
  },
  {
    re: /fire|feuer|lava|glut|ember|volcano|vulkan/i,
    params: { temperature: 0.9, glow: 0.7 },
    states: { heat: 0.7, soot: 0.4 },
    why: "Feuer/Hitze → Temperatur + Glow, Hitze-/Ruß-Varianten",
  },
  {
    re: /swamp|sumpf|jungle|dschungel|humid|feucht|tropical|tropisch/i,
    params: { wet: 0.5, fog: 0.4 },
    states: { humidity: 0.6 },
    why: "Sumpf/Tropen → Feuchtigkeit",
  },
  {
    re: /neon|cyberpunk|scifi city|nachtstadt/i,
    params: { glow: 0.8, dayNight: 0.7 },
    why: "Neon/Cyberpunk → Glow bei Nacht",
  },
  {
    re: /märchen|fairy|cozy|gemütlich|whimsical|verträumt/i,
    params: { bloom: 0.5, glow: 0.4 },
    why: "Märchen/gemütlich → Bloom + sanfter Glow",
  },
  {
    re: /soot|ruß|burned|verbrannt|ash|asche/i,
    params: { decay: 0.4 },
    states: { soot: 0.7 },
    why: "Ruß/verbrannt → Soot-Variante",
  },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function deriveShadedPass(brief: string): ShadedPassResult {
  const params: Partial<Record<ShadedParam, number>> = {};
  const states: Partial<Record<SwiftWorldState, number>> = {};
  const rationale: string[] = [];

  for (const rule of RULES) {
    if (!rule.re.test(brief)) continue;
    rationale.push(rule.why);
    for (const [k, v] of Object.entries(rule.params ?? {})) {
      const key = k as ShadedParam;
      params[key] = clamp01(Math.max(params[key] ?? 0, v));
    }
    for (const [k, v] of Object.entries(rule.states ?? {})) {
      const key = k as SwiftWorldState;
      states[key] = clamp01(Math.max(states[key] ?? 0, v));
    }
  }

  const worldStates = (Object.entries(states) as [SwiftWorldState, number][]).map(
    ([name, intensity]) => ({ name, intensity })
  );

  const stateArg = worldStates.map((s) => s.name).join(",");
  const swiftRenderExample =
    "python main.py render --model <character.fbx> --format sprite_sheet " +
    "--depth-pass --emissive-pass" +
    (stateArg ? ` --world-states ${stateArg}` : "");

  return { params, worldStates, swiftRenderExample, rationale };
}
