"use client";

import { coordLabel } from "@/lib/board";
import type { LogEntry } from "@/lib/types";

export function MoveLog({ entries }: { entries: LogEntry[] }) {
  const recent = [...entries].reverse().slice(0, 12);

  return (
    <div className="rounded-xl bg-slate-900/60 p-3 ring-1 ring-slate-700/60">
      <h3 className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
        Battle log
      </h3>
      {recent.length === 0 ? (
        <p className="text-xs text-slate-500">No shots fired yet.</p>
      ) : (
        <ol className="space-y-1 text-xs">
          {recent.map((entry) => (
            <li key={entry.id} className="flex items-baseline gap-2">
              <span
                className={
                  entry.attacker === "player"
                    ? "w-14 shrink-0 text-cyan-300"
                    : "w-14 shrink-0 text-orange-300"
                }
              >
                {entry.attacker === "player" ? "You" : "Computer"}
              </span>
              <span className="font-mono text-slate-300">
                {coordLabel(entry.coord)}
              </span>
              <span
                className={
                  entry.result === "hit" ? "text-amber-400" : "text-slate-500"
                }
              >
                {entry.sunkShipName
                  ? `sank the ${entry.sunkShipName}`
                  : entry.result}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
