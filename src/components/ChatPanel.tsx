"use client";

import { useEffect, useRef, useState } from "react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface Settings {
  apiKey: string;
  model: string;
}

const SUGGESTIONS = [
  "Finde mir holzige Türen.",
  "Welche Materialien gibt es für Stein?",
  "Zeig mir Assets unter 1000 Polygonen.",
  "Ich brauche eine Fackel mit Feuer.",
];

export default function ChatPanel({
  settings,
  onFoundIds,
}: {
  settings: Settings;
  onFoundIds: (ids: string[]) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setError("");
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          apiKey: settings.apiKey || undefined,
          model: settings.model || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Fehler beim Chat.");
        setMessages(messages);
        return;
      }
      setMessages([...next, { role: "assistant", content: data.reply }]);
      onFoundIds(data.foundIds ?? []);
    } catch (e) {
      setError("Verbindung zum Server fehlgeschlagen.");
      setMessages(messages);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-800 p-3">
        <h2 className="text-sm font-semibold text-neutral-200">
          💬 KI-Assistent
        </h2>
        <p className="text-xs text-neutral-500">
          Frag einfach – die KI findet die passenden Assets.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Versuch eine Frage:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-left text-xs text-neutral-300 hover:border-emerald-500"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-800 text-neutral-100"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-neutral-800 px-3 py-2 text-sm text-neutral-400">
              …sucht im Katalog
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-neutral-800 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Frag nach Assets…"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
