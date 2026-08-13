"use client";

import { useCallback, useEffect, useReducer } from "react";
import { createInitialState, gameReducer } from "@/lib/game";
import type { Coord } from "@/lib/types";

/** Long enough for the computer's move to read as a move rather than a glitch. */
export const COMPUTER_DELAY_MS = 700;

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createInitialState(),
  );

  // The pending move is tied to the current turn, so restarting or winning
  // cancels a shot that has not landed yet.
  useEffect(() => {
    if (state.phase !== "computerTurn") return;
    const timer = setTimeout(
      () => dispatch({ type: "computerFire" }),
      COMPUTER_DELAY_MS,
    );
    return () => clearTimeout(timer);
  }, [state.phase, state.log.length]);

  return {
    state,
    fireAt: useCallback(
      (coord: Coord) => dispatch({ type: "playerFire", coord }),
      [],
    ),
    placeAt: useCallback(
      (origin: Coord) => dispatch({ type: "placeShip", origin }),
      [],
    ),
    rotate: useCallback(() => dispatch({ type: "rotate" }), []),
    randomise: useCallback(() => dispatch({ type: "randomisePlacement" }), []),
    resetPlacement: useCallback(
      () => dispatch({ type: "resetPlacement" }),
      [],
    ),
    newGame: useCallback(() => dispatch({ type: "newGame" }), []),
  };
}
