"use client";

import { Fragment } from "react";
import { Cell } from "./Cell";
import { COLUMN_LABELS, coordLabel } from "@/lib/board";
import { cellView, cellsMatch } from "@/lib/view";
import { BOARD_SIZE, type Board as BoardModel, type Coord } from "@/lib/types";

interface BoardProps {
  title: string;
  subtitle: string;
  board: BoardModel;
  revealShips: boolean;
  interactive: boolean;
  previewCells?: Coord[];
  previewValid?: boolean;
  onCellSelect?: (coord: Coord) => void;
  onCellHover?: (coord: Coord) => void;
  onLeave?: () => void;
}

export function Board({
  title,
  subtitle,
  board,
  revealShips,
  interactive,
  previewCells = [],
  previewValid = true,
  onCellSelect,
  onCellHover,
  onLeave,
}: BoardProps) {
  const rows = Array.from({ length: BOARD_SIZE }, (_, index) => index);

  return (
    <section className="flex flex-col gap-2">
      <header>
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
          {title}
        </h2>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </header>

      <div
        className="rounded-xl bg-slate-900/60 p-2 ring-1 ring-slate-700/60"
        onMouseLeave={onLeave}
      >
        <div
          className="grid gap-[2px]"
          style={{
            gridTemplateColumns: `1.25rem repeat(${BOARD_SIZE}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {COLUMN_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[0.6rem] font-medium text-slate-400"
            >
              {label}
            </div>
          ))}

          {rows.map((row) => (
            <Fragment key={row}>
              <div className="flex items-center justify-center text-[0.6rem] font-medium text-slate-400">
                {row + 1}
              </div>
              {rows.map((col) => {
                const coord = { row, col };
                const isPreview = cellsMatch(previewCells, coord);
                return (
                  <Cell
                    key={`${row}-${col}`}
                    label={coordLabel(coord)}
                    view={
                      isPreview && previewValid
                        ? "preview"
                        : cellView(board, coord, revealShips)
                    }
                    invalidPreview={isPreview && !previewValid}
                    interactive={interactive}
                    onSelect={() => onCellSelect?.(coord)}
                    onHover={() => onCellHover?.(coord)}
                  />
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
