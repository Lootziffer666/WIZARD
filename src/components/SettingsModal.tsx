"use client";

import { useState } from "react";

export type AiProvider = "anthropic" | "openai";

export interface Settings {
  provider: AiProvider;
  apiKey: string;
  model: string;
}

const MODELS: Record<AiProvider, string[]> = {
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5"],
  openai: ["gpt-5.5", "gpt-5.4", "gpt-5.4-mini"],
};

const PROVIDERS: { id: AiProvider; label: string; env: string; placeholder: string }[] = [
  {
    id: "anthropic",
    label: "Anthropic Claude",
    env: "ANTHROPIC_API_KEY",
    placeholder: "sk-ant-…",
  },
  {
    id: "openai",
    label: "OpenAI GPT",
    env: "OPENAI_API_KEY",
    placeholder: "sk-proj-…",
  },
];

export default function SettingsModal({
  settings,
  onChange,
  onClose,
}: {
  settings: Settings;
  onChange: (s: Settings) => void;
  onClose: () => void;
}) {
  const [provider, setProvider] = useState<AiProvider>(settings.provider ?? "anthropic");
  const [key, setKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);

  const activeProvider = PROVIDERS.find((p) => p.id === provider) ?? PROVIDERS[0];
  const providerModels = MODELS[provider];

  function changeProvider(nextProvider: AiProvider) {
    setProvider(nextProvider);
    if (!MODELS[nextProvider].includes(model)) {
      setModel(MODELS[nextProvider][0]);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          ⚙️ Einstellungen
        </h2>

        <label className="mb-1 block text-xs text-neutral-400">KI-Anbieter</label>
        <select
          value={provider}
          onChange={(e) => changeProvider(e.target.value as AiProvider)}
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-neutral-400">
          {activeProvider.label} API-Key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder={activeProvider.placeholder}
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />

        <label className="mb-1 block text-xs text-neutral-400">Modell</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        >
          {providerModels.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <p className="mb-4 text-xs text-neutral-500">
          Der Key wird nur an den gewählten Anbieter gesendet und nur lokal im
          Browser gespeichert. Für Docker/Server kannst du alternativ{" "}
          <code>{activeProvider.env}</code> setzen.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              onChange({ provider, apiKey: key, model });
              onClose();
            }}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
