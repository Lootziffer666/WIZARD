import Anthropic from "@anthropic-ai/sdk";
import { searchLibrary } from "@/lib/db";
import { buildProductionBrief } from "@/lib/brief";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  apiKey?: string;
  model?: string;
}

const SYSTEM = `Du bist "AssetPilot", ein hilfsreicher Assistent für Spiele-Entwickler, der bei der Suche in einer großen Asset-Datenbank hilft.
Die Datenbank enthält echte Assets aus dem Unity Asset Store und Fab (insgesamt mehrere Tausend Einträge).
Jedes Asset hat: title (Name), category (z.B. "3d/props/weapons", "2d/textures-materials", "audio/sound-fx", "vfx/particles", "tools/animation"), publisher, platform ("unity" oder "fab") und url (Store-Link).
WICHTIG: Die Katalog-Einträge sind auf ENGLISCH. Wenn der Nutzer auf Deutsch fragt, übersetze die Suchbegriffe in passende englische Keywords, bevor du suchst.
Die Previews wurden ausgewertet: du kannst auch nach STIL/ATMOSPHÄRE suchen (z.B. desert, dusty, medieval, neon, horror, cute, sci-fi, fantasy, nature, urban, cartoon).
Du siehst NICHT alle Assets auf einmal.
- Nutze IMMER "search_assets" für Einzelanfragen (Name, Kategorie, Stil/Atmosphäre, Publisher, Plattform).
- Wenn der Nutzer eine SPIELIDEE beschreibt, nutze "build_production_brief", um einen kuratierten Starter-Kit (Assets nach Rolle) plus eine Missing-Asset-Liste zu erzeugen.
Wenn du Assets nennst, gib den genauen Titel und die url an, damit der Nutzer sie findet.
Sei kurz und klar. Antworte in der Sprache des Nutzers (meist Deutsch).
Schlage bei offenen Fragen passende Assets aus der Datenbank vor, statt zu raten.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_assets",
    description:
      "Durchsuche die Asset-Datenbank nach Titel, Kategorie, Publisher, Plattform ODER nach visueller Stil/Atmosphäre (die Previews wurden ausgewertet: desert, dusty, medieval, neon, horror, cute, sci-fi, fantasy, nature usw.). Gib immer diese Funktion auf, statt Assets aus dem Gedächtnis zu erfinden.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Freitext-Suche im Titel/Name ODER nach Stil/Atmosphäre, z.B. 'dusty desert city', 'holzige Tuer', 'neon horror', 'fantasy medieval'.",
        },
        category: {
          type: "string",
          description:
            "Optional: Kategorie-Pfad (Präfix), z.B. '3d/props', '2d/textures-materials', 'audio/sound-fx', 'vfx/particles', 'tools'.",
        },
        platform: {
          type: "string",
          enum: ["unity", "fab"],
          description: "Optional: nur diese Plattform.",
        },
        publisher: {
          type: "string",
          description: "Optional: Teil des Publisher-Namens.",
        },
        limit: {
          type: "number",
          description: "Maximale Anzahl Ergebnisse (Standard 20).",
        },
      },
      required: [],
    },
  },
  {
    name: "build_production_brief",
    description:
      "Erzeugt aus einer Spielidee einen kuratierten Starter-Kit (Assets nach Rolle: Environment, Characters, Props, Materials, Audio, VFX, UI) sowie eine Missing-Asset-Liste der Rollen, die kaum abgedeckt sind. Nutze das bei Spielideen, nicht für Einzelanfragen.",
    input_schema: {
      type: "object",
      properties: {
        brief: {
          type: "string",
          description:
            "Englische, keyword-reiche Beschreibung der Idee, z.B. 'coop game in a dusty desert city with improvised tech and absurd bureaucracy quests'.",
        },
        maxPerRole: {
          type: "number",
          description: "Maximale Assets pro Rolle (Standard 4).",
        },
      },
      required: ["brief"],
    },
  },
];

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const apiKey = body.apiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "Kein API-Key. Trage deinen Claude-Key in den Einstellungen ein (oben rechts).",
      },
      { status: 400 }
    );
  }

  const model = body.model || "claude-sonnet-4-6";
  const foundIds = new Set<string>();

  const client = new Anthropic({ apiKey });

  const conv: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let reply = "";
  try {
    for (let turn = 0; turn < 6; turn++) {
      const message = await client.messages.create({
        model,
        max_tokens: 1024,
        system: SYSTEM,
        tools: TOOLS,
        messages: conv,
      });

      if (message.stop_reason === "tool_use") {
        const toolUses = message.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
        );

        conv.push({ role: "assistant", content: message.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUses.map(async (tu): Promise<Anthropic.ToolResultBlockParam> => {
            if (tu.name === "build_production_brief") {
              const input = tu.input as { brief?: string; maxPerRole?: number };
              const result = await buildProductionBrief(
                input.brief ?? "",
                input.maxPerRole ?? 4
              );
              Object.values(result.starterKit).forEach((arr) =>
                arr.forEach((a) => foundIds.add(a.id))
              );
              return {
                type: "tool_result",
                tool_use_id: tu.id,
                content: JSON.stringify(result),
              };
            }

            const input = (tu.input ?? {}) as {
              query?: string;
              category?: string;
              platform?: string;
              publisher?: string;
              limit?: number;
            };
            const results = await searchLibrary({
              query: input.query ?? "",
              category: input.category,
              platform: input.platform,
              publisher: input.publisher,
              limit: input.limit ?? 20,
            });
            results.forEach((r) => foundIds.add(r.id));
            return {
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(
                results.map((r) => ({
                  id: r.id,
                  title: r.title,
                  category: r.category,
                  platform: r.platform,
                  publisher: r.publisher,
                  url: r.url,
                }))
              ),
            };
          })
        );

        conv.push({ role: "user", content: toolResults });
        continue;
      }

      reply = extractText(message.content);
      break;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return Response.json({ error: `Claude-Fehler: ${msg}` }, { status: 500 });
  }

  return Response.json({ reply, foundIds: Array.from(foundIds) });
}
