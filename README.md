# battleship-ai

Battleship game built with Devin for the Cognition interview exercise.

A browser-based Battleship game: one human player against a hunt-and-target
computer opponent. No accounts, no database, no backend — the whole game runs
in the browser and can be deployed as a static Next.js app.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts:

```bash
npm test         # unit + component tests (Vitest)
npm run lint
npm run typecheck
npm run build
```

## How to play

1. **Deploy your fleet.** Click a square on *Your waters* to drop the current
   ship; `Rotate` switches between horizontal and vertical, and the hover
   preview is green where the ship fits and red where it does not.
   `Randomise fleet` places all five ships for you.
2. **Fire.** Click a square on *Enemy waters*. Hits are amber, misses are dots,
   sunk ships turn red.
3. The computer replies after a short pause, then it is your turn again.
4. First side to sink all five enemy ships wins. `New game` restarts.

## How it is built

| Layer | What it does |
| --- | --- |
| `src/lib/types.ts`, `ships.ts` | Board size, coordinates, the five ships |
| `src/lib/board.ts` | Placement rules — one `canPlace` used by manual placement, the preview and random placement |
| `src/lib/attack.ts` | Firing: hit/miss, duplicate rejection, sunk and win detection |
| `src/lib/ai.ts` | Hunt-and-target opponent (a pure function; it is never given your ship positions) |
| `src/lib/game.ts` | The reducer: every legal state change for the whole game |
| `src/hooks/useGame.ts` | Holds the state and schedules the computer's delayed reply |
| `src/components/*` | Presentation only — boards, cells, fleet status, log, banners |

The important architectural decision is that **game rules are plain TypeScript
that knows nothing about React**. That is why the rules can be tested in
milliseconds, including a few hundred simulated games.

### The computer opponent

* **Hunt:** fires at random squares on a checkerboard pattern. The smallest ship
  is two long, so it cannot hide between checkerboard squares — this halves the
  search space.
* **Target:** after a hit, it queues the four neighbouring squares. Once it has
  two hits in a line it locks onto that direction and extends along it, trying
  the other end when it runs out.
* When a ship sinks, only *that* ship's hits are cleared from its notes, so a
  second ship next door is still chased down.

## Testing

* `src/lib/board.test.ts` — placement edges, overlaps, immutability, **1,000
  randomly generated fleets all asserted legal**.
* `src/lib/attack.test.ts` — hit/miss, repeat shots, sinking, winning.
* `src/lib/ai.test.ts` — hunt/target behaviour plus **300 self-played games**
  asserting no repeated or off-board shots, no crashes, and a sensible move
  count (a degraded AI still wins, so the move-count assertion is what catches
  it).
* `src/lib/game.test.ts` — turn sequencing, duplicate clicks, restart, win.
* `src/components/Game.test.tsx` — the real UI, including the 700ms computer
  pause and restarting mid-pause.
* CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build.

## Bug log

Real problems hit while building this, and what fixed them.

| # | Problem | Cause | Fix |
| --- | --- | --- | --- |
| 1 | Test runner crashed with `Invalid PostCSS Plugin found at: plugins[0]` | Vitest tried to load the Tailwind v4 PostCSS config, which it cannot process | Disabled PostCSS for the test environment only (`css.postcss.plugins: []` in `vitest.config.ts`); Next.js still uses the real config |
| 2 | Every test failed with `require() of ES Module … not supported` | `jsdom@27` shipped a CommonJS/ESM mismatch under the installed Vitest | Upgraded Vitest to 3.2.x and pinned `jsdom@^25` |
| 3 | Three UI tests timed out at 5s | `userEvent` and Vitest fake timers did not cooperate around the computer's delayed move | Dropped fake timers; tests now use real timers with `waitFor` |
| 4 | Scaffolding installed `next@15.5.4`, flagged as vulnerable | Default create-next-app version | Upgraded to `next@15.5.23` |
| 5 | **The enemy fleet panel lit up a damage pip on every hit**, revealing which ship you had struck before it sank | The same `FleetStatus` component was used for both fleets and always showed per-ship damage | Added a `revealDamage` prop; enemy damage is hidden until the ship sinks (or the game ends). Regression test: *"does not reveal which enemy ship a hit belongs to"* in `Game.test.tsx` |

Bug 5 was found by playing the game in a browser, not by the automated tests —
it was a rules/fairness bug, not a crash.

## Known limitations

* Ships are placed in a fixed order (Carrier first, Destroyer last) rather than
  letting you pick a ship from a list. `Clear` restarts placement.
* Nothing is saved: refreshing the page starts a new game.
