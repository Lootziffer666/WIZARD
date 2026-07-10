"use client";

import { useEffect, useMemo, useState } from "react";
import type { Asset, AssetType } from "@/lib/types";
import AssetCard from "./AssetCard";

const TYPES: (AssetType | "")[] = [
  "",
  "StaticMesh",
  "SkeletalMesh",
  "Material",
  "Texture",
  "Blueprint",
  "Animation",
  "Sound",
  "Particle",
];

export default function AssetGallery({
  foundIds,
  onPick,
}: {
  foundIds: Set<string>;
  onPick?: (asset: Asset) => void;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<AssetType | "">("");
  const [onlyAi, setOnlyAi] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  // Server-side FTS5/bm25 search (debounced). The gallery used to fetch 3000
  // assets and re-search them client-side with substring matching — the real
  // search in the DB was bypassed entirely.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: "500" });
      if (onlyAi && foundIds.size > 0) {
        params.set("ids", Array.from(foundIds).join(","));
      } else if (q.trim()) {
        params.set("q", q.trim());
      }
      fetch(`/api/assets?${params}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setAssets(data.assets ?? []))
        .catch((err) => {
          if (err?.name !== "AbortError") {
            console.error("[AssetGallery] search failed:", err);
            setAssets([]);
          }
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, onlyAi, foundIds]);

  const results = useMemo(() => {
    let list = assets;
    if (type) list = list.filter((a) => a.type === type);
    if (onlyAi && foundIds.size > 0) list = list.filter((a) => foundIds.has(a.id));
    return list;
  }, [assets, type, onlyAi, foundIds]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 p-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Assets durchsuchen…"
          className="min-w-[160px] flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-emerald-500"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AssetType | "")}
          className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-2 text-sm text-neutral-100"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "" ? "Alle Typen" : t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-neutral-300">
          <input
            type="checkbox"
            checked={onlyAi}
            onChange={(e) => setOnlyAi(e.target.checked)}
          />
          nur KI-Treffer
        </label>
        <span className="text-xs text-neutral-500">
          {loading ? "…" : `${results.length} Treffer`}
        </span>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto p-3 sm:grid-cols-3 lg:grid-cols-4">
        {results.map((asset) => (
          <AssetCard
            key={asset.id}
            asset={asset}
            highlighted={foundIds.has(asset.id)}
            onClick={() => onPick?.(asset)}
          />
        ))}
        {results.length === 0 && !loading && (
          <p className="col-span-full py-10 text-center text-sm text-neutral-500">
            Keine Assets gefunden.
          </p>
        )}
      </div>
    </div>
  );
}
