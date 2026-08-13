import { describe, expect, it } from "vitest";
import { cellView, cellsMatch } from "./view";
import { createEmptyBoard, placeShip } from "./board";
import { attack } from "./attack";
import { FLEET } from "./ships";
import type { Board } from "./types";

const carrier = FLEET[0];
const destroyer = FLEET[4];

function boardWithDestroyer(): Board {
  return placeShip(
    createEmptyBoard(),
    destroyer,
    { row: 0, col: 0 },
    "horizontal",
  );
}

describe("cellView", () => {
  it("shows empty water as water", () => {
    expect(cellView(createEmptyBoard(), { row: 4, col: 4 }, true)).toBe(
      "water",
    );
  });

  it("hides an unhit enemy ship but shows your own", () => {
    const board = boardWithDestroyer();
    expect(cellView(board, { row: 0, col: 0 }, false)).toBe("water");
    expect(cellView(board, { row: 0, col: 0 }, true)).toBe("ship");
  });

  it("shows a miss on water that was fired at", () => {
    const { board } = attack(createEmptyBoard(), { row: 2, col: 2 });
    expect(cellView(board, { row: 2, col: 2 }, false)).toBe("miss");
  });

  it("shows a hit on a damaged but floating ship", () => {
    const board = placeShip(
      createEmptyBoard(),
      carrier,
      { row: 0, col: 0 },
      "horizontal",
    );
    const { board: after } = attack(board, { row: 0, col: 0 });
    expect(cellView(after, { row: 0, col: 0 }, false)).toBe("hit");
  });

  it("promotes every cell of a ship to sunk once it goes down", () => {
    let board = boardWithDestroyer();
    board = attack(board, { row: 0, col: 0 }).board;
    expect(cellView(board, { row: 0, col: 0 }, false)).toBe("hit");
    board = attack(board, { row: 0, col: 1 }).board;
    expect(cellView(board, { row: 0, col: 0 }, false)).toBe("sunk");
    expect(cellView(board, { row: 0, col: 1 }, false)).toBe("sunk");
  });
});

describe("cellsMatch", () => {
  it("recognises a coordinate in the preview set", () => {
    const preview = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ];
    expect(cellsMatch(preview, { row: 1, col: 2 })).toBe(true);
    expect(cellsMatch(preview, { row: 2, col: 1 })).toBe(false);
    expect(cellsMatch([], { row: 0, col: 0 })).toBe(false);
  });
});
