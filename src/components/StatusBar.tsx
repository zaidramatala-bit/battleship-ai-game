"use client";

import type { GameState } from "@/lib/types";

const PHASE_LABEL: Record<GameState["phase"], string> = {
  placement: "Deploy your fleet",
  playerTurn: "Your turn",
  computerTurn: "Computer is thinking…",
  gameOver: "Game over",
};

export function StatusBar({ state }: { state: GameState }) {
  const accent =
    state.phase === "computerTurn"
      ? "bg-orange-500/15 text-orange-200 ring-orange-500/30"
      : state.phase === "gameOver"
        ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
        : "bg-cyan-500/15 text-cyan-200 ring-cyan-500/30";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        data-testid="phase"
        className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${accent}`}
      >
        {PHASE_LABEL[state.phase]}
      </span>
      <p
        data-testid="message"
        aria-live="polite"
        className="text-sm text-slate-300"
      >
        {state.message}
      </p>
    </div>
  );
}
