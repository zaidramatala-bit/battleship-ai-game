"use client";

/**
 * A safety net rather than an expected screen. Nothing in the game is meant to
 * throw, but laying out the fleet at random gives up after a bounded number of
 * attempts, and an unhandled error would otherwise leave a blank page.
 */
export default function GameError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold text-slate-100">
        The game could not be set up
      </h1>
      <p className="text-sm text-slate-400">
        Something went wrong while starting a new battle. Starting over should
        clear it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
      >
        Start a new game
      </button>
    </main>
  );
}
