"use client";

import { useState } from "react";

export interface Settings {
  apiKey: string;
  model: string;
}

const MODELS = [
  "claude-sonnet-4-6",
  "claude-opus-4-7",
  "claude-haiku-4-5",
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
  const [key, setKey] = useState(settings.apiKey);
  const [model, setModel] = useState(settings.model);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
        <h2 className="mb-4 text-lg font-semibold text-neutral-100">
          ⚙️ Einstellungen
        </h2>

        <label className="mb-1 block text-xs text-neutral-400">
          Claude API-Key
        </label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-ant-…"
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />

        <label className="mb-1 block text-xs text-neutral-400">Modell</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100"
        >
          {MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <p className="mb-4 text-xs text-neutral-500">
          Der Key wird nur an Anthropic gesendet, nicht gespeichert. Alternativ
          kannst du <code>ANTHROPIC_API_KEY</code> als Server-Umgebungsvariable
          setzen.
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
              onChange({ apiKey: key, model });
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
