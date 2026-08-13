import { describe, expect, it } from "vitest";
import { createAiMemory, nextShot, registerResult } from "./ai";
import { attack } from "./attack";
import { coordKey, isOnBoard, randomBoard, sameCoord } from "./board";
import { TOTAL_SHIP_CELLS } from "./ships";
import type { AiMemory, Coord, Shot } from "./types";

function shotsFrom(coords: Coord[], result: "hit" | "miss" = "miss"): Shot[] {
  return coords.map((coord) => ({ coord, result }));
}

function isAdjacent(a: Coord, b: Coord): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

describe("hunt mode", () => {
  it("only fires at squares it has not fired at", () => {
    const fired: Coord[] = [];
    let shots: Shot[] = [];
    for (let turn = 0; turn < 100; turn += 1) {
      const coord = nextShot(shots, createAiMemory());
      expect(coord).not.toBeNull();
      expect(isOnBoard(coord!)).toBe(true);
      expect(fired.some((prev) => sameCoord(prev, coord!))).toBe(false);
      fired.push(coord!);
      shots = shotsFrom(fired);
    }
  });

  it("prefers the checkerboard pattern while such squares remain", () => {
    const coord = nextShot([], createAiMemory());
    expect((coord!.row + coord!.col) % 2).toBe(0);
  });

  it("falls back to the remaining squares once the pattern is exhausted", () => {
    const parity: Coord[] = [];
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        if ((row + col) % 2 === 0) parity.push({ row, col });
      }
    }
    const coord = nextShot(shotsFrom(parity), createAiMemory());
    expect(coord).not.toBeNull();
    expect((coord!.row + coord!.col) % 2).toBe(1);
  });

  it("returns null when the whole board has been fired at", () => {
    const all: Coord[] = [];
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 10; col += 1) all.push({ row, col });
    }
    expect(nextShot(shotsFrom(all), createAiMemory())).toBeNull();
  });
});

describe("target mode", () => {
  it("fires next to a single hit", () => {
    const hit = { row: 4, col: 4 };
    const memory: AiMemory = { mode: "target", activeHits: [hit] };
    for (let run = 0; run < 50; run += 1) {
      const coord = nextShot(shotsFrom([hit], "hit"), memory);
      expect(isAdjacent(coord!, hit)).toBe(true);
    }
  });

  it("never queues squares off the board when the hit is in a corner", () => {
    const hit = { row: 0, col: 0 };
    const memory: AiMemory = { mode: "target", activeHits: [hit] };
    for (let run = 0; run < 50; run += 1) {
      const coord = nextShot(shotsFrom([hit], "hit"), memory);
      expect(isOnBoard(coord!)).toBe(true);
      expect(isAdjacent(coord!, hit)).toBe(true);
    }
  });

  it("continues along the line after two hits in a row", () => {
    const hits = [
      { row: 4, col: 4 },
      { row: 4, col: 5 },
    ];
    const memory: AiMemory = { mode: "target", activeHits: hits };
    for (let run = 0; run < 50; run += 1) {
      const coord = nextShot(shotsFrom(hits, "hit"), memory);
      expect(coord!.row).toBe(4);
      expect([3, 6]).toContain(coord!.col);
    }
  });

  it("continues along a vertical line", () => {
    const hits = [
      { row: 4, col: 4 },
      { row: 5, col: 4 },
    ];
    const memory: AiMemory = { mode: "target", activeHits: hits };
    for (let run = 0; run < 50; run += 1) {
      const coord = nextShot(shotsFrom(hits, "hit"), memory);
      expect(coord!.col).toBe(4);
      expect([3, 6]).toContain(coord!.row);
    }
  });

  it("tries the other end when one end is already spent", () => {
    const hits = [
      { row: 4, col: 4 },
      { row: 4, col: 5 },
    ];
    const memory: AiMemory = { mode: "target", activeHits: hits };
    const shots: Shot[] = [
      ...shotsFrom(hits, "hit"),
      { coord: { row: 4, col: 6 }, result: "miss" },
    ];
    expect(nextShot(shots, memory)).toEqual({ row: 4, col: 3 });
  });

  it("probes around the hit again when the whole line is spent", () => {
    // A vertical ship whose horizontal neighbours were tried first.
    const hits = [{ row: 4, col: 4 }];
    const memory: AiMemory = { mode: "target", activeHits: hits };
    const shots: Shot[] = [
      ...shotsFrom(hits, "hit"),
      { coord: { row: 4, col: 3 }, result: "miss" },
      { coord: { row: 4, col: 5 }, result: "miss" },
    ];
    const coord = nextShot(shots, memory);
    expect(coord!.col).toBe(4);
    expect([3, 5]).toContain(coord!.row);
  });
});

