"use client";

import { useCallback, useState } from "react";
import type { Asset, Catalog } from "@/lib/types";
import { SAMPLE_CATALOG } from "@/lib/sampleCatalog";
import AssetGallery from "@/components/AssetGallery";
import ChatPanel from "@/components/ChatPanel";
import SettingsModal, { type Settings } from "@/components/SettingsModal";
import ImportModal from "@/components/ImportModal";

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog>(SAMPLE_CATALOG);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("assetpilot.settings");
      if (saved) {
        try {
          return JSON.parse(saved) as Settings;
        } catch {
          /* ignore */
        }
      }
    }
    return { apiKey: "", model: "claude-sonnet-4-6" };
  });
  const [showSettings, setShowSettings] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);

  const saveSettings = (s: Settings) => {
    setSettings(s);
    localStorage.setItem("assetpilot.settings", JSON.stringify(s));
  };

  const onFoundIds = useCallback((ids: string[]) => {
    setFoundIds(new Set(ids));
  }, []);

  return (
    <main className="flex h-screen flex-col bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold">
            🛰️ AssetPilot{" "}
            <span className="text-xs font-normal text-neutral-500">
              KI-Asset-Suche für Unreal
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCatalog(SAMPLE_CATALOG)}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-500"
          >
            Beispiel laden
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-500"
          >
            📥 Importieren
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:border-neutral-500"
          >
            ⚙️ API-Key
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1.4fr_1fr]">
        <section className="border-b border-neutral-800 md:border-b-0 md:border-r">
          <AssetGallery
            catalog={catalog}
            foundIds={foundIds}
            onPick={setSelected}
          />
        </section>
        <section className="flex flex-col">
          <ChatPanel
            catalog={catalog}
            settings={settings}
            onFoundIds={onFoundIds}
          />
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold">{selected.name}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-400">{selected.type}</p>
            <p className="mt-1 break-all font-mono text-xs text-emerald-400">
              {selected.path}
            </p>
            {selected.description && (
              <p className="mt-3 text-sm text-neutral-300">
                {selected.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1">
              {selected.tags.map((t) => (
                <span
                  key={t}
                  className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300"
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-3 text-xs text-neutral-500">
              {selected.polyCount != null
                ? `${selected.polyCount} Polygone · `
                : ""}
              {selected.sizeMb != null ? `${selected.sizeMb} MB` : "Größe unbekannt"}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onChange={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showImport && (
        <ImportModal
          onImport={setCatalog}
          onClose={() => setShowImport(false)}
        />
      )}
    </main>
  );
}
