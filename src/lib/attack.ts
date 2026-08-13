import { allShipsSunk, hasBeenShot, isSunk, sameCoord, shipAt } from "./board";
import type { Board, Coord, Ship, ShotResult } from "./types";

export interface AttackOutcome {
  board: Board;
  /** False when the square had already been fired at. */
  accepted: boolean;
  result: ShotResult;
  sunkShip: Ship | null;
  allSunk: boolean;
}

/**
 * Applies a shot without mutating the board it was given.
 */
export function attack(board: Board, coord: Coord): AttackOutcome {
  if (hasBeenShot(board, coord)) {
    return {
      board,
      accepted: false,
      result: "miss",
      sunkShip: null,
      allSunk: false,
    };
  }

  const target = shipAt(board, coord);
  const result: ShotResult = target ? "hit" : "miss";

  const ships = target
    ? board.ships.map((ship) =>
        ship.id === target.id ? { ...ship, hits: [...ship.hits, coord] } : ship,
      )
    : board.ships;

  const nextBoard: Board = {
    ships,
    shots: [...board.shots, { coord, result }],
  };

  const updated = target
    ? (ships.find((ship) => ship.id === target.id) as Ship)
    : null;
  const sunkShip = updated && isSunk(updated) ? updated : null;

  return {
    board: nextBoard,
    accepted: true,
    result,
    sunkShip,
    allSunk: allShipsSunk(nextBoard),
  };
}

/** The squares of every sunk ship — used to reveal them on the board. */
export function sunkCells(board: Board): Coord[] {
  return board.ships.filter(isSunk).flatMap((ship) => ship.cells);
}

export function isCellSunk(board: Board, coord: Coord): boolean {
  return sunkCells(board).some((cell) => sameCoord(cell, coord));
}