describe("registerResult", () => {
  it("switches to target mode on a hit", () => {
    const memory = registerResult(
      createAiMemory(),
      { row: 1, col: 1 },
      "hit",
      null,
    );
    expect(memory.mode).toBe("target");
    expect(memory.activeHits).toHaveLength(1);
  });

  it("ignores a miss", () => {
    const memory = createAiMemory();
    expect(registerResult(memory, { row: 1, col: 1 }, "miss", null)).toBe(
      memory,
    );
  });

  it("returns to hunting once the wounded ship is sunk", () => {
    const cells = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ];
    let memory = registerResult(createAiMemory(), cells[0], "hit", null);
    memory = registerResult(memory, cells[1], "hit", cells);
    expect(memory.mode).toBe("hunt");
    expect(memory.activeHits).toHaveLength(0);
  });

  it("keeps hits on a neighbouring ship after a sinking", () => {
    const destroyerCells = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ];
    const neighbourHit = { row: 2, col: 5 };
    let memory = registerResult(createAiMemory(), neighbourHit, "hit", null);
    memory = registerResult(memory, destroyerCells[0], "hit", null);
    memory = registerResult(memory, destroyerCells[1], "hit", destroyerCells);
    expect(memory.mode).toBe("target");
    expect(memory.activeHits).toEqual([neighbourHit]);
  });

  it("chases the surviving ship rather than the sunk one", () => {
    // Two ships side by side: hits on both, then one sinks.
    const sunkCells = [
      { row: 5, col: 5 },
      { row: 5, col: 6 },
    ];
    const survivorHit = { row: 6, col: 5 };
    let memory = registerResult(createAiMemory(), sunkCells[0], "hit", null);
    memory = registerResult(memory, survivorHit, "hit", null);
    memory = registerResult(memory, sunkCells[1], "hit", sunkCells);

    const shots: Shot[] = [
      ...shotsFrom(sunkCells, "hit"),
      { coord: survivorHit, result: "hit" },
    ];
    const coord = nextShot(shots, memory);
    expect(isAdjacent(coord!, survivorHit)).toBe(true);
  });
});

describe("self play", () => {
  it("sinks every fleet without repeating, crashing or stalling", () => {
    const GAMES = 300;
    let totalMoves = 0;

    for (let game = 0; game < GAMES; game += 1) {
      let board = randomBoard();
      let memory = createAiMemory();
      const fired = new Set<string>();
      let moves = 0;

      while (moves < 200) {
        const coord = nextShot(board.shots, memory);
        expect(coord).not.toBeNull();
        expect(isOnBoard(coord!)).toBe(true);
        expect(fired.has(coordKey(coord!))).toBe(false);
        fired.add(coordKey(coord!));

        const outcome = attack(board, coord!);
        expect(outcome.accepted).toBe(true);
        board = outcome.board;
        memory = registerResult(
          memory,
          coord!,
          outcome.result,
          outcome.sunkShip?.cells ?? null,
        );
        moves += 1;
        if (outcome.allSunk) break;
      }

      expect(board.ships.every((ship) => ship.hits.length === ship.length)).toBe(
        true,
      );
      expect(moves).toBeLessThanOrEqual(95);
      totalMoves += moves;
    }

    // A purely random opponent needs ~95 moves; hunt-and-target should be far
    // quicker. This is what catches an AI that still wins but has stopped
    // targeting properly.
    const average = totalMoves / GAMES;
    expect(average).toBeGreaterThan(TOTAL_SHIP_CELLS);
    expect(average).toBeLessThan(75);
  });
});
