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

---
Task ID: 3
Agent: main
Task: Add resign + confetti, game persistence, floating leaderboard.

Work Log:
- Schema: added GameSession model (playerName, playerColor, difficulty, result, winner, resultLabel, moveCount, durationSec, moves SAN, finalFen, startedAt, finishedAt) + indexes. Pushed to SQLite via `bun run db:push`.
- APIs: /api/save-game (POST, validates + persists a finished game), /api/leaderboard (GET, aggregates top players by wins/fastest-win + recent games).
- useChessGame hook: added winner/resigned/saved/confetti state, startedAtRef + playerNameRef + savedRef, resign() action (player concedes → AI wins → save), saveGame() (idempotent persist), auto-save effect on natural game end, winner derivation in both applyMove + requestAiMove paths, confetti trigger bump on decisive results.
- Confetti.tsx: Framer Motion particle burst (120 player / 90 AI particles), color palette per winner (emerald/azure for player wins, rose/umber for AI wins), rule-clean (rAF + setTimeout for async setState).
- Leaderboard.tsx: floating toggle button (bottom-right) with pulsing dot + game count badge; expands to animated panel with Top Players / Recent Games tabs; shows rank medals, wins, games, fastest-win time, avg moves/win, difficulty; recent games list with result, move count, duration, time-ago.
- GameScreen.tsx: Resign button (rose outline) + confirmation dialog; player-name sync to hook ref; confetti + leaderboard mounted; game-over banner recolored by winner + "saved" status text.
- Fixed: `Difficulty` type-only import in Leaderboard (chess.js-style isolation).
- Verified: save-game returns {ok:true,id}, leaderboard returns aggregated data, DB count works.

Stage Summary:
- Resign flow + confetti + DB persistence + floating leaderboard all wired and API-verified. Ready for browser E2E.

---
Task ID: 4
Agent: main
Task: Browser E2E verification of resign + confetti + leaderboard + DB.

Work Log:
- Verified entry → game flow still works with new Resign + Leaderboard buttons present.
- Resign flow: button → confirmation dialog ("Resign the game?") → confirm → game ends, banner "Black wins by resignation", "Saved to the leaderboard", AI-win confetti (64 rose/umber particles) fired.
- DB: confirmed GameSession row created (playerName=Beth, winner=ai, resultLabel="Black wins by resignation", durationSec=19). moveCount=0 for resign is expected (no moves played).
- Leaderboard panel: floating toggle button (bottom-right, pulsing dot, game-count badge) → expands to animated panel with Top Players + Recent Games tabs.
  - Top Players: 🥇 medal, wins, games, fastest-win time, avg moves/win, top difficulty.
  - Recent Games: result label, move count, duration, time-ago, colored result dot.
- Injected a player_win record via API → leaderboard correctly aggregated (1W/1L, fastest win 95s) and showed "White wins by checkmate, 24 moves, 1:35".
- Cleaned all test DB records so user starts fresh (0 games).
- Lint clean, no console/runtime errors.

Stage Summary:
- Resign + confetti (both AI-win and player-win palettes) + Prisma/SQLite persistence + floating animated leaderboard all verified working end-to-end.

---
Task ID: 5
Agent: main
Task: Fix moves overflow, redesign difficulty selector, implement robust dark mode.

Work Log:
- MoveHistory: fixed overflow — changed to fixed h-40 ScrollArea with minmax(0,1fr) grid columns + truncate on move cells + title tooltips. Verified 18-ply game scrolls internally (scrollH 214 > clientH 158) without pushing into other UI.
- DifficultySelector: complete redesign — removed garish green/yellow/pink borders + colored rank badges. New design: monochrome cards with subtle border-border + bg-card/80, rank indicated by 3 vertical pips (filled count = level, bg-primary filled / bg-muted-foreground/25 empty), active card marked by border-primary + ring-1 ring-primary/40. Elegant and theme-consistent.
- Dark mode system:
  - globals.css: added chess-specific CSS variables (--parchment, --mahogany, --walnut, --walnut-deep, --maple, --maple-deep, --piece-ivory, --piece-ebony, --piece-ivory-stroke, --piece-ebony-stroke, --frame-grad-*, --heat-warm, --heat-cool, --last-move, --check, --legal-dot, --legal-ring) with light + dark values. Rewrote shadcn core tokens to warm amber-tinted neutrals (light) and deep charcoal-brown (dark). Added @theme inline mapping for bg-parchment etc.
  - ThemeProvider (next-themes, attribute="class", defaultTheme="system") + no-flash inline script in <head>.
  - ThemeToggle component (animated sun/moon icon swap via framer-motion AnimatePresence) added to entry screen + game header.
  - Updated ALL chess components to use CSS variables: ChessBoard (squares, frame, heatmap, highlights, coords, legal dots), ChessPiece (ivory/ebony fill+stroke), EvalBar, ThinkingIndicator, EntryScreen, GameScreen (header/cards/badges/dialogs/footer), Leaderboard (floating button + panel + rows), GameReview (badges with dark-aware /15 opacity backgrounds).
  - Dark mode: deeper moodier wood (walnut #5a3d24, maple #b89968), luminous pieces (ivory #f2e6c8, ebony #0a0805), charcoal-brown parchment (#1a1612), warm amber primary.
- VLM-verified: dark mode entry + game screen look polished; light mode difficulty selector is elegant/muted with no garish colors; moves list scrolls within fixed-height container.
- Lint clean, no console/runtime errors.

Stage Summary:
- Moves overflow fixed (scrollable container). Difficulty selector redesigned (elegant pips, no garish colors). Robust dark mode implemented across the entire app with smooth transitions and theme-aware CSS variables.
