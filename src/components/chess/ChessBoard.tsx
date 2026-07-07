"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { ChessPiece } from "./ChessPiece";
import { PieceInstance } from "./useChessGame";
import { AnnotationKind } from "@/lib/chess/types";

const FILES = "abcdefgh";

function squareToGrid(sq: string, flipped: boolean): { c: number; r: number } {
  const c = sq.charCodeAt(0) - 97;
  const r = 8 - parseInt(sq[1], 10);
  if (!flipped) return { c, r };
  return { c: 7 - c, r: 7 - r };
}

interface BoardProps {
  pieces: PieceInstance[];
  lastMove: { from: string; to: string } | null;
  selected: string | null;
  legalTargets: { square: string; isCapture: boolean }[];
  heatmap: number[];
  showHeatmap: boolean;
  turn: "w" | "b";
  inCheck: boolean;
  checkSquare: string | null;
  onSquareClick: (sq: string) => void;
  moveNonce: number;
  // Review overlay
  reviewActive: boolean;
  reviewMarker?: { square: string; kind: AnnotationKind } | null;
  reviewArrow?: { from: string; to: string; kind: AnnotationKind } | null;
  interactive?: boolean;
  animateMoves?: boolean;
  orientation?: "w" | "b"; // which side sits at the bottom (player's color)
}

