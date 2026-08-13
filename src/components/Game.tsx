"use client";

import { useState } from "react";
import { Board } from "./Board";
import { FleetStatus } from "./FleetStatus";
import { GameOverBanner } from "./GameOverBanner";
import { MoveLog } from "./MoveLog";
import { PlacementControls } from "./PlacementControls";
import { StatusBar } from "./StatusBar";
import { useGame } from "@/hooks/useGame";
import { canPlace, shipCells } from "@/lib/board";
import { FLEET } from "@/lib/ships";
import type { Coord } from "@/lib/types";

export function Game() {
  const { state, fireAt, placeAt, rotate, randomise, resetPlacement, newGame } =
    useGame();
  const [hover, setHover] = useState<Coord | null>(null);

  const placing = state.phase === "placement";
  const definition = FLEET[state.placementShipIndex];

  const previewCells =
    placing && hover && definition
      ? shipCells(definition, hover, state.placementOrientation)
      : [];
  const previewValid =
    placing && hover && definition
      ? canPlace(
          state.playerBoard,
          definition,
          hover,
          state.placementOrientation,
        )
      : true;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Battleship
          </h1>
          <p className="text-xs text-slate-400">
            You versus a hunt-and-target computer opponent.
          </p>
        </div>
        <button
          type="button"
          onClick={newGame}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        >
          New game
        </button>
      </header>

      <StatusBar state={state} />

      {placing && (
        <PlacementControls
          state={state}
          onRotate={rotate}
          onRandomise={randomise}
          onReset={resetPlacement}
        />
      )}

      {state.phase === "gameOver" && state.winner && (
        <GameOverBanner
          winner={state.winner}
          shotsFired={state.computerBoard.shots.length}
          onNewGame={newGame}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr_13rem]">
        <Board
          title="Your waters"
          subtitle={
            placing ? "Click to position your ships" : "The computer fires here"
          }
          board={state.playerBoard}
          revealShips
          interactive={placing}
          previewCells={previewCells}
          previewValid={previewValid}
          onCellSelect={placeAt}
          onCellHover={setHover}
          onLeave={() => setHover(null)}
        />

        <Board
          title="Enemy waters"
          subtitle={
            state.phase === "playerTurn"
              ? "Click a square to fire"
              : "Hold fire"
          }
          board={state.computerBoard}
          revealShips={state.phase === "gameOver"}
          interactive={state.phase === "playerTurn"}
          onCellSelect={fireAt}
        />

        <aside className="flex flex-col gap-3">
          <FleetStatus
            title="Your fleet"
            board={state.playerBoard}
            revealDamage
          />
          <FleetStatus
            title="Enemy fleet"
            board={state.computerBoard}
            revealDamage={state.phase === "gameOver"}
          />
          <MoveLog entries={state.log} />
        </aside>
      </div>
    </main>
  );
}
