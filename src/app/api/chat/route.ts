import Anthropic from "@anthropic-ai/sdk";
import { searchLibrary } from "@/lib/db";
import { buildProductionBrief } from "@/lib/brief";

export const runtime = "nodejs";

type AiProvider = "anthropic" | "openai";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  provider?: AiProvider;
  apiKey?: string;
  model?: string;
}

const SYSTEM = `Du bist "WIZARD", ein warmer, klarer Produktionsassistent für einen Vater, der mit seinem Sohn tolle Spielideen bauen will.
Die Datenbank enthält echte Assets aus dem Unity Asset Store und Fab (insgesamt mehrere Tausend Einträge).
Jedes Asset hat: title (Name), category (z.B. "3d/props/weapons", "2d/textures-materials", "audio/sound-fx", "vfx/particles", "tools/animation"), publisher, platform ("unity" oder "fab") und url (Store-Link).
WICHTIG: Die Katalog-Einträge sind auf ENGLISCH. Wenn der Nutzer auf Deutsch fragt, übersetze die Suchbegriffe in passende englische Keywords, bevor du suchst.
Die Previews wurden ausgewertet: du kannst auch nach STIL/ATMOSPHÄRE suchen (z.B. desert, dusty, medieval, neon, horror, cute, sci-fi, fantasy, nature, urban, cartoon).
Du siehst NICHT alle Assets auf einmal.
- Nutze IMMER "search_assets" für Einzelanfragen (Name, Kategorie, Stil/Atmosphäre, Publisher, Plattform).
- Wenn der Nutzer eine SPIELIDEE beschreibt, nutze "build_production_brief", um einen kuratierten Starter-Kit (Assets nach Rolle) plus eine Missing-Asset-Liste zu erzeugen.
Wenn du Assets nennst, gib den genauen Titel und die url an, damit der Nutzer sie findet.
Sei kurz, ermutigend und konkret. Denke in Starter-Kits, Missionen und kindgerechten Spielmomenten. Antworte in der Sprache des Nutzers (meist Deutsch).
Schlage bei offenen Fragen passende Assets aus der Datenbank vor, statt zu raten.`;

const ANTHROPIC_TOOLS: Anthropic.Tool[] = [
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

const OPENAI_TOOLS = ANTHROPIC_TOOLS.map((tool) => ({
  type: "function" as const,
  name: tool.name,
  description: tool.description,
  parameters: tool.input_schema,
}));

interface ToolResult {
  content: string;
  ids: string[];
}

async function runWizardTool(name: string, input: unknown): Promise<ToolResult> {
  if (name === "build_production_brief") {
    const args = input as { brief?: string; maxPerRole?: number };
    const result = await buildProductionBrief(args.brief ?? "", args.maxPerRole ?? 4);
    const ids = Object.values(result.starterKit).flatMap((arr) => arr.map((a) => a.id));
    return { content: JSON.stringify(result), ids };
  }

  const args = (input ?? {}) as {
    query?: string;
    category?: string;
    platform?: string;
    publisher?: string;
    limit?: number;
  };
  const results = await searchLibrary({
    query: args.query ?? "",
    category: args.category,
    platform: args.platform,
    publisher: args.publisher,
    limit: args.limit ?? 20,
  });

  return {
    ids: results.map((r) => r.id),
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
}

function extractAnthropicText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

function providerKey(provider: AiProvider, requestKey?: string): string | undefined {
  if (requestKey) return requestKey;
  return provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
}

function defaultModel(provider: AiProvider): string {
  return provider === "openai" ? "gpt-5.4-mini" : "claude-sonnet-4-6";
}

async function runAnthropic(body: ChatRequest, apiKey: string) {
  const foundIds = new Set<string>();
  const client = new Anthropic({ apiKey });
  const conv: Anthropic.MessageParam[] = body.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let reply = "";
  for (let turn = 0; turn < 6; turn++) {
    const message = await client.messages.create({
      model: body.model || defaultModel("anthropic"),
      max_tokens: 1024,
      system: SYSTEM,
      tools: ANTHROPIC_TOOLS,
      messages: conv,
    });

    if (message.stop_reason === "tool_use") {
      const toolUses = message.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );
      conv.push({ role: "assistant", content: message.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        const result = await runWizardTool(tu.name, tu.input);
        result.ids.forEach((id) => foundIds.add(id));
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: result.content,
        });
      }

      conv.push({ role: "user", content: toolResults });
      continue;
    }

    reply = extractAnthropicText(message.content);
    break;
  }

  return { reply, foundIds: Array.from(foundIds) };
}

interface OpenAIOutputItem {
  type?: string;
  id?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: { type?: string; text?: string }[];
}

interface OpenAIResponse {
  id?: string;
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: { message?: string };
}

async function createOpenAIResponse(apiKey: string, body: Record<string, unknown>) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as OpenAIResponse;
  if (!res.ok) {
    throw new Error(data.error?.message ?? `OpenAI request failed (${res.status})`);
  }
  return data;
}

function openAIInput(messages: ChatMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    content: [{ type: "input_text", text: m.content }],
  }));
}

function extractOpenAIText(response: OpenAIResponse): string {
  if (response.output_text) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? "")
    .filter(Boolean)
    .join("\n");
}

async function runOpenAI(body: ChatRequest, apiKey: string) {
  const foundIds = new Set<string>();
  let response = await createOpenAIResponse(apiKey, {
    model: body.model || defaultModel("openai"),
    instructions: SYSTEM,
    input: openAIInput(body.messages),
    tools: OPENAI_TOOLS,
  });

  for (let turn = 0; turn < 6; turn++) {
    const calls = (response.output ?? []).filter((item) => item.type === "function_call");
    if (calls.length === 0) break;

    const toolOutputs = [];
    for (const call of calls) {
      const parsedArgs = call.arguments ? JSON.parse(call.arguments) : {};
      const result = await runWizardTool(call.name ?? "", parsedArgs);
      result.ids.forEach((id) => foundIds.add(id));
      toolOutputs.push({
        type: "function_call_output",
        call_id: call.call_id,
        output: result.content,
      });
    }

    response = await createOpenAIResponse(apiKey, {
      model: body.model || defaultModel("openai"),
      instructions: SYSTEM,
      previous_response_id: response.id,
      input: toolOutputs,
      tools: OPENAI_TOOLS,
    });
  }

  return { reply: extractOpenAIText(response), foundIds: Array.from(foundIds) };
}

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const provider = body.provider ?? "anthropic";
  const apiKey = providerKey(provider, body.apiKey);
  if (!apiKey) {
    const envName = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
    return Response.json(
      {
        error: `Kein API-Key. Trage einen Key in den Einstellungen ein oder setze ${envName} auf dem Server.`,
      },
      { status: 400 }
    );
  }

  try {
    const result = provider === "openai" ? await runOpenAI(body, apiKey) : await runAnthropic(body, apiKey);
    return Response.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unbekannter Fehler.";
    return Response.json({ error: `${provider}-Fehler: ${msg}` }, { status: 500 });
  }
}
