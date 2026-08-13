import type { ShipDefinition } from "./types";

export const FLEET: readonly ShipDefinition[] = [
  { id: "carrier", name: "Carrier", length: 5 },
  { id: "battleship", name: "Battleship", length: 4 },
  { id: "cruiser", name: "Cruiser", length: 3 },
  { id: "submarine", name: "Submarine", length: 3 },
  { id: "destroyer", name: "Destroyer", length: 2 },
] as const;

export const TOTAL_SHIP_CELLS = FLEET.reduce(
  (total, ship) => total + ship.length,
  0,
);
