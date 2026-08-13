import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { Game } from "./Game";
import { COMPUTER_DELAY_MS } from "@/hooks/useGame";
import { FLEET } from "@/lib/ships";

/**
 * Both fleets are pinned to a known layout so a whole game can be played
 * through the interface: every square the player clicks is a hit, so the game
 * is won in seventeen shots instead of a hundred.
 */
vi.mock("@/lib/board", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/board")>("@/lib/board");
  return {
    ...actual,
    randomBoard: () =>
      FLEET.reduce(
        (board, definition, index) =>
          actual.placeShip(board, definition, { row: index, col: 0 }, "horizontal"),
        actual.createEmptyBoard(),
      ),
  };
});

/** The squares of the pinned fleet, in the order the player will fire at them. */
const TARGETS = FLEET.flatMap((definition, row) =>
  Array.from(
    { length: definition.length },
    (_, col) => `${"ABCDEFGHIJ"[col]}${row + 1}`,
  ),
);

function enemyCell(label: string) {
  const board = screen
    .getByRole("heading", { name: /enemy waters/i })
    .closest("section")!;
  return within(board).getByRole("button", {
    name: new RegExp(`^${label} `),
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("playing a game through to a win", () => {
  it("shows the victory banner, reveals the enemy fleet and locks the board", async () => {
    // Clicks are dispatched directly rather than through user-event, which
    // waits on real timers and would make this a twelve-second test.
    vi.useFakeTimers();
    render(<Game />);

    fireEvent.click(screen.getByRole("button", { name: /randomise fleet/i }));

    for (const label of TARGETS) {
      fireEvent.click(enemyCell(label));
      expect(enemyCell(label).getAttribute("data-view")).toMatch(/hit|sunk/);
      // Let the computer reply, except after the shot that ends the game.
      await act(async () => {
        vi.advanceTimersByTime(COMPUTER_DELAY_MS);
      });
    }

    const banner = screen.getByTestId("game-over");
    expect(banner).toHaveTextContent(/victory/i);
    expect(banner).toHaveTextContent(`${TARGETS.length} shots fired`);
    expect(screen.getByTestId("phase")).toHaveTextContent(/game over/i);

    // Every enemy ship square is now shown as sunk, and the squares that were
    // never fired at are revealed as water rather than staying hidden.
    for (const label of TARGETS) {
      expect(enemyCell(label).getAttribute("data-view")).toBe("sunk");
    }
    expect(enemyCell("J10").getAttribute("data-view")).toBe("water");

    // The board no longer accepts shots.
    expect(enemyCell("J10")).toBeDisabled();

    // The enemy fleet panel, which hides damage during play, now reports every
    // ship sunk.
    const enemyFleet = screen
      .getByRole("heading", { name: /enemy fleet/i })
      .closest("div")!;
    const entries = within(enemyFleet).getAllByRole("listitem");
    expect(entries).toHaveLength(FLEET.length);
    for (const entry of entries) {
      expect(entry.dataset.sunk).toBe("true");
    }
    // Seventeen shots, each re-rendering two hundred squares, is slow enough
    // under coverage instrumentation to need more than the default budget.
  }, 30_000);
});
