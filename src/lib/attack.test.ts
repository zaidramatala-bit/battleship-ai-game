import { describe, expect, it } from "vitest";
import { attack, isCellSunk, type AttackOutcome } from "./attack";
import { createEmptyBoard, placeShip } from "./board";
import { FLEET } from "./ships";
import type { Board, Coord } from "./types";

/** Fires and insists the shot landed, so the result can be inspected. */
function fire(board: Board, coord: Coord) {
  const outcome = attack(board, coord);
  if (!outcome.accepted) throw new Error("expected the shot to be accepted");
  return outcome;
}

/** Narrowing helper for the refusal branch. */
function refusal(outcome: AttackOutcome) {
  expect(outcome.accepted).toBe(false);
  return outcome;
}

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
    const outcome = fire(boardWithDestroyer(), { row: 0, col: 0 });
    expect(outcome.result).toBe("miss");
    expect(outcome.sunkShip).toBeNull();
    expect(outcome.board.shots).toHaveLength(1);
  });

  it("records a hit and damages the ship", () => {
    const outcome = fire(boardWithDestroyer(), { row: 2, col: 2 });
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
    const first = fire(boardWithDestroyer(), { row: 2, col: 2 });
    expect(first.sunkShip).toBeNull();
    const second = fire(first.board, { row: 2, col: 3 });
    expect(second.sunkShip?.name).toBe("Destroyer");
    expect(isCellSunk(second.board, { row: 2, col: 3 })).toBe(true);
  });

  it("refuses a repeated shot and changes nothing", () => {
    const first = fire(boardWithDestroyer(), { row: 5, col: 5 });
    const second = refusal(attack(first.board, { row: 5, col: 5 }));
    expect(second.board).toBe(first.board);
    expect(second.board.shots).toHaveLength(1);
  });

  it("refuses a repeated shot on a square that was a hit", () => {
    const first = fire(boardWithDestroyer(), { row: 2, col: 2 });
    const second = refusal(attack(first.board, { row: 2, col: 2 }));
    expect(second.board.ships[0].hits).toHaveLength(1);
  });

  it("reports no result at all for a refused shot", () => {
    // Regression: a refused shot used to describe itself as a miss, which a
    // caller that forgot to check `accepted` would have believed.
    const first = fire(boardWithDestroyer(), { row: 2, col: 2 });
    const second = attack(first.board, { row: 2, col: 2 });
    expect(second).toEqual({ accepted: false, board: first.board });
    expect("result" in second).toBe(false);
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
      const outcome = fire(board, shot);
      expect(outcome.allSunk).toBe(false);
      board = outcome.board;
    }

    const final = fire(board, { row: 2, col: 2 });
    expect(final.allSunk).toBe(true);
  });

  it("does not report a win on an empty board", () => {
    const outcome = fire(createEmptyBoard(), { row: 0, col: 0 });
    expect(outcome.allSunk).toBe(false);
  });
});