export function ChessBoard({
  pieces,
  lastMove,
  selected,
  legalTargets,
  heatmap,
  showHeatmap,
  turn,
  inCheck,
  checkSquare,
  onSquareClick,
  moveNonce,
  reviewActive,
  reviewMarker,
  reviewArrow,
  interactive = true,
  animateMoves = true,
  orientation = "w",
}: BoardProps) {
  const flipped = orientation === "b";
  // Build a map of square -> piece for rendering.
  const pieceMap = useMemo(() => {
    const m = new Map<string, PieceInstance>();
    for (const p of pieces) m.set(p.square, p);
    return m;
  }, [pieces]);

  const moverId = lastMove
    ? pieceMap.get(lastMove.to)?.id ?? null
    : null;

  // Precompute heatmap cell colors using theme-aware rgba channels.
  const heatmapCells = useMemo(() => {
    const warm = "var(--heat-warm)";
    const cool = "var(--heat-cool)";
    return heatmap.map((v) => {
      const intensity = Math.min(1, Math.abs(v));
      if (v > 0.02) {
        return `rgba(${warm}, ${0.12 + intensity * 0.55})`;
      }
      if (v < -0.02) {
        return `rgba(${cool}, ${0.12 + intensity * 0.55})`;
      }
      return "rgba(0,0,0,0)";
    });
  }, [heatmap]);

  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
      {/* Mahogany frame */}
      <div
        className="absolute -inset-[2.2%] rounded-[10px] shadow-2xl"
        style={{
          background:
            "linear-gradient(135deg, var(--frame-grad-1) 0%, var(--frame-grad-2) 45%, var(--frame-grad-3) 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 0 1px rgba(0,0,0,0.6), 0 18px 40px rgba(0,0,0,0.45)",
        }}
      />
      <div className="absolute inset-0 rounded-[4px] overflow-hidden">
        {/* Squares layer */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
          {Array.from({ length: 64 }).map((_, i) => {
            const r = Math.floor(i / 8);
            const c = i % 8;
            const isLight = (r + c) % 2 === 0;
            // Map grid cell to actual chess square, accounting for orientation.
            const fileIdx = flipped ? 7 - c : c;
            const rankIdx = flipped ? r + 1 : 8 - r;
            const square = `${FILES[fileIdx]}${rankIdx}`;
            const isLastMove =
              lastMove && (square === lastMove.from || square === lastMove.to);
            const isSelected = selected === square;
            const target = legalTargets.find((t) => t.square === square);
            const isCheck = inCheck && checkSquare === square;
            const isReviewMark =
              reviewActive && reviewMarker && reviewMarker.square === square;

            const base = isLight
              ? "linear-gradient(135deg, var(--maple) 0%, var(--maple-deep) 100%)"
              : "linear-gradient(135deg, var(--walnut) 0%, var(--walnut-deep) 100%)";
            const grain = isLight
              ? "repeating-linear-gradient(90deg, rgba(120,80,30,0.05) 0 1px, rgba(255,250,235,0) 1px 5px)"
              : "repeating-linear-gradient(90deg, rgba(20,10,0,0.12) 0 1px, rgba(255,250,235,0) 1px 5px)";

            return (
              <button
                key={square}
                type="button"
                aria-label={square}
                onClick={() => onSquareClick(square)}
                className="relative"
                style={{
                  background: `${grain}, ${base}`,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)",
                }}
              >
                {/* last move pulsing highlight */}
                {isLastMove && (
                  <motion.span
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "rgba(var(--last-move), 0.42)" }}
                    animate={{ opacity: [0.55, 0.85, 0.55] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                {/* selected highlight */}
                {isSelected && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: "rgba(var(--last-move), 0.6)", boxShadow: "inset 0 0 0 3px rgba(var(--last-move), 0.85)" }}
                  />
                )}
                {/* check highlight */}
                {isCheck && (
                  <motion.span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 50%, rgba(var(--check), 0.85), rgba(var(--check), 0) 70%)",
                    }}
                    animate={{ opacity: [0.5, 0.9, 0.5] }}
                    transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                {/* coordinate labels (file on bottom row, rank on left col) */}
                {r === 7 && (
                  <span
                    className="absolute bottom-0.5 right-1 text-[9px] sm:text-xs font-semibold pointer-events-none"
                    style={{
                      color: isLight ? "var(--walnut-deep)" : "var(--maple)",
                      opacity: 0.85,
                    }}
                  >
                    {FILES[fileIdx]}
                  </span>
                )}
                {c === 0 && (
                  <span
                    className="absolute top-0.5 left-1 text-[9px] sm:text-xs font-semibold pointer-events-none"
                    style={{
                      color: isLight ? "var(--walnut-deep)" : "var(--maple)",
                      opacity: 0.85,
                    }}
                  >
                    {rankIdx}
                  </span>
                )}
                {/* legal move dot / ghost capture ring */}
                {target && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {target.isCapture ? (
                      <span
                        className="block rounded-full"
                        style={{
                          width: "86%",
                          height: "86%",
                          border: "3px solid rgba(var(--legal-dot), 0.6)",
                          background: "rgba(var(--legal-ring), 0.2)",
                        }}
                      />
                    ) : (
                      <span
                        className="block rounded-full"
                        style={{
                          width: "30%",
                          height: "30%",
                          background: "rgba(var(--legal-dot), 0.55)",
                        }}
                      />
                    )}
                  </span>
                )}
                {/* review square marker */}
                {isReviewMark && reviewMarker && (
                  <span
                    className="absolute inset-0 pointer-events-none flex items-center justify-center"
                  >
                    <span
                      className="block rounded-full"
                      style={{
                        width: "78%",
                        height: "78%",
                        border: `3px solid ${markerColor(reviewMarker.kind)}`,
                        background: `${markerColor(reviewMarker.kind)}33`,
                        boxShadow: `0 0 12px ${markerColor(reviewMarker.kind)}aa`,
                      }}
                    />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Influence heatmap overlay */}
        <AnimatePresence>
          {showHeatmap && (
            <motion.div
              className="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              {heatmapCells.map((color, i) => (
                <div key={i} style={{ background: color }} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pieces layer (absolutely positioned, animated) */}
        <div className="absolute inset-0 pointer-events-none">
          {pieces.map((p) => {
            const { c, r } = squareToGrid(p.square, flipped);
            const isMover = animateMoves && moverId === p.id;
            return (
              <motion.div
                key={p.id}
                className="absolute"
                style={{
                  width: "12.5%",
                  height: "12.5%",
                  containerType: "size",
                }}
                initial={false}
                animate={{ left: `${c * 12.5}%`, top: `${r * 12.5}%` }}
                transition={{ type: "tween", duration: 0.42, ease: "easeInOut" }}
              >
                <ChessPiece
                  piece={p}
                  isMover={isMover}
                  moveNonce={moveNonce}
                  isSelected={selected === p.square}
                  isInteractive={interactive && p.color === "w" && turn === "w" && !reviewActive}
                  onClick={() => onSquareClick(p.square)}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Review arrows (SVG overlay) */}
        {reviewActive && reviewArrow && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 8 8" preserveAspectRatio="none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="3"
                markerHeight="3"
                refX="1.6"
                refY="1.5"
                orient="auto"
              >
                <polygon points="0,0 3,1.5 0,3" fill={markerColor(reviewArrow.kind)} />
              </marker>
            </defs>
            {(() => {
              const from = squareToGrid(reviewArrow.from, flipped);
              const to = squareToGrid(reviewArrow.to, flipped);
              const x1 = from.c + 0.5;
              const y1 = from.r + 0.5;
              const x2 = to.c + 0.5;
              const y2 = to.r + 0.5;
              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={markerColor(reviewArrow.kind)}
                  strokeWidth={0.16}
                  strokeLinecap="round"
                  markerEnd="url(#arrowhead)"
                  opacity={0.9}
                />
              );
            })()}
          </svg>
        )}
      </div>
    </div>
  );
}

function markerColor(kind: AnnotationKind): string {
  switch (kind) {
    case "brilliant":
      return "#1caa6b"; // emerald
    case "best":
      return "#2a8fd4"; // azure
    case "good":
      return "#7d8a99"; // slate
    case "inaccuracy":
      return "#e0b13a"; // amber
    case "mistake":
      return "#e8833a"; // orange
    case "blunder":
      return "#d23b3b"; // red
    case "book":
      return "#8a6d3b"; // brown
  }
}
