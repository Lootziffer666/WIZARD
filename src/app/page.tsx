"use client";

import { useCallback, useEffect, useState } from "react";
import type { Asset, Catalog } from "@/lib/types";
import AssetGallery from "@/components/AssetGallery";
import ChatPanel from "@/components/ChatPanel";
import SettingsModal, { type Settings } from "@/components/SettingsModal";

const EXAMPLE_IDEAS = [
  "Koop-Abenteuer für Vater & Sohn in einer staubigen Wüstenstadt",
  "Magischer Werkstatt-Level mit Robotern, Schaltern und Geheimtüren",
  "Gemütliches Waldcamp mit Lagerfeuer, kleinen Quests und Tieren",
];

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog>([]);
  const [loading, setLoading] = useState(true);
  const [foundIds, setFoundIds] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<Settings>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("assetpilot.settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Partial<Settings>;
          return {
            provider: parsed.provider ?? "anthropic",
            apiKey: parsed.apiKey ?? "",
            model: parsed.model ?? "claude-sonnet-4-6",
          };
        } catch {
          /* ignore */
        }
      }
    }
    return { provider: "anthropic", apiKey: "", model: "claude-sonnet-4-6" };
  });
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/assets?limit=3000")
      .then((r) => r.json())
      .then((data) => {
        if (active) setCatalog(data.assets ?? []);
      })
      .catch((err) => {
        console.error("[WIZARD] Failed to load catalog:", err);
        setCatalog([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveSettings = (s: Settings) => {
    setSettings(s);
    localStorage.setItem("assetpilot.settings", JSON.stringify(s));
  };

  const onFoundIds = useCallback((ids: string[]) => {
    setFoundIds(new Set(ids));
  }, []);

  const featuredAssets = catalog.slice(0, 6);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#14532d_0,#0a0a0a_34%,#020617_100%)] text-neutral-100">
      <header className="border-b border-emerald-400/20 bg-black/35 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
              WIZARD · Ideen rein, spielbare Bausteine raus
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">
              Der Spielideen-Zauberer für deinen Sohn.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300 md:text-base">
              Beschreibt gemeinsam eine Welt, eine Mission oder nur eine Stimmung.
              WIZARD durchsucht die vorhandenen Assets, baut daraus einen Starter-Kit
              und zeigt sofort, was schon passt und was noch fehlt.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-neutral-700/70 bg-neutral-950/75 p-4 shadow-2xl shadow-emerald-950/40 md:min-w-96">
            <div className="flex w-full items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-neutral-500">
                  Live-Fundus
                </div>
                <div className="text-2xl font-bold text-emerald-300">
                  {loading ? "lädt…" : `${catalog.length} Assets`}
                </div>
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="rounded-xl border border-emerald-400/40 px-4 py-2 text-xs font-semibold text-emerald-100 hover:border-emerald-300 hover:bg-emerald-400/10"
              >
                ⚙️ KI-Anbieter
              </button>
            </div>
            <div className="grid w-full grid-cols-3 gap-2">
              {featuredAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setSelected(asset)}
                  className="group overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 text-left"
                  title={asset.name}
                >
                  {asset.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnail}
                      alt={asset.name}
                      className="h-20 w-full object-cover transition group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-20 items-center justify-center text-2xl">📦</div>
                  )}
                  <div className="truncate px-2 py-1 text-[10px] text-neutral-300">
                    {asset.name}
                  </div>
                </button>
              ))}
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900"
                  />
                ))}
            </div>
            <p className="text-xs text-neutral-400">
              Die echten Asset-Bilder bleiben sichtbar und unverändert; nur das
              Interface darum herum wird zum WIZARD-Workspace.
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-5 md:grid-cols-3">
        {EXAMPLE_IDEAS.map((idea) => (
          <div
            key={idea}
            className="rounded-2xl border border-neutral-800 bg-neutral-950/65 p-4 text-sm text-neutral-300"
          >
            <span className="text-emerald-300">✦</span> {idea}
          </div>
        ))}
      </section>

      <div className="mx-auto grid h-[calc(100vh-290px)] min-h-[620px] max-w-7xl grid-cols-1 overflow-hidden rounded-t-3xl border border-neutral-800 bg-neutral-950/85 shadow-2xl md:grid-cols-[1.35fr_1fr]">
        <section className="border-b border-neutral-800 md:border-b-0 md:border-r">
          <AssetGallery
            catalog={catalog}
            foundIds={foundIds}
            onPick={setSelected}
          />
        </section>
        <section className="flex flex-col">
          <ChatPanel settings={settings} onFoundIds={onFoundIds} />
        </section>
      </div>

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-emerald-400/30 bg-neutral-950 p-5 shadow-2xl shadow-emerald-950/60">
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
    </main>
  );
}
