import { isCellSunk } from "./attack";
import { sameCoord, shipAt, shotAt } from "./board";
import type { Board, Coord } from "./types";

export type CellView = "water" | "ship" | "miss" | "hit" | "sunk" | "preview";

/**
 * What a square should look like. `revealShips` is false for the enemy board
 * while the game is running, so unhit ships stay hidden.
 */
export function cellView(
  board: Board,
  coord: Coord,
  revealShips: boolean,
): CellView {
  const shot = shotAt(board, coord);
  if (shot) {
    if (shot.result === "miss") return "miss";
    return isCellSunk(board, coord) ? "sunk" : "hit";
  }
  if (revealShips && shipAt(board, coord)) return "ship";
  return "water";
}

export function cellsMatch(cells: Coord[], coord: Coord): boolean {
  return cells.some((cell) => sameCoord(cell, coord));
}
