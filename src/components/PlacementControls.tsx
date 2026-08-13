"use client";

import { FLEET } from "@/lib/ships";
import type { GameState } from "@/lib/types";

interface PlacementControlsProps {
  state: GameState;
  onRotate: () => void;
  onRandomise: () => void;
  onReset: () => void;
}

const BUTTON =
  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

export function PlacementControls({
  state,
  onRotate,
  onRandomise,
  onReset,
}: PlacementControlsProps) {
  const current = FLEET[state.placementShipIndex];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/60">
      <div className="text-xs text-slate-300">
        Placing{" "}
        <span className="font-semibold text-cyan-300">
          {current ? `${current.name} (${current.length})` : "—"}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRotate}
          className={`${BUTTON} bg-slate-700 text-slate-100 hover:bg-slate-600`}
        >
          Rotate ({state.placementOrientation === "horizontal" ? "↔" : "↕"})
        </button>
        <button
          type="button"
          onClick={onRandomise}
          className={`${BUTTON} bg-cyan-600 text-white hover:bg-cyan-500`}
        >
          Randomise fleet
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={state.playerBoard.ships.length === 0}
          className={`${BUTTON} bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40`}
        >
          Clear
        </button>
      </div>
      <p className="text-[0.7rem] text-slate-500">
        Click your waters to drop the ship. Green means it fits, red means it
        does not.
      </p>
    </div>
  );
}
