import { FLEET } from "./ships";
import {
  BOARD_SIZE,
  type Board,
  type Coord,
  type Orientation,
  type Ship,
  type ShipDefinition,
} from "./types";

export const COLUMN_LABELS = "ABCDEFGHIJ".split("");

export function coordKey(coord: Coord): string {
  return `${coord.row},${coord.col}`;
}

export function coordLabel(coord: Coord): string {
  return `${COLUMN_LABELS[coord.col]}${coord.row + 1}`;
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isOnBoard(coord: Coord): boolean {
  return (
    coord.row >= 0 &&
    coord.row < BOARD_SIZE &&
    coord.col >= 0 &&
    coord.col < BOARD_SIZE
  );
}

export function createEmptyBoard(): Board {
  return { ships: [], shots: [] };
}

/**
 * The squares a ship would occupy, ignoring whether that is legal.
 */
export function shipCells(
  definition: ShipDefinition,
  origin: Coord,
  orientation: Orientation,
): Coord[] {
  return Array.from({ length: definition.length }, (_, offset) =>
    orientation === "horizontal"
      ? { row: origin.row, col: origin.col + offset }
      : { row: origin.row + offset, col: origin.col },
  );
}

/**
 * The single source of truth for a legal placement: manual placement, the
 * hover preview and random placement all defer to this.
 */
export function canPlace(
  board: Board,
  definition: ShipDefinition,
  origin: Coord,
  orientation: Orientation,
): boolean {
  const cells = shipCells(definition, origin, orientation);
  if (!cells.every(isOnBoard)) return false;

  const occupied = new Set(
    board.ships.flatMap((ship) => ship.cells.map(coordKey)),
  );
  return cells.every((cell) => !occupied.has(coordKey(cell)));
}

export function placeShip(
  board: Board,
  definition: ShipDefinition,
  origin: Coord,
  orientation: Orientation,
): Board {
  if (!canPlace(board, definition, origin, orientation)) {
    return board;
  }
  const ship: Ship = {
    id: definition.id,
    name: definition.name,
    length: definition.length,
    cells: shipCells(definition, origin, orientation),
    hits: [],
  };
  return { ...board, ships: [...board.ships, ship] };
}

const MAX_PLACEMENT_ATTEMPTS = 500;

/**
 * Places the whole fleet at random. Restarting from an empty board after too
 * many failed attempts guarantees this terminates.
 */
export function randomBoard(random: () => number = Math.random): Board {
  for (let restart = 0; restart < 20; restart += 1) {
    let board = createEmptyBoard();
    let failed = false;

    for (const definition of FLEET) {
      let placed = false;
      for (
        let attempt = 0;
        attempt < MAX_PLACEMENT_ATTEMPTS && !placed;
        attempt += 1
      ) {
        const orientation: Orientation =
          random() < 0.5 ? "horizontal" : "vertical";
        const origin: Coord = {
          row: Math.floor(random() * BOARD_SIZE),
          col: Math.floor(random() * BOARD_SIZE),
        };
        if (canPlace(board, definition, origin, orientation)) {
          board = placeShip(board, definition, origin, orientation);
          placed = true;
        }
      }
      if (!placed) {
        failed = true;
        break;
      }
    }

    if (!failed) return board;
  }
  throw new Error("Unable to place the fleet");
}

export function isSunk(ship: Ship): boolean {
  return ship.hits.length === ship.length;
}

export function allShipsSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every(isSunk);
}

export function shotAt(board: Board, coord: Coord) {
  return board.shots.find((shot) => sameCoord(shot.coord, coord));
}

export function hasBeenShot(board: Board, coord: Coord): boolean {
  return shotAt(board, coord) !== undefined;
}

export function shipAt(board: Board, coord: Coord): Ship | undefined {
  return board.ships.find((ship) =>
    ship.cells.some((cell) => sameCoord(cell, coord)),
  );
}
