import { attack } from "./attack";
import { createAiMemory, nextShot, registerResult } from "./ai";
import {
  canPlace,
  coordLabel,
  createEmptyBoard,
  placeShip,
  randomBoard,
} from "./board";
import { FLEET } from "./ships";
import type {
  Coord,
  GameState,
  LogEntry,
  Orientation,
  Player,
  ShotResult,
} from "./types";

export type GameAction =
  | { type: "placeShip"; origin: Coord }
  | { type: "rotate" }
  | { type: "randomisePlacement" }
  | { type: "resetPlacement" }
  | { type: "playerFire"; coord: Coord }
  | { type: "computerFire" }
  | { type: "newGame" };

export function createInitialState(): GameState {
  return {
    phase: "placement",
    playerBoard: createEmptyBoard(),
    computerBoard: randomBoard(),
    aiMemory: createAiMemory(),
    winner: null,
    log: [],
    message: "Place your fleet to begin.",
    placementShipIndex: 0,
    placementOrientation: "horizontal",
  };
}

function describe(
  attacker: Player,
  coord: Coord,
  result: ShotResult,
  sunkShipName?: string,
): string {
  const who = attacker === "player" ? "You" : "The computer";
  const where = coordLabel(coord);
  if (sunkShipName) {
    return attacker === "player"
      ? `Hit at ${where} — you sank their ${sunkShipName}!`
      : `Hit at ${where} — the computer sank your ${sunkShipName}!`;
  }
  return result === "hit"
    ? `${who} hit at ${where}.`
    : `${who} missed at ${where}.`;
}

function appendLog(log: LogEntry[], entry: Omit<LogEntry, "id">): LogEntry[] {
  return [...log, { ...entry, id: log.length }];
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "newGame":
      return createInitialState();

    case "rotate": {
      if (state.phase !== "placement") return state;
      return {
        ...state,
        placementOrientation:
          state.placementOrientation === "horizontal"
            ? "vertical"
            : "horizontal",
      };
    }

    case "resetPlacement": {
      if (state.phase !== "placement") return state;
      return {
        ...state,
        playerBoard: createEmptyBoard(),
        placementShipIndex: 0,
        message: "Place your fleet to begin.",
      };
    }

    case "randomisePlacement": {
      if (state.phase !== "placement") return state;
      return {
        ...state,
        playerBoard: randomBoard(),
        placementShipIndex: FLEET.length,
        phase: "playerTurn",
        message: "Your fleet is ready. Fire at the enemy waters.",
      };
    }

    case "placeShip": {
      if (state.phase !== "placement") return state;
      const definition = FLEET[state.placementShipIndex];
      if (!definition) return state;
      if (
        !canPlace(
          state.playerBoard,
          definition,
          action.origin,
          state.placementOrientation,
        )
      ) {
        return state;
      }

      const playerBoard = placeShip(
        state.playerBoard,
        definition,
        action.origin,
        state.placementOrientation,
      );
      const nextIndex = state.placementShipIndex + 1;
      const done = nextIndex >= FLEET.length;

      return {
        ...state,
        playerBoard,
        placementShipIndex: nextIndex,
        phase: done ? "playerTurn" : "placement",
        message: done
          ? "Your fleet is ready. Fire at the enemy waters."
          : `${definition.name} placed. Now place your ${FLEET[nextIndex].name}.`,
      };
    }

    case "playerFire": {
      // The phase check, not the disabled cell, is what makes double firing
      // impossible.
      if (state.phase !== "playerTurn") return state;

      const outcome = attack(state.computerBoard, action.coord);
      if (!outcome.accepted) return state;

      const sunkShipName = outcome.sunkShip?.name;
      const log = appendLog(state.log, {
        attacker: "player",
        coord: action.coord,
        result: outcome.result,
        sunkShipName,
      });

      if (outcome.allSunk) {
        return {
          ...state,
          computerBoard: outcome.board,
          phase: "gameOver",
          winner: "player",
          log,
          message: "You sank the entire enemy fleet. Victory!",
        };
      }

      return {
        ...state,
        computerBoard: outcome.board,
        phase: "computerTurn",
        log,
        message: describe("player", action.coord, outcome.result, sunkShipName),
      };
    }

    case "computerFire": {
      if (state.phase !== "computerTurn") return state;

      const coord = nextShot(state.playerBoard.shots, state.aiMemory);
      if (!coord) return { ...state, phase: "playerTurn" };

      const outcome = attack(state.playerBoard, coord);
      if (!outcome.accepted) return { ...state, phase: "playerTurn" };

      const aiMemory = registerResult(
        state.aiMemory,
        coord,
        outcome.result,
        outcome.sunkShip?.cells ?? null,
      );
      const sunkShipName = outcome.sunkShip?.name;
      const log = appendLog(state.log, {
        attacker: "computer",
        coord,
        result: outcome.result,
        sunkShipName,
      });

      if (outcome.allSunk) {
        return {
          ...state,
          playerBoard: outcome.board,
          aiMemory,
          phase: "gameOver",
          winner: "computer",
          log,
          message: "Your fleet has been destroyed. The computer wins.",
        };
      }

      return {
        ...state,
        playerBoard: outcome.board,
        aiMemory,
        phase: "playerTurn",
        log,
        message: describe("computer", coord, outcome.result, sunkShipName),
      };
    }

    default:
      return state;
  }
}

export type { Orientation };
