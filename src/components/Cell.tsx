"use client";

import type { CellView } from "@/lib/view";

const BASE =
  "relative aspect-square w-full rounded-[3px] transition-all duration-150 flex items-center justify-center";

const LOOKS: Record<CellView, string> = {
  water: "bg-sky-950/70 ring-1 ring-inset ring-sky-800/40",
  ship: "bg-slate-400 ring-1 ring-inset ring-slate-200/60 shadow-inner",
  miss: "bg-sky-900/60 ring-1 ring-inset ring-sky-700/40",
  hit: "bg-amber-500 ring-1 ring-inset ring-amber-200",
  sunk: "bg-rose-700 ring-1 ring-inset ring-rose-300",
  preview: "bg-emerald-500/70 ring-1 ring-inset ring-emerald-200",
};

interface CellProps {
  view: CellView;
  label: string;
  interactive: boolean;
  invalidPreview?: boolean;
  onSelect?: () => void;
  onHover?: () => void;
}

export function Cell({
  view,
  label,
  interactive,
  invalidPreview = false,
  onSelect,
  onHover,
}: CellProps) {
  const look = invalidPreview
    ? "bg-rose-600/70 ring-1 ring-inset ring-rose-300"
    : LOOKS[view];

  return (
    <button
      type="button"
      aria-label={`${label} ${view}`}
      data-cell={label}
      data-view={invalidPreview ? "invalid" : view}
      disabled={!interactive}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={`${BASE} ${look} ${
        interactive
          ? "cursor-pointer hover:brightness-125 hover:ring-2 hover:ring-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          : "cursor-default"
      }`}
    >
      {view === "miss" && (
        <span className="block h-1/4 w-1/4 rounded-full bg-sky-300/70" />
      )}
      {(view === "hit" || view === "sunk") && (
        <span className="text-[max(0.6rem,45%)] font-black leading-none text-white/90">
          ✕
        </span>
      )}
    </button>
  );
}
