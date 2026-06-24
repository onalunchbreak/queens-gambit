"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { CapturedPiece } from "./useChessGame";

const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif';

const GLYPH: Record<string, string> = {
  p: "\u265F",
  n: "\u265E",
  b: "\u265D",
  r: "\u265C",
  q: "\u265B",
  k: "\u265A",
};

// Piece values for the material balance display.
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

interface CapturedTrayProps {
  // The side whose captures are shown (captures BY this side = opponent pieces captured).
  capturedBy: "w" | "b";
  captured: CapturedPiece[];
  label: string;
  align: "left" | "right";
}

export function CapturedTray({ capturedBy, captured, label, align }: CapturedTrayProps) {
  // Pieces this side has captured are the opponent's color.
  const trayColor = capturedBy === "w" ? "b" : "w";

  const items = useMemo(() => {
    return captured
      .filter((c) => c.capturedBy === capturedBy)
      .sort((a, b) => (VALUE[a.type] ?? 0) - (VALUE[b.type] ?? 0));
  }, [captured, capturedBy]);

  // Material balance: sum of values captured by this side minus the other side.
  const myPoints = items.reduce((s, c) => s + (VALUE[c.type] ?? 0), 0);
  const otherPoints = captured
    .filter((c) => c.capturedBy !== capturedBy)
    .reduce((s, c) => s + (VALUE[c.type] ?? 0), 0);
  const diff = myPoints - otherPoints;

  return (
    <div
      className={
        "flex items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-1.5 min-h-[34px] " +
        (align === "right" ? "flex-row-reverse" : "flex-row")
      }
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
        {label}
      </span>
      <div className={"flex flex-wrap items-center gap-0.5 min-h-[20px] " + (align === "right" ? "flex-row-reverse" : "")}>
        <AnimatePresence mode="popLayout">
          {items.length === 0 ? (
            <span key="empty" className="text-[11px] text-muted-foreground/50 italic">
              —
            </span>
          ) : (
            items.map((c, idx) => (
              <motion.span
                key={c.id}
                layout
                initial={{
                  opacity: 0,
                  scale: 0.4,
                  rotateY: -90,
                  y: capturedBy === "w" ? -16 : 16,
                  x: align === "right" ? 24 : -24,
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotateY: 0,
                  y: 0,
                  x: 0,
                }}
                exit={{ opacity: 0, scale: 0.4 }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 18,
                  delay: 0,
                }}
                className="inline-flex"
                style={{
                  fontFamily: FONT_STACK,
                  fontSize: 18,
                  lineHeight: 1,
                  color: trayColor === "w" ? "var(--piece-ivory)" : "var(--piece-ebony)",
                  WebkitTextStroke:
                    trayColor === "w"
                      ? "0.8px var(--piece-ivory-stroke)"
                      : "0.5px var(--piece-ebony-stroke)",
                  marginLeft: idx > 0 ? -6 : 0,
                  textShadow: "0 1px 1px rgba(0,0,0,0.2)",
                  transformStyle: "preserve-3d",
                }}
                title={`${trayColor === "w" ? "White" : "Black"} ${c.type}`}
              >
                {GLYPH[c.type]}
              </motion.span>
            ))
          )}
        </AnimatePresence>
      </div>
      {diff > 0 && (
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
          +{diff}
        </span>
      )}
    </div>
  );
}

// Fly-off overlay: renders the just-captured piece animating off the board.
// Positioned absolutely over the board area; the piece flies toward its tray.
export function CaptureFlyOff({
  capture,
  boardRect,
  orientation,
}: {
  capture: CapturedPiece | null;
  boardRect: { width: number; height: number } | null;
  orientation: "w" | "b";
}) {
  // We render a flying piece glyph that starts at its origin square's center
  // and flies off to the side where the capturing side's tray sits.
  if (!capture || !boardRect) return null;

  const FILES = "abcdefgh";
  const fileIdx = capture.fromSquare.charCodeAt(0) - 97;
  const rank = parseInt(capture.fromSquare[1], 10);
  // grid coords (0..7), respecting orientation
  const flipped = orientation === "b";
  const c = flipped ? 7 - fileIdx : fileIdx;
  const r = flipped ? rank - 1 : 8 - rank;
  const startX = (c + 0.5) * (boardRect.width / 8);
  const startY = (r + 0.5) * (boardRect.height / 8);

  // The capturing side's tray: white captures fly to top, black captures to bottom
  // (or we can fly toward left/right). Fly to the nearest vertical edge.
  const flyToTop = capture.capturedBy === "w";
  const endY = flyToTop ? -boardRect.height * 0.25 : boardRect.height * 0.25;
  // Slight horizontal drift toward the player's tray side.
  const endX = startX + (capture.capturedBy === "w" ? -boardRect.width * 0.1 : boardRect.width * 0.1);

  const glyph = GLYPH[capture.type] ?? "?";
  const isWhitePiece = capture.color === "w";

  return (
    <AnimatePresence>
      <motion.div
        key={capture.id}
        className="pointer-events-none absolute z-40"
        style={{
          left: 0,
          top: 0,
          width: boardRect.width / 8,
          height: boardRect.height / 8,
          fontFamily: FONT_STACK,
          fontSize: (boardRect.width / 8) * 0.76,
          lineHeight: 1,
          color: isWhitePiece ? "var(--piece-ivory)" : "var(--piece-ebony)",
          WebkitTextStroke: isWhitePiece
            ? "1px var(--piece-ivory-stroke)"
            : "0.7px var(--piece-ebony-stroke)",
          transformStyle: "preserve-3d",
        }}
        initial={{
          x: startX - (boardRect.width / 8) / 2,
          y: startY - (boardRect.height / 8) / 2,
          opacity: 1,
          scale: 1,
          rotateZ: 0,
          rotateY: 0,
        }}
        animate={{
          x: endX - (boardRect.width / 8) / 2,
          y: endY - (boardRect.height / 8) / 2,
          opacity: [1, 1, 0],
          scale: [1, 1.15, 0.7],
          rotateZ: flyToTop ? -25 : 25,
          rotateY: 360,
        }}
        transition={{
          duration: 0.85,
          ease: [0.4, 0.0, 0.2, 1],
          times: [0, 0.5, 1],
        }}
      >
        <span style={{ display: "inline-block", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}>
          {glyph}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
