import { coordKey, isOnBoard, sameCoord } from "./board";
import { BOARD_SIZE, type AiMemory, type Coord, type Shot } from "./types";

export function createAiMemory(): AiMemory {
  return { mode: "hunt", activeHits: [] };
}

function neighbours(coord: Coord): Coord[] {
  return [
    { row: coord.row - 1, col: coord.col },
    { row: coord.row + 1, col: coord.col },
    { row: coord.row, col: coord.col - 1 },
    { row: coord.row, col: coord.col + 1 },
  ];
}

function pick(candidates: Coord[], random: () => number): Coord {
  return candidates[Math.floor(random() * candidates.length)];
}

/**
 * The hits orthogonally connected to the most recent one, i.e. the wounded
 * ship currently being chased. Hits on a neighbouring ship are left out.
 */
function activeCluster(hits: Coord[]): Coord[] {
  if (hits.length === 0) return [];

  const cluster = [hits[hits.length - 1]];
  let grew = true;
  while (grew) {
    grew = false;
    for (const hit of hits) {
      if (cluster.some((member) => sameCoord(member, hit))) continue;
      const touches = cluster.some((member) =>
        neighbours(member).some((cell) => sameCoord(cell, hit)),
      );
      if (touches) {
        cluster.push(hit);
        grew = true;
      }
    }
  }
  return cluster;
}

/**
 * Squares in line with two or more hits, just beyond each end of the line.
 * Returns an empty list when the hits do not share a row or a column.
 */
function lineEnds(hits: Coord[]): Coord[] {
  if (hits.length < 2) return [];

  const sameRow = hits.every((hit) => hit.row === hits[0].row);
  const sameCol = hits.every((hit) => hit.col === hits[0].col);

  if (sameRow) {
    const cols = hits.map((hit) => hit.col);
    return [
      { row: hits[0].row, col: Math.min(...cols) - 1 },
      { row: hits[0].row, col: Math.max(...cols) + 1 },
    ];
  }
  if (sameCol) {
    const rows = hits.map((hit) => hit.row);
    return [
      { row: Math.min(...rows) - 1, col: hits[0].col },
      { row: Math.max(...rows) + 1, col: hits[0].col },
    ];
  }
  return [];
}

/**
 * Hunting only considers every other square: the shortest ship covers two
 * squares, so it must touch at least one of them.
 */
function isParityCell(coord: Coord): boolean {
  return (coord.row + coord.col) % 2 === 0;
}

function allCoords(): Coord[] {
  const coords: Coord[] = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      coords.push({ row, col });
    }
  }
  return coords;
}

/**
 * Chooses the computer's next shot from only what a fair opponent could know:
 * its own past shots plus its notes. Ship positions are never passed in.
 */
export function nextShot(
  shots: Shot[],
  memory: AiMemory,
  random: () => number = Math.random,
): Coord | null {
  const fired = new Set(shots.map((shot) => coordKey(shot.coord)));
  const available = (coord: Coord) =>
    isOnBoard(coord) && !fired.has(coordKey(coord));

  // Target mode: extend along a known line first, then probe around the hits.
  if (memory.activeHits.length > 0) {
    const ends = lineEnds(activeCluster(memory.activeHits)).filter(available);
    if (ends.length > 0) return pick(ends, random);

    const adjacent = memory.activeHits.flatMap(neighbours).filter(available);
    if (adjacent.length > 0) return pick(adjacent, random);
  }

  // Hunt mode.
  const untouched = allCoords().filter(available);
  if (untouched.length === 0) return null;

  const parity = untouched.filter(isParityCell);
  return pick(parity.length > 0 ? parity : untouched, random);
}

/**
 * Updates the notes after a shot. When a ship sinks, only that ship's squares
 * are forgotten, so hits on an adjacent ship are still followed up.
 */
export function registerResult(
  memory: AiMemory,
  coord: Coord,
  result: "hit" | "miss",
  sunkShipCells: Coord[] | null,
): AiMemory {
  if (result === "miss") return memory;

  let activeHits = [...memory.activeHits, coord];
  if (sunkShipCells) {
    activeHits = activeHits.filter(
      (hit) => !sunkShipCells.some((cell) => sameCoord(cell, hit)),
    );
  }

  return {
    mode: activeHits.length > 0 ? "target" : "hunt",
    activeHits,
  };
}
