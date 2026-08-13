import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GameOverBanner } from "./GameOverBanner";

describe("GameOverBanner", () => {
  it("announces a player victory", () => {
    render(
      <GameOverBanner winner="player" shotsFired={31} onNewGame={() => {}} />,
    );
    expect(screen.getByTestId("game-over")).toHaveTextContent(/victory/i);
    expect(screen.getByTestId("game-over")).toHaveTextContent(/31 shots/);
  });

  it("announces a defeat", () => {
    render(
      <GameOverBanner winner="computer" shotsFired={44} onNewGame={() => {}} />,
    );
    expect(screen.getByTestId("game-over")).toHaveTextContent(/defeat/i);
  });

  it("restarts from the banner", async () => {
    const onNewGame = vi.fn();
    const user = userEvent.setup();
    render(
      <GameOverBanner winner="player" shotsFired={0} onNewGame={onNewGame} />,
    );
    await user.click(screen.getByRole("button", { name: /new game/i }));
    expect(onNewGame).toHaveBeenCalledOnce();
  });
});
