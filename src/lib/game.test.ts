import { describe, expect, it } from "vitest";
import { createInitialState, gameReducer, type GameAction } from "./game";
import { FLEET } from "./ships";
import type { Coord, GameState } from "./types";

function run(state: GameState, actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function readyGame(): GameState {
  return gameReducer(createInitialState(), { type: "randomisePlacement" });
}

/** A square of the computer's board that holds a ship, and one that does not. */
function findCells(state: GameState) {
  const occupied = new Set(
    state.computerBoard.ships.flatMap((ship) =>
      ship.cells.map((cell) => `${cell.row},${cell.col}`),
    ),
  );
  let hit: Coord | null = null;
  let miss: Coord | null = null;
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 10; col += 1) {
      const key = `${row},${col}`;
      if (occupied.has(key)) hit ??= { row, col };
      else miss ??= { row, col };
    }
  }
  return { hit: hit!, miss: miss! };
}

describe("placement phase", () => {
  it("starts in placement with the computer's fleet already placed", () => {
    const state = createInitialState();
    expect(state.phase).toBe("placement");
    expect(state.playerBoard.ships).toHaveLength(0);
    expect(state.computerBoard.ships).toHaveLength(FLEET.length);
  });

  it("places ships in fleet order and starts play after the last one", () => {
    let state = createInitialState();
    const origins: Coord[] = [
      { row: 0, col: 0 },
      { row: 2, col: 0 },
      { row: 4, col: 0 },
      { row: 6, col: 0 },
      { row: 8, col: 0 },
    ];
    origins.forEach((origin, index) => {
      state = gameReducer(state, { type: "placeShip", origin });
      expect(state.playerBoard.ships).toHaveLength(index + 1);
    });
    expect(state.phase).toBe("playerTurn");
  });

  it("ignores an illegal placement", () => {
    const state = createInitialState();
    const next = gameReducer(state, {
      type: "placeShip",
      origin: { row: 0, col: 9 },
    });
    expect(next).toBe(state);
  });

  it("rotates the orientation", () => {
    const state = gameReducer(createInitialState(), { type: "rotate" });
    expect(state.placementOrientation).toBe("vertical");
    expect(gameReducer(state, { type: "rotate" }).placementOrientation).toBe(
      "horizontal",
    );
  });

  it("randomising places a full legal fleet and starts play", () => {
    const state = readyGame();
    expect(state.playerBoard.ships).toHaveLength(FLEET.length);
    expect(state.phase).toBe("playerTurn");
  });

  it("resetting clears the player's board only", () => {
    let state = gameReducer(createInitialState(), {
      type: "placeShip",
      origin: { row: 0, col: 0 },
    });
    state = gameReducer(state, { type: "resetPlacement" });
    expect(state.playerBoard.ships).toHaveLength(0);
    expect(state.placementShipIndex).toBe(0);
    expect(state.computerBoard.ships).toHaveLength(FLEET.length);
  });
});

describe("player turn", () => {
  it("records a shot and hands the turn to the computer", () => {
    const state = readyGame();
    const { miss } = findCells(state);
    const next = gameReducer(state, { type: "playerFire", coord: miss });
    expect(next.computerBoard.shots).toHaveLength(1);
    expect(next.phase).toBe("computerTurn");
    expect(next.log).toHaveLength(1);
  });

  it("announces a sunk ship", () => {
    let state = readyGame();
    const target = state.computerBoard.ships[4]; // Destroyer, length 2
    for (const cell of target.cells) {
      state = gameReducer(state, { type: "playerFire", coord: cell });
      state = { ...state, phase: "playerTurn" };
    }
    expect(state.log.at(-1)?.sunkShipName).toBe(target.name);
    expect(state.message).toContain(target.name);
  });

  it("refuses a repeated shot", () => {
    const state = readyGame();
    const { miss } = findCells(state);
    const fired = gameReducer(state, { type: "playerFire", coord: miss });
    const again = gameReducer(
      { ...fired, phase: "playerTurn" },
      { type: "playerFire", coord: miss },
    );
    expect(again.computerBoard.shots).toHaveLength(1);
  });

  it("ignores a shot while it is the computer's turn", () => {
    const state = readyGame();
    const { miss, hit } = findCells(state);
    const fired = gameReducer(state, { type: "playerFire", coord: miss });
    expect(fired.phase).toBe("computerTurn");
    const rapid = gameReducer(fired, { type: "playerFire", coord: hit });
    expect(rapid).toBe(fired);
    expect(rapid.computerBoard.shots).toHaveLength(1);
  });

  it("ignores a burst of rapid clicks beyond the first", () => {
    const state = readyGame();
    const coords: Coord[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];
    const after = run(
      state,
      coords.map((coord) => ({ type: "playerFire", coord }) as GameAction),
    );
    expect(after.computerBoard.shots).toHaveLength(1);
  });

  it("ignores placement actions once play has started", () => {
    const state = readyGame();
    expect(gameReducer(state, { type: "rotate" })).toBe(state);
    expect(gameReducer(state, { type: "resetPlacement" })).toBe(state);
    expect(gameReducer(state, { type: "randomisePlacement" })).toBe(state);
    expect(
      gameReducer(state, { type: "placeShip", origin: { row: 0, col: 0 } }),
    ).toBe(state);
  });
});

