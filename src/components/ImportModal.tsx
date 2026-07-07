"use client";

import { useRef, useState } from "react";
import type { Catalog } from "@/lib/types";

export default function ImportModal({
  onImport,
  onClose,
}: {
  onImport: (catalog: Catalog) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function apply(raw: string) {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Kein Array.");
      const catalog = parsed as Catalog;
      if (catalog.length === 0) throw new Error("Leer.");
      onImport(catalog);
      onClose();
    } catch (e) {
      setError(
        "Ungültiges Format. Erwartet wird ein JSON-Array von Assets: " +
          (e instanceof Error ? e.message : "")
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
        <h2 className="mb-1 text-lg font-semibold text-neutral-100">
          📥 Assets importieren
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Lade eine <code>.json</code>-Datei mit deinen Assets hoch oder füge
          sie hier ein. Format pro Asset: name, type, path, tags (Array).
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="mb-3 hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            f.text().then(apply);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="mb-3 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 hover:border-emerald-500"
        >
          📁 JSON-Datei auswählen
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='[{"name":"MeinAsset","type":"StaticMesh","path":"/Game/...","tags":["holz"]}]'
          className="h-40 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-100 outline-none focus:border-emerald-500"
        />

        {error && (
          <p className="mt-2 text-xs text-rose-400">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500"
          >
            Abbrechen
          </button>
          <button
            onClick={() => apply(text)}
            disabled={!text.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Importieren
          </button>
        </div>
      </div>
    </div>
  );
}
