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
npm test              # unit + component tests (Vitest)
npm run test:coverage # the same, with a coverage report
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
* The line is tracked from the **most recent hit outwards**, one axis at a time,
  so hits on a second ship alongside cannot hide the line it is following.
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
* `src/lib/view.test.ts` — what each square looks like, including enemy ships
  staying hidden until they are hit or the game ends.
* `src/components/Game.test.tsx` — the real UI: placement, rotation, invalid
  previews, `Clear`, firing, the 700ms computer pause, restarting mid-pause.
* `src/components/GameOverBanner.test.tsx` — victory and defeat banners.
* `src/components/Game.endgame.test.tsx` — a whole game played click-by-click
  through the real UI to victory: the banner appears, the enemy fleet is
  revealed, and the board locks.
* CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests and build.

86 tests. Every file under `src/lib`, `src/hooks` and `src/components` is at
100% line coverage; overall `src` sits at ~95% because `layout.tsx`, `page.tsx`
and `error.tsx` only mount or wrap the app. Visual styling is deliberately not
asserted — it was checked by playing the game in a browser.

## Bug log

Real problems hit while building this, and what fixed them.

| # | Problem | Cause | Fix |
| --- | --- | --- | --- |
| 1 | Test runner crashed with `Invalid PostCSS Plugin found at: plugins[0]` | Vitest tried to load the Tailwind v4 PostCSS config, which it cannot process | Disabled PostCSS for the test environment only (`css.postcss.plugins: []` in `vitest.config.ts`); Next.js still uses the real config |
| 2 | Every test failed with `require() of ES Module … not supported` | `jsdom@27` shipped a CommonJS/ESM mismatch under the installed Vitest | Upgraded Vitest to 3.2.x and pinned `jsdom@^25` |
| 3 | Three UI tests timed out at 5s | `userEvent` and Vitest fake timers did not cooperate around the computer's delayed move | Dropped fake timers; tests now use real timers with `waitFor` |
| 4 | Scaffolding installed `next@15.5.4`, flagged as vulnerable | Default create-next-app version | Upgraded to `next@15.5.23` |
| 5 | **The enemy fleet panel lit up a damage pip on every hit**, revealing which ship you had struck before it sank | The same `FleetStatus` component was used for both fleets and always showed per-ship damage | Added a `revealDamage` prop; enemy damage is hidden until the ship sinks (or the game ends). Regression test: *"does not reveal which enemy ship a hit belongs to"* in `Game.test.tsx` |
| 6 | **The computer lost the scent when two ships sat side by side**: with hits forming an L (two along one ship, one on its neighbour) it abandoned the line and went back to poking randomly around every hit | The line check asked whether *all* remembered hits shared a row or column; an L never does | It now works outwards from the most recent hit along each axis separately, so a neighbouring ship's hit cannot hide the line. Regression test: *"keeps following the line when a neighbouring ship has also been hit"* in `ai.test.ts` |
| 7 | A square bordering two hits was picked about twice as often as the others (523 of 2,000 draws versus ~250) — and a corner between two hits is the *least* likely place for a ship | Candidate squares were collected per hit with no de-duplication, so a shared neighbour appeared in the list twice | Candidates are de-duplicated before the random pick. Regression test: *"does not favour a square merely because it borders two hits"* |
| 8 | Firing at an already-fired square returned `rejected` **and** `result: "miss"` — a phantom miss waiting for the first caller who forgot to check the flag | One result shape was used for both accepted and refused shots | `AttackOutcome` is now a union: a refused shot carries no `result` at all, so the compiler forces callers to check the flag first |
| 9 | The AI's notes carried a `mode: "hunt" \| "target"` field that three tests asserted on but the decision logic never read | Left over from an earlier design; the code really decides by asking whether it has any live hits | Field deleted; `isTargeting()` derives it from the live hits, so the tests now assert on the value the code actually uses |

Bug 5 was found by playing the game in a browser, not by the automated tests —
it was a rules/fairness bug, not a crash. Bugs 6–9 came out of a final
code-review pass; 6 and 7 were each reproduced with a failing test before being
fixed. Fixing 6 also made the computer slightly quicker to finish a game (52.2 →
51.2 average shots over 500 self-played games).

Coverage review also turned up an unused `selectShip` action in the reducer,
left over from an earlier design where you picked a ship from a list. It was
dead code with no way to reach it, so it was removed rather than tested.

Two defensive paths no longer rely on "it cannot happen" as their only cover:
random placement giving up after its bounded retries now has a test, and so does
the reducer handing the turn back if the AI ever has nowhere to fire. An
`app/error.tsx` boundary means an unexpected throw shows a "start a new game"
message instead of a blank page.

## Known limitations

* Ships are placed in a fixed order (Carrier first, Destroyer last) rather than
  letting you pick a ship from a list. `Clear` restarts placement.
* Nothing is saved: refreshing the page starts a new game.
