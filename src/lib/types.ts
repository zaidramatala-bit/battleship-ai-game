export const BOARD_SIZE = 10;

export type ShipId =
  | "carrier"
  | "battleship"
  | "cruiser"
  | "submarine"
  | "destroyer";

export type Orientation = "horizontal" | "vertical";

/**
 * A square on the board. Row and column are zero-indexed and always named, so
 * they cannot be passed to a function in the wrong order.
 */
export interface Coord {
  row: number;
  col: number;
}

export interface ShipDefinition {
  id: ShipId;
  name: string;
  length: number;
}

export interface Ship {
  id: ShipId;
  name: string;
  length: number;
  cells: Coord[];
  hits: Coord[];
}

export type ShotResult = "hit" | "miss";

export interface Shot {
  coord: Coord;
  result: ShotResult;
}

/**
 * Ships and shots are stored side by side rather than merged into one grid:
 * "already fired here" and "this ship is sunk" then remain independent
 * questions, each answered by looking at exactly one of the two.
 */
export interface Board {
  ships: Ship[];
  shots: Shot[];
}

export type Player = "player" | "computer";

export type Phase = "placement" | "playerTurn" | "computerTurn" | "gameOver";

/**
 * The computer's private notes. It is deliberately never given the defender's
 * ship positions, only what it could work out from its own shots.
 */
export interface AiMemory {
  /** Hits belonging to a ship that has not sunk yet. */
  activeHits: Coord[];
}

export interface LogEntry {
  id: number;
  attacker: Player;
  coord: Coord;
  result: ShotResult;
  sunkShipName?: string;
}

export interface GameState {
  phase: Phase;
  playerBoard: Board;
  computerBoard: Board;
  aiMemory: AiMemory;
  winner: Player | null;
  log: LogEntry[];
  message: string;
  /** Ship being positioned during the placement phase. */
  placementShipIndex: number;
  placementOrientation: Orientation;
}
