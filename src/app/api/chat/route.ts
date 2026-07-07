import Anthropic from "@anthropic-ai/sdk";
import { searchAssets } from "@/lib/search";
import type { AssetType, Catalog } from "@/lib/types";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  catalog: Catalog;
  apiKey?: string;
  model?: string;
}

const SYSTEM = `Du bist "AssetPilot", ein hilfsreicher Assistent für Spiele-Entwickler, der bei der Suche in einem Asset-Katalog hilft.
Der Nutzer hat ein Projekt mit vielen Assets (Meshes, Materialien, Sounds, Blueprints usw.).
Du siehst NICHT alle Assets auf einmal. Nutze IMMER das Werkzeug "search_assets", um Assets zu finden – basierend auf dem, wonach der Nutzer fragt (Name, Typ, Tags, Poly-Anzahl).
Wenn du Assets nennst, gib den genauen Namen und den Pfad an, damit der Nutzer sie findet.
Sei kurz und klar. Antworte in der Sprache des Nutzers (meist Deutsch).
Schlage bei offenen Fragen passende Assets aus dem Katalog vor, statt zu raten.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_assets",
    description:
      "Durchsuche den Asset-Katalog nach Namen, Typ, Tags oder Poly-Anzahl. Gib immer diese Funktion auf, statt Assets aus dem Gedächtnis zu erfinden.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Freitext-Suche, z.B. 'holzige Tuer' oder 'Fels'.",
        },
        type: {
          type: "string",
          enum: [
            "StaticMesh",
            "SkeletalMesh",
            "Material",
            "Texture",
            "Blueprint",
            "Animation",
            "Sound",
            "Particle",
            "Other",
          ],
          description: "Optional: nur diesen Asset-Typ.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional: alle diese Tags muessen vorhanden sein.",
        },
        maxPoly: {
          type: "number",
          description: "Optional: maximale Polygonzahl.",
        },
        limit: {
          type: "number",
          description: "Maximale Anzahl Ergebnisse (Standard 20).",
        },
      },
      required: [],
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
  const catalog = Array.isArray(body.catalog) ? body.catalog : [];
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

        const toolResults: Anthropic.ToolResultBlockParam[] = toolUses.map(
          (tu) => {
            const input = (tu.input ?? {}) as {
              query?: string;
              type?: AssetType;
              tags?: string[];
              maxPoly?: number;
              limit?: number;
            };
            const results = searchAssets(catalog, {
              query: input.query ?? "",
              type: input.type ?? "",
              tags: input.tags ?? [],
              maxPoly: input.maxPoly,
              limit: input.limit ?? 20,
            });
            results.forEach((r) => foundIds.add(r.id));
            return {
              type: "tool_result",
              tool_use_id: tu.id,
              content: JSON.stringify(
                results.map((r) => ({
                  id: r.id,
                  name: r.name,
                  type: r.type,
                  path: r.path,
                  tags: r.tags,
                  polyCount: r.polyCount,
                }))
              ),
            };
          }
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
