"use client";

import type { Player } from "@/lib/types";

interface GameOverBannerProps {
  winner: Player;
  shotsFired: number;
  onNewGame: () => void;
}

export function GameOverBanner({
  winner,
  shotsFired,
  onNewGame,
}: GameOverBannerProps) {
  const playerWon = winner === "player";

  return (
    <div
      data-testid="game-over"
      className={`flex flex-wrap items-center justify-between gap-4 rounded-xl p-4 ring-1 ${
        playerWon
          ? "bg-emerald-500/10 ring-emerald-500/40"
          : "bg-rose-500/10 ring-rose-500/40"
      }`}
    >
      <div>
        <p
          className={`text-lg font-bold ${
            playerWon ? "text-emerald-300" : "text-rose-300"
          }`}
        >
          {playerWon ? "Victory — enemy fleet destroyed" : "Defeat — your fleet is gone"}
        </p>
        <p className="text-xs text-slate-400">
          {shotsFired} shots fired. Enemy positions are now revealed.
        </p>
      </div>
      <button
        type="button"
        onClick={onNewGame}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        New game
      </button>
    </div>
  );
}
