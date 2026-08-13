"use client";

import { isSunk } from "@/lib/board";
import { FLEET } from "@/lib/ships";
import type { Board } from "@/lib/types";

interface FleetStatusProps {
  title: string;
  board: Board;
  /**
   * Per-ship damage is hidden for the enemy: a hit reveals which ship was
   * struck only once it sinks, as in the physical game.
   */
  revealDamage: boolean;
}

export function FleetStatus({ title, board, revealDamage }: FleetStatusProps) {
  return (
    <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/60">
      <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {FLEET.map((definition) => {
          const ship = board.ships.find((entry) => entry.id === definition.id);
          const sunk = ship ? isSunk(ship) : false;
          const hits = revealDamage ? (ship?.hits.length ?? 0) : 0;
          return (
            <li
              key={definition.id}
              data-ship={definition.id}
              data-sunk={sunk}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span
                className={
                  sunk ? "text-rose-400 line-through" : "text-slate-200"
                }
              >
                {definition.name}
              </span>
              <span className="flex gap-[2px]">
                {Array.from({ length: definition.length }, (_, index) => (
                  <span
                    key={index}
                    className={`h-2 w-2 rounded-[2px] ${
                      sunk
                        ? "bg-rose-600"
                        : index < hits
                          ? "bg-amber-500"
                          : "bg-slate-600"
                    }`}
                  />
                ))}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
