"use client";

import { motion } from "framer-motion";

const PIECES = ["\u265E", "\u265D", "\u265C", "\u265F"]; // knight, bishop, rook, pawn
const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif';

export function ThinkingIndicator({ difficulty }: { difficulty: string }) {
  const label =
    difficulty === "master"
      ? "Grandmaster"
      : difficulty === "club"
        ? "Club Player"
        : "Novice";
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-2">
      <div className="relative h-16 w-16">
        {PIECES.map((g, i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{ x: "-50%", y: "-50%" }}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.1,
            }}
          >
            <motion.div
              style={{
                fontFamily: FONT_STACK,
                fontSize: 18,
                color: i % 2 === 0 ? "var(--piece-ebony)" : "var(--walnut)",
              }}
              animate={{ rotate: -360 }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.1,
              }}
            >
              {/* place at orbit radius via translateY on this wrapper */}
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(-26px) rotate(${i * 90}deg)`,
                }}
              >
                {g}
              </span>
            </motion.div>
          </motion.div>
        ))}
        {/* core glow */}
        <motion.div
          className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
          style={{
            x: "-50%",
            y: "-50%",
            background: "var(--primary)",
            boxShadow: "0 0 12px rgba(var(--last-move), 0.9)",
          }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <motion.div
        className="text-sm font-medium text-primary"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {label} is thinking
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          …
        </motion.span>
      </motion.div>
    </div>
  );
}
