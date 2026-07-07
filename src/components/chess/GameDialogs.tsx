"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Flag, AlertTriangle } from "lucide-react";

const FONT_STACK =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols2", "Noto Sans Symbols", "DejaVu Sans", sans-serif';

const PROMO_PIECES: { kind: "q" | "r" | "b" | "n"; glyph: string }[] = [
  { kind: "q", glyph: "\u265B" },
  { kind: "r", glyph: "\u265C" },
  { kind: "b", glyph: "\u265D" },
  { kind: "n", glyph: "\u265E" },
];

interface GameDialogsProps {
  pendingPromotion: { from: string; to: string } | null;
  confirmResign: boolean;
  pendingStalemateWarning: { from: string; to: string; promotion?: string } | null;
  playerColor: "w" | "b";
  onChoosePromotion: (piece: "q" | "r" | "b" | "n") => void;
  onConfirmResign: () => void;
  onCancelResign: () => void;
  onConfirmStalemate: () => void;
  onCancelStalemate: () => void;
}

/**
 * Modal dialogs for the game screen: pawn-promotion picker, resign
 * confirmation, and stalemate warning.
 */
export function GameDialogs({
  pendingPromotion,
  confirmResign,
  pendingStalemateWarning,
  playerColor,
  onChoosePromotion,
  onConfirmResign,
  onCancelResign,
  onConfirmStalemate,
  onCancelStalemate,
}: GameDialogsProps) {
  // Promotion pieces should match the player's color. To ensure visibility in
  // BOTH light and dark mode, each piece sits on a contrasting backdrop chip
  // (dark disc for white pieces, light disc for black pieces) — the same
  // approach used in the captured-pieces trays.
  const isWhitePlayer = playerColor === "w";

  return (
    <>
      {/* ───── Promotion dialog ───── */}
      <AnimatePresence>
        {pendingPromotion && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <p className="mb-3 text-center text-sm font-semibold text-foreground">
                Promote pawn to:
              </p>
              <div className="flex gap-2">
                {PROMO_PIECES.map((p) => (
                  <button
                    key={p.kind}
                    type="button"
                    onClick={() => onChoosePromotion(p.kind)}
                    className="flex h-14 w-14 items-center justify-center rounded-lg border-2 border-primary/30 transition hover:border-primary hover:bg-accent"
                    style={{
                      // Contrasting backdrop so pieces are visible in both themes.
                      background: isWhitePlayer
                        ? "linear-gradient(135deg, rgba(43,30,20,0.92), rgba(28,20,12,0.92))"
                        : "linear-gradient(135deg, rgba(247,239,217,0.96), rgba(230,207,149,0.96))",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: FONT_STACK,
                        fontSize: 34,
                        lineHeight: 1,
                        color: isWhitePlayer
                          ? "var(--piece-ivory)"
                          : "var(--piece-ebony)",
                        WebkitTextStroke: isWhitePlayer
                          ? "1px var(--piece-ivory-stroke)"
                          : "0.7px var(--piece-ebony-stroke)",
                      }}
                    >
                      {p.glyph}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Stalemate warning dialog ───── */}
      <AnimatePresence>
        {pendingStalemateWarning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancelStalemate}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[min(90vw,380px)] rounded-2xl border border-amber-500/40 bg-card p-5 shadow-2xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="text-base font-semibold text-foreground">
                  This move causes a stalemate!
                </span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                That move would leave Harmon with no legal moves but not in
                check — which is a <strong>draw by stalemate</strong>, not a
                win. To win, you need to deliver <strong>checkmate</strong>{" "}
                (the king must be in check AND have no escape).
                <br /><br />
                Try a different move that keeps the king in check, or choose to
                proceed with the draw.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onCancelStalemate}>
                  Choose another move
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 text-white hover:bg-amber-700"
                  onClick={onConfirmStalemate}
                >
                  Proceed (draw)
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Resign confirmation dialog ───── */}
      <AnimatePresence>
        {confirmResign && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancelResign}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[min(90vw,360px)] rounded-2xl border border-rose-400/40 bg-card p-5 shadow-2xl"
            >
              <div className="mb-2 flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-600" />
                <span className="text-base font-semibold text-foreground">Resign the game?</span>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                You will concede the match to Harmon AI. The result will be recorded on the leaderboard.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onCancelResign}>
                  Keep playing
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-600 text-white hover:bg-rose-700"
                  onClick={onConfirmResign}
                >
                  <Flag className="h-3.5 w-3.5 mr-1" /> Resign
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
