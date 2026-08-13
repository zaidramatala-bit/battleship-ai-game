import { describe, expect, it } from "vitest";
import { attack, isCellSunk } from "./attack";
import { createEmptyBoard, placeShip } from "./board";
import { FLEET } from "./ships";
import type { Board } from "./types";

const destroyer = FLEET[4]; // length 2
const cruiser = FLEET[2]; // length 3

function boardWithDestroyer(): Board {
  return placeShip(
    createEmptyBoard(),
    destroyer,
    { row: 2, col: 2 },
    "horizontal",
  ); // C3 and D3
}

describe("attack", () => {
  it("records a miss on empty water", () => {
    const outcome = attack(boardWithDestroyer(), { row: 0, col: 0 });
    expect(outcome.accepted).toBe(true);
    expect(outcome.result).toBe("miss");
    expect(outcome.sunkShip).toBeNull();
    expect(outcome.board.shots).toHaveLength(1);
  });

  it("records a hit and damages the ship", () => {
    const outcome = attack(boardWithDestroyer(), { row: 2, col: 2 });
    expect(outcome.result).toBe("hit");
    expect(outcome.sunkShip).toBeNull();
    expect(outcome.board.ships[0].hits).toHaveLength(1);
  });

  it("does not mutate the board it was given", () => {
    const board = boardWithDestroyer();
    attack(board, { row: 2, col: 2 });
    expect(board.shots).toHaveLength(0);
    expect(board.ships[0].hits).toHaveLength(0);
  });

  it("reports a sinking only on the final hit", () => {
    const first = attack(boardWithDestroyer(), { row: 2, col: 2 });
    expect(first.sunkShip).toBeNull();
    const second = attack(first.board, { row: 2, col: 3 });
    expect(second.sunkShip?.name).toBe("Destroyer");
    expect(isCellSunk(second.board, { row: 2, col: 3 })).toBe(true);
  });

  it("refuses a repeated shot and changes nothing", () => {
    const first = attack(boardWithDestroyer(), { row: 5, col: 5 });
    const second = attack(first.board, { row: 5, col: 5 });
    expect(second.accepted).toBe(false);
    expect(second.board).toBe(first.board);
    expect(second.board.shots).toHaveLength(1);
  });

  it("refuses a repeated shot on a square that was a hit", () => {
    const first = attack(boardWithDestroyer(), { row: 2, col: 2 });
    const second = attack(first.board, { row: 2, col: 2 });
    expect(second.accepted).toBe(false);
    expect(second.board.ships[0].hits).toHaveLength(1);
  });
});

describe("win detection", () => {
  it("reports all sunk only once the last ship goes down", () => {
    let board = createEmptyBoard();
    board = placeShip(board, destroyer, { row: 0, col: 0 }, "horizontal");
    board = placeShip(board, cruiser, { row: 2, col: 0 }, "horizontal");

    const shots = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
    ];
    for (const shot of shots) {
      const outcome = attack(board, shot);
      expect(outcome.allSunk).toBe(false);
      board = outcome.board;
    }

    const final = attack(board, { row: 2, col: 2 });
    expect(final.allSunk).toBe(true);
  });

  it("does not report a win on an empty board", () => {
    const outcome = attack(createEmptyBoard(), { row: 0, col: 0 });
    expect(outcome.allSunk).toBe(false);
  });
});
