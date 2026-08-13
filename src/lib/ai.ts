import { coordKey, isOnBoard, sameCoord } from "./board";
import { BOARD_SIZE, type AiMemory, type Coord, type Shot } from "./types";

export function createAiMemory(): AiMemory {
  return { activeHits: [] };
}

/**
 * Whether the computer is chasing a wounded ship rather than searching. It is
 * derived from the notes rather than stored alongside them, so the label and
 * the behaviour cannot drift apart.
 */
export function isTargeting(memory: AiMemory): boolean {
  return memory.activeHits.length > 0;
}

function neighbours(coord: Coord): Coord[] {
  return [
    { row: coord.row - 1, col: coord.col },
    { row: coord.row + 1, col: coord.col },
    { row: coord.row, col: coord.col - 1 },
    { row: coord.row, col: coord.col + 1 },
  ];
}

/** Removes repeats, so a square bordering two hits is not twice as likely. */
function unique(coords: Coord[]): Coord[] {
  const seen = new Set<string>();
  return coords.filter((coord) => {
    const key = coordKey(coord);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

const AXES = [
  { row: 0, col: 1 },
  { row: 1, col: 0 },
] as const;

/**
 * The squares just beyond each end of an unbroken run of hits through `seed`.
 *
 * The run is measured one axis at a time rather than by asking whether *every*
 * hit shares a row or a column: a hit on a ship alongside the one being chased
 * then no longer hides the line. If both axes hold a run, both are offered.
 */
function lineEnds(hits: Coord[], seed: Coord): Coord[] {
  const isHit = (coord: Coord) => hits.some((hit) => sameCoord(hit, coord));
  const ends: Coord[] = [];

  for (const axis of AXES) {
    const reach = (sign: number) => {
      let steps = 1;
      const at = (count: number) => ({
        row: seed.row + axis.row * sign * count,
        col: seed.col + axis.col * sign * count,
      });
      while (isHit(at(steps))) steps += 1;
      return { run: steps - 1, end: at(steps) };
    };

    const forward = reach(1);
    const backward = reach(-1);
    if (forward.run + backward.run > 0) {
      ends.push(forward.end, backward.end);
    }
  }

  return unique(ends);
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

  // Target mode: extend along a known line first, then probe around the ship
  // currently being chased, and only then around any other wounded ship.
  if (isTargeting(memory)) {
    const cluster = activeCluster(memory.activeHits);

    const ends = lineEnds(cluster, cluster[0]).filter(available);
    if (ends.length > 0) return pick(ends, random);

    const nearCluster = unique(cluster.flatMap(neighbours)).filter(available);
    if (nearCluster.length > 0) return pick(nearCluster, random);

    const nearAny = unique(memory.activeHits.flatMap(neighbours)).filter(
      available,
    );
    if (nearAny.length > 0) return pick(nearAny, random);
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

  return { activeHits };
}
