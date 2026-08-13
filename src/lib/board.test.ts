import { describe, expect, it } from "vitest";
import {
  canPlace,
  coordKey,
  coordLabel,
  createEmptyBoard,
  isOnBoard,
  placeShip,
  randomBoard,
  shipCells,
} from "./board";
import { FLEET, TOTAL_SHIP_CELLS } from "./ships";
import { BOARD_SIZE } from "./types";

const carrier = FLEET[0]; // length 5
const destroyer = FLEET[4]; // length 2

describe("shipCells", () => {
  it("lays a ship out along the chosen axis", () => {
    expect(shipCells(destroyer, { row: 3, col: 4 }, "horizontal")).toEqual([
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ]);
    expect(shipCells(destroyer, { row: 3, col: 4 }, "vertical")).toEqual([
      { row: 3, col: 4 },
      { row: 4, col: 4 },
    ]);
  });
});

describe("canPlace boundaries", () => {
  it("allows a ship ending exactly on the last column or row", () => {
    const board = createEmptyBoard();
    expect(canPlace(board, carrier, { row: 0, col: 5 }, "horizontal")).toBe(
      true,
    );
    expect(canPlace(board, carrier, { row: 5, col: 0 }, "vertical")).toBe(true);
  });

  it("rejects a ship extending one square past the edge", () => {
    const board = createEmptyBoard();
    expect(canPlace(board, carrier, { row: 0, col: 6 }, "horizontal")).toBe(
      false,
    );
    expect(canPlace(board, carrier, { row: 6, col: 0 }, "vertical")).toBe(false);
  });

  it("rejects origins off the board", () => {
    const board = createEmptyBoard();
    expect(canPlace(board, destroyer, { row: -1, col: 0 }, "horizontal")).toBe(
      false,
    );
    expect(canPlace(board, destroyer, { row: 0, col: -1 }, "horizontal")).toBe(
      false,
    );
    expect(canPlace(board, destroyer, { row: 10, col: 0 }, "vertical")).toBe(
      false,
    );
  });

  it("accepts placements in every corner", () => {
    const board = createEmptyBoard();
    const last = BOARD_SIZE - 1;
    expect(canPlace(board, destroyer, { row: 0, col: 0 }, "horizontal")).toBe(
      true,
    );
    expect(
      canPlace(board, destroyer, { row: 0, col: last - 1 }, "horizontal"),
    ).toBe(true);
    expect(canPlace(board, destroyer, { row: last, col: 0 }, "horizontal")).toBe(
      true,
    );
    expect(
      canPlace(board, destroyer, { row: last - 1, col: last }, "vertical"),
    ).toBe(true);
  });
});

describe("canPlace overlap", () => {
  const board = placeShip(
    createEmptyBoard(),
    carrier,
    { row: 4, col: 2 },
    "horizontal",
  ); // occupies row 4, cols 2..6

  it("rejects a crossing placement", () => {
    expect(canPlace(board, destroyer, { row: 3, col: 4 }, "vertical")).toBe(
      false,
    );
  });

  it("rejects a fully contained placement", () => {
    expect(canPlace(board, destroyer, { row: 4, col: 3 }, "horizontal")).toBe(
      false,
    );
  });

  it("allows a placement touching end to end", () => {
    expect(canPlace(board, destroyer, { row: 4, col: 7 }, "horizontal")).toBe(
      true,
    );
    expect(canPlace(board, destroyer, { row: 4, col: 0 }, "horizontal")).toBe(
      true,
    );
  });

  it("allows a placement alongside", () => {
    expect(canPlace(board, destroyer, { row: 5, col: 2 }, "horizontal")).toBe(
      true,
    );
  });
});

describe("placeShip", () => {
  it("leaves the original board untouched", () => {
    const board = createEmptyBoard();
    const next = placeShip(board, carrier, { row: 0, col: 0 }, "horizontal");
    expect(board.ships).toHaveLength(0);
    expect(next.ships).toHaveLength(1);
  });

  it("ignores an illegal placement", () => {
    const board = createEmptyBoard();
    const next = placeShip(board, carrier, { row: 0, col: 9 }, "horizontal");
    expect(next.ships).toHaveLength(0);
  });
});

describe("randomBoard", () => {
  it("produces a legal fleet every time", () => {
    for (let run = 0; run < 1000; run += 1) {
      const board = randomBoard();
      expect(board.ships).toHaveLength(FLEET.length);

      const occupied = new Set<string>();
      for (const ship of board.ships) {
        const definition = FLEET.find((entry) => entry.id === ship.id);
        expect(definition).toBeDefined();
        expect(ship.cells).toHaveLength(definition!.length);
        for (const cell of ship.cells) {
          expect(isOnBoard(cell)).toBe(true);
          expect(occupied.has(coordKey(cell))).toBe(false);
          occupied.add(coordKey(cell));
        }
      }
      expect(occupied.size).toBe(TOTAL_SHIP_CELLS);
    }
  });
});

describe("coordLabel", () => {
  it("uses letters for columns and one-based rows", () => {
    expect(coordLabel({ row: 0, col: 0 })).toBe("A1");
    expect(coordLabel({ row: 9, col: 9 })).toBe("J10");
    expect(coordLabel({ row: 3, col: 2 })).toBe("C4");
  });
});

describe("randomBoard giving up", () => {
  it("throws rather than looping forever when no placement can succeed", () => {
    // A random source stuck at zero always proposes A1 horizontally, so only
    // the first ship can ever be placed. The attempt and restart limits must
    // end the search instead of spinning.
    expect(() => randomBoard(() => 0)).toThrow(/unable to place the fleet/i);
  });
});
