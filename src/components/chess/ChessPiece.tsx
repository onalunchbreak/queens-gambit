"use client";

import { motion } from "framer-motion";
import { PieceInstance } from "./useChessGame";

// Solid Unicode chess glyphs (Staunton style) used for BOTH colors.
const GLYPH: Record<string, string> = {
  k: "\u265A", // ♚
  q: "\u265B", // ♛
  r: "\u265C", // ♜
  b: "\u265D", // ♝
  n: "\u265E", // ♞
  p: "\u265F", // ♟
};

const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", "Arial Unicode MS", sans-serif';

interface ChessPieceProps {
  piece: PieceInstance;
  isMover: boolean;
  moveNonce: number;
  isSelected?: boolean;
  isInteractive?: boolean;
  onClick?: () => void;
}

export function ChessPiece({
  piece,
  isMover,
  moveNonce,
  isSelected,
  isInteractive,
  onClick,
}: ChessPieceProps) {
  const glyph = GLYPH[piece.type];
  const isWhite = piece.color === "w";

  const fill = isWhite ? "var(--piece-ivory)" : "var(--piece-ebony)";
  const stroke = isWhite ? "var(--piece-ivory-stroke)" : "var(--piece-ebony-stroke)";
  const strokeWidth = isWhite ? 1.1 : 0.7;

  const innerKey = isMover ? `${piece.id}-${moveNonce}` : piece.id;

  return (
    <motion.div
      onClick={onClick}
      className={`absolute inset-0 flex items-center justify-center select-none ${isInteractive ? "cursor-pointer" : "cursor-default"}`}
      style={{ pointerEvents: "none" }}
      initial={false}
      animate={{
        scale: isSelected ? 1.06 : 1,
        zIndex: isSelected ? 30 : 10,
      }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        key={innerKey}
        initial={false}
        animate={
          isMover
            ? {
                // Lift (relative to the piece's own height) -> glide -> drop bounce
                y: ["0%", "-18%", "-18%", "0%", "0%"],
                scale: [1, 1.12, 1.12, 0.96, 1],
                filter: [
                  "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
                  "drop-shadow(0 10px 7px rgba(0,0,0,.42))",
                  "drop-shadow(0 10px 7px rgba(0,0,0,.42))",
                  "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
                  "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
                ],
              }
            : {
                y: "0%",
                scale: 1,
                filter: "drop-shadow(0 2px 2px rgba(0,0,0,.35))",
              }
        }
        transition={
          isMover
            ? {
                duration: 0.42,
                times: [0, 0.16, 0.82, 0.93, 1],
                ease: "easeInOut",
              }
            : { duration: 0.2 }
        }
        className="relative flex items-center justify-center"
        style={{
          // Sized via container query units so it scales with the board.
          fontSize: "76cqh",
          fontFamily: FONT_STACK,
          lineHeight: 1,
          color: fill,
          WebkitTextStroke: `${strokeWidth}px ${stroke}`,
          textShadow: isWhite
            ? "0 1px 0 rgba(0,0,0,0.12)"
            : "0 1px 0 rgba(255,255,255,0.08), 0 -1px 1px rgba(255,255,255,0.12)",
        }}
      >
        {/* glossy top highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: "15%",
            top: "4%",
            width: "70%",
            height: "42%",
            borderRadius: "50%",
            background: isWhite
              ? "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.6), rgba(255,255,255,0) 70%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.2), rgba(255,255,255,0) 70%)",
            mixBlendMode: "screen",
          }}
        />
        <span style={{ position: "relative" }}>{glyph}</span>
      </motion.div>
    </motion.div>
  );
}