describe("computer turn", () => {
  it("fires once and hands the turn back", () => {
    const state = readyGame();
    const { miss } = findCells(state);
    const fired = gameReducer(state, { type: "playerFire", coord: miss });
    const replied = gameReducer(fired, { type: "computerFire" });
    expect(replied.playerBoard.shots).toHaveLength(1);
    expect(replied.phase).toBe("playerTurn");
  });

  it("does nothing when it is not the computer's turn", () => {
    const state = readyGame();
    expect(gameReducer(state, { type: "computerFire" })).toBe(state);
  });

  it("never fires the same square twice over a whole game", () => {
    let state = readyGame();
    const seen = new Set<string>();
    let guard = 0;
    while (state.phase !== "gameOver" && guard < 400) {
      if (state.phase === "playerTurn") {
        const next = state.computerBoard.shots.length;
        state = gameReducer(state, {
          type: "playerFire",
          coord: { row: Math.floor(next / 10), col: next % 10 },
        });
      } else {
        const before = state.playerBoard.shots.length;
        state = gameReducer(state, { type: "computerFire" });
        const shot = state.playerBoard.shots[before];
        if (shot) {
          const key = `${shot.coord.row},${shot.coord.col}`;
          expect(seen.has(key)).toBe(false);
          seen.add(key);
        }
      }
      guard += 1;
    }
    expect(state.phase).toBe("gameOver");
  });
});

describe("winning", () => {
  it("ends the game and denies the computer a reply when the player wins", () => {
    let state = readyGame();
    const enemyCells = state.computerBoard.ships.flatMap((ship) => ship.cells);
    for (const cell of enemyCells) {
      state = gameReducer({ ...state, phase: "playerTurn" }, {
        type: "playerFire",
        coord: cell,
      });
    }
    expect(state.phase).toBe("gameOver");
    expect(state.winner).toBe("player");
    // A pending computer move must not land after the win.
    const after = gameReducer(state, { type: "computerFire" });
    expect(after).toBe(state);
    expect(after.playerBoard.shots).toHaveLength(0);
  });

  it("ends the game when the computer sinks the last player ship", () => {
    let state = readyGame();
    const ownCells = state.playerBoard.ships.flatMap((ship) => ship.cells);
    // Sink all but the final square by hand, then let the computer finish it.
    for (const cell of ownCells.slice(0, -1)) {
      const outcome = gameReducer(
        { ...state, phase: "computerTurn", aiMemory: state.aiMemory },
        { type: "computerFire" },
      );
      void outcome;
      state = {
        ...state,
        playerBoard: {
          ships: state.playerBoard.ships.map((ship) =>
            ship.cells.some(
              (c) => c.row === cell.row && c.col === cell.col,
            ) && !ship.hits.some((h) => h.row === cell.row && h.col === cell.col)
              ? { ...ship, hits: [...ship.hits, cell] }
              : ship,
          ),
          shots: [...state.playerBoard.shots, { coord: cell, result: "hit" }],
        },
      };
    }
    const last = ownCells.at(-1)!;
    state = {
      ...state,
      phase: "computerTurn",
      aiMemory: { mode: "target", activeHits: [last] },
    };
    // Force the AI onto the final square by leaving it as the only one open.
    const remaining: Coord[] = [];
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        const already = state.playerBoard.shots.some(
          (shot) => shot.coord.row === row && shot.coord.col === col,
        );
        if (!already && !(row === last.row && col === last.col)) {
          remaining.push({ row, col });
        }
      }
    }
    state = {
      ...state,
      aiMemory: { mode: "hunt", activeHits: [] },
      playerBoard: {
        ...state.playerBoard,
        shots: [
          ...state.playerBoard.shots,
          ...remaining.map((coord) => ({ coord, result: "miss" as const })),
        ],
      },
    };
    state = gameReducer(state, { type: "computerFire" });
    expect(state.phase).toBe("gameOver");
    expect(state.winner).toBe("computer");
  });
});

describe("new game", () => {
  it("clears both boards and returns to placement", () => {
    let state = readyGame();
    state = gameReducer(state, {
      type: "playerFire",
      coord: findCells(state).miss,
    });
    const fresh = gameReducer(state, { type: "newGame" });
    expect(fresh.phase).toBe("placement");
    expect(fresh.playerBoard.ships).toHaveLength(0);
    expect(fresh.playerBoard.shots).toHaveLength(0);
    expect(fresh.computerBoard.shots).toHaveLength(0);
    expect(fresh.log).toHaveLength(0);
    expect(fresh.winner).toBeNull();
  });
});
