import { allShipsSunk, hasBeenShot, isSunk, sameCoord, shipAt } from "./board";
import type { Board, Coord, Ship, ShotResult } from "./types";

/**
 * Either a shot that landed or a refusal. They are separate shapes so that a
 * refused shot cannot be mistaken for a miss: the result of a shot that was
 * never fired simply does not exist, and the compiler makes callers check
 * `accepted` before they can read one.
 */
export type AttackOutcome =
  | { accepted: false; board: Board }
  | {
      accepted: true;
      board: Board;
      result: ShotResult;
      sunkShip: Ship | null;
      allSunk: boolean;
    };

/**
 * Applies a shot without mutating the board it was given.
 */
export function attack(board: Board, coord: Coord): AttackOutcome {
  if (hasBeenShot(board, coord)) {
    return { accepted: false, board };
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
    accepted: true,
    board: nextBoard,
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
