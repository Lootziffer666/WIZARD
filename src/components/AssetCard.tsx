import type { Asset, AssetType } from "@/lib/types";

export const TYPE_ICON: Record<AssetType, string> = {
  StaticMesh: "🧊",
  SkeletalMesh: "🦴",
  Material: "🎨",
  Texture: "🖼️",
  Blueprint: "🔧",
  Animation: "🏃",
  Sound: "🔊",
  Particle: "✨",
  Other: "📦",
};

export const TYPE_COLOR: Record<AssetType, string> = {
  StaticMesh: "bg-sky-900/40 border-sky-500/40",
  SkeletalMesh: "bg-violet-900/40 border-violet-500/40",
  Material: "bg-amber-900/40 border-amber-500/40",
  Texture: "bg-emerald-900/40 border-emerald-500/40",
  Blueprint: "bg-rose-900/40 border-rose-500/40",
  Animation: "bg-lime-900/40 border-lime-500/40",
  Sound: "bg-cyan-900/40 border-cyan-500/40",
  Particle: "bg-fuchsia-900/40 border-fuchsia-500/40",
  Other: "bg-neutral-800 border-neutral-600",
};

export default function AssetCard({
  asset,
  highlighted,
  onClick,
}: {
  asset: Asset;
  highlighted: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition ${
        highlighted
          ? "border-emerald-400 ring-2 ring-emerald-400/60 bg-emerald-950/30"
          : "border-neutral-700 bg-neutral-900 hover:border-neutral-500"
      }`}
    >
      <div
        className={`flex h-20 w-full items-center justify-center rounded-lg border ${
          TYPE_COLOR[asset.type]
        }`}
      >
        {asset.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.thumbnail}
            alt={asset.name}
            className="h-full w-full rounded-lg object-cover"
          />
        ) : (
          <span className="text-3xl">{TYPE_ICON[asset.type]}</span>
        )}
      </div>
      <div className="w-full">
        <div className="truncate text-sm font-medium text-neutral-100">
          {asset.name}
        </div>
        <div className="text-xs text-neutral-400">
          {asset.type}
          {asset.polyCount != null ? ` · ${asset.polyCount} poly` : ""}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {asset.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300"
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
