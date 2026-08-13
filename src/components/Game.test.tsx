import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Game } from "./Game";
import { COMPUTER_DELAY_MS } from "@/hooks/useGame";

const settle = (ms: number) => new Promise((done) => setTimeout(done, ms));

function boards() {
  const yours = screen.getByRole("heading", { name: /your waters/i })
    .closest("section")!;
  const enemy = screen.getByRole("heading", { name: /enemy waters/i })
    .closest("section")!;
  return { yours, enemy };
}

function enemyCell(label: string) {
  return within(boards().enemy).getByRole("button", {
    name: new RegExp(`^${label} `),
  });
}

const firedViews = ["hit", "miss", "sunk"];

async function startGame(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /randomise fleet/i }));
}

describe("Game", () => {
  it("starts in the placement phase", () => {
    render(<Game />);
    expect(screen.getByTestId("phase")).toHaveTextContent(/deploy your fleet/i);
    expect(enemyCell("A1")).toBeDisabled();
  });

  it("randomising the fleet starts play and enables the enemy board", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user);
    expect(screen.getByTestId("phase")).toHaveTextContent(/your turn/i);
    expect(enemyCell("A1")).toBeEnabled();
  });

  it("places a ship manually and shows it on the player's board", async () => {
    const user = userEvent.setup();
    render(<Game />);
    const own = within(boards().yours).getByRole("button", { name: /^A1 / });
    await user.click(own);
    expect(
      within(boards().yours).getByRole("button", { name: /^A1 ship/ }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("message")).toHaveTextContent(/Carrier placed/i);
  });

  it("previews a rotated ship and places it vertically", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await user.click(screen.getByRole("button", { name: /rotate/i }));

    const own = (label: string) =>
      within(boards().yours).getByRole("button", {
        name: new RegExp(`^${label} `),
      });

    await user.hover(own("C3"));
    for (const label of ["C3", "C4", "C5", "C6", "C7"]) {
      expect(own(label).getAttribute("data-view")).toBe("preview");
    }

    await user.click(own("C3"));
    // The pointer is still over C3, where the next ship's preview now sits;
    // move it away to see the placed ship itself.
    await user.unhover(own("C3"));
    for (const label of ["C3", "C4", "C5", "C6", "C7"]) {
      expect(own(label).getAttribute("data-view")).toBe("ship");
    }
  });

  it("shows an invalid preview where the ship would not fit", async () => {
    const user = userEvent.setup();
    render(<Game />);
    const own = (label: string) =>
      within(boards().yours).getByRole("button", {
        name: new RegExp(`^${label} `),
      });

    // Carrier is 5 long and horizontal: starting at H1 runs off the board.
    await user.hover(own("H1"));
    expect(own("H1").getAttribute("data-view")).toBe("invalid");

    // Clicking an illegal square places nothing.
    await user.click(own("H1"));
    expect(screen.getByTestId("phase")).toHaveTextContent(/deploy your fleet/i);
    expect(
      within(boards().yours).queryAllByRole("button", { name: /ship$/ }),
    ).toHaveLength(0);
  });

  it("places the whole fleet by hand, then starts play; Clear undoes it", async () => {
    const user = userEvent.setup();
    render(<Game />);
    const own = (label: string) =>
      within(boards().yours).getByRole("button", {
        name: new RegExp(`^${label} `),
      });

    // One ship per row, all horizontal from column A.
    for (const label of ["A1", "A3", "A5", "A7", "A9"]) {
      await user.click(own(label));
    }

    expect(screen.getByTestId("phase")).toHaveTextContent(/your turn/i);
    expect(
      within(boards().yours).getAllByRole("button", { name: /ship$/ }),
    ).toHaveLength(5 + 4 + 3 + 3 + 2);

    await user.click(screen.getAllByRole("button", { name: /^new game$/i })[0]);
    await user.click(own("A1"));
    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(
      within(boards().yours).queryAllByRole("button", { name: /ship$/ }),
    ).toHaveLength(0);
  });

  it("marks a fired cell and disables it", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user);

    const target = enemyCell("A1");
    await user.click(target);

    const after = enemyCell("A1");
    expect(after).toBeDisabled();
    expect(after.getAttribute("data-view")).not.toBe("water");
  });

  it("ignores extra clicks while the computer is taking its turn", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user);

    await user.click(enemyCell("A1"));
    expect(screen.getByTestId("phase")).toHaveTextContent(/computer/i);

    await user.click(enemyCell("B1"));
    expect(enemyCell("B1").getAttribute("data-view")).toBe("water");
  });

  it("lets the computer reply after its delay, then hands the turn back", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user);
    await user.click(enemyCell("A1"));

    await waitFor(
      () => expect(screen.getByTestId("phase")).toHaveTextContent(/your turn/i),
      { timeout: COMPUTER_DELAY_MS * 4 },
    );

    const ownShots = within(boards().yours)
      .getAllByRole("button")
      .filter((cell) => firedViews.includes(cell.getAttribute("data-view")!));
    expect(ownShots).toHaveLength(1);
  });

  it("does not let a pending computer shot land in a new game", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user);
    await user.click(enemyCell("A1"));
    expect(screen.getByTestId("phase")).toHaveTextContent(/computer/i);

    // Restart while the computer's move is still pending.
    await user.click(screen.getAllByRole("button", { name: /^new game$/i })[0]);
    await settle(COMPUTER_DELAY_MS * 2);

    expect(screen.getByTestId("phase")).toHaveTextContent(/deploy your fleet/i);
    const ownShots = within(boards().yours)
      .getAllByRole("button")
      .filter((cell) => firedViews.includes(cell.getAttribute("data-view")!));
    expect(ownShots).toHaveLength(0);
  });

  it("does not reveal which enemy ship a hit belongs to", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user);

    // Fire across a whole row; at least one square is bound to be a ship.
    for (const label of ["A5", "B5", "C5", "D5", "E5"]) {
      const cell = enemyCell(label);
      if (!cell.hasAttribute("disabled")) await user.click(cell);
      await waitFor(
        () =>
          expect(screen.getByTestId("phase")).toHaveTextContent(/your turn/i),
        { timeout: COMPUTER_DELAY_MS * 4 },
      );
    }

    const enemyPanel = screen
      .getByText(/enemy fleet/i)
      .closest("div") as HTMLElement;
    const damaged = within(enemyPanel)
      .getAllByRole("listitem")
      .filter((item) => item.dataset.sunk === "false")
      .flatMap((item) => Array.from(item.querySelectorAll("span span")))
      .filter((pip) => pip.className.includes("amber"));
    expect(damaged).toHaveLength(0);
  });

  it("new game clears the board and the log", async () => {
    const user = userEvent.setup();
    render(<Game />);
    await startGame(user);
    await user.click(enemyCell("A1"));

    await user.click(screen.getAllByRole("button", { name: /^new game$/i })[0]);

    expect(screen.getByTestId("phase")).toHaveTextContent(/deploy your fleet/i);
    expect(enemyCell("A1").getAttribute("data-view")).toBe("water");
    expect(screen.getByText(/no shots fired yet/i)).toBeInTheDocument();
  });
});
