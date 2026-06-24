# Harmon's Gambit — Work Log

Project: Chess AI gameplay platform "Harmon's Gambit".
Stack: Next.js 16 (App Router) + TypeScript + Tailwind 4 + shadcn/ui + chess.js + framer-motion + z-ai-web-dev-sdk (LLM).

---
Task ID: 0
Agent: main
Task: Initialize worklog and plan.

Work Log:
- Explored project structure; confirmed Next.js 16 dev server running on port 3000.
- Installed chess.js@1.4.0.
- Reviewed LLM skill for move narration usage.
- Planned architecture: chess engine lib (minimax+alphabeta, eval, heatmap, explanation, review), API routes (ai-move, narrate, review), UI components (entry, board, pieces, side panel, review), Web Audio sounds.

Stage Summary:
- Foundation ready. Proceeding to engine implementation.

---
Task ID: 1
Agent: main
Task: Build full Harmon's Gambit app (engine, API, UI, sounds, review).

Work Log:
- Created chess engine lib: evaluation.ts (PSTs + material + heatmap), engine.ts (negamax + alpha-beta + quiescence + 3 difficulties), explain.ts (heuristic intent), review.ts (eval-swing annotations + Brilliant/Blunder), types.ts.
- Created API routes: /api/ai-move (computes AI move + eval + heatmap + heuristic explanation), /api/narrate (LLM Beth-Harmon-voice narration via z-ai-web-dev-sdk, with fallback), /api/review (post-game annotations).
- Built UI: useChessGame hook (piece-instance tracking for stable gliding), ChessBoard (walnut/maple squares, wood grain, heatmap overlay, last-move pulse, check highlight, legal dots, review arrows), ChessPiece (Unicode Staunton glyphs + CSS gloss/stroke + lift-glide-drop keyframes via container-query sizing), EvalBar, ThinkingIndicator (orbiting pieces), MoveHistory, DifficultySelector (rank badges), GameReview (slider + markers + legend), EntryScreen (name + difficulty), GameScreen (layout + sticky footer + promotion dialog).
- sounds.ts: Web Audio synthesized wood slide + thunk + capture accent + game-end chime.
- Fixed chess.js v1.4 type-only `Square` import (use `import type`).
- Verified all 3 API endpoints return 200 with sensible data.

Stage Summary:
- App compiles clean, lint clean. APIs verified working. Ready for browser E2E verification.

---
Task ID: 2
Agent: main
Task: Browser E2E verification + polish.

Work Log:
- Used Agent Browser to verify the full golden path:
  - Entry screen renders (title, name input, difficulty selector with rank badges, Begin button).
  - Name dynamically reflected in header ("Beth Harmon vs. Harmon AI").
  - Board renders 64 walnut/maple squares with wood-grain + 32 Staunton pieces (fill #1b140d ebony / #f7efd9 ivory, 0.7px stroke, 53.2px container-query sizing, gloss highlight).
  - Click-to-select + click-to-move works (e2-e4). Legal move dots verified (21px green marker).
  - AI responds for all 3 levels (Novice g5, Club Nc6/c5, Grandmaster Nc6) with heuristic explanation + LLM Beth-Harmon-voice narration.
  - "Club Player is thinking…" spinner verified visible during enforced min-think window (added minThinkMs: novice 550 / club 650 / master 950).
  - Eval bar updates (+1.1 "White is better"), move history pairs moves, influence heatmap toggles with fade.
  - Post-game review: slider, Inaccuracy marker on g5, eval swing (-1.1), "Engine suggests f6", legend.
  - Sticky footer flush on both entry (gap 0) and game screens.
  - Mobile (390x844): side panel stacks below board (flex-col), board 358px.
- Fixed: piece layer pointer-events (click-through to square buttons), chess.js type-only `Square` import, eval-swing review classification, entry footer padding.
- Lint clean, no console/runtime errors, all API routes 200.

Stage Summary:
- Harmon's Gambit is feature-complete and browser-verified. Ready for the user to preview.
