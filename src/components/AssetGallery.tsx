"use client";

import { useMemo, useState } from "react";
import type { Asset, AssetType, Catalog } from "@/lib/types";
import { searchAssets } from "@/lib/search";
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
  catalog,
  foundIds,
  onPick,
}: {
  catalog: Catalog;
  foundIds: Set<string>;
  onPick?: (asset: Asset) => void;
}) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<AssetType | "">("");
  const [onlyAi, setOnlyAi] = useState(false);

  const results = useMemo(() => {
    let list = searchAssets(catalog, { query: q, type, limit: 500 });
    if (onlyAi && foundIds.size > 0) {
      list = list.filter((a) => foundIds.has(a.id));
    }
    return list;
  }, [catalog, q, type, onlyAi, foundIds]);

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
          {results.length} / {catalog.length}
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
        {results.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-neutral-500">
            Keine Assets gefunden.
          </p>
        )}
      </div>
    </div>
  );
}
