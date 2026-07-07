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

---
Task ID: 6
Agent: main
Task: Color selection, captured-pieces 3D fly-off, dark-mode logo fix.

Work Log:
- Fixed dark-mode logo: the horse crest in EntryScreen + GameScreen header used `--piece-ivory-stroke` (dark color) which was invisible on dark backgrounds. Switched to `var(--primary)` (luminous amber in dark, mahogany in light) so the knight is always visible. VLM-confirmed.
- Color selection: added ColorSelector to EntryScreen with 3 options (White / Black / Random). Random draws at submit time. Entry screen subtitle updates dynamically. page.tsx passes `color` through to GameScreen.
- useChessGame refactor for arbitrary player color:
  - Added `playerColor`/`aiColor` to state + `playerColorRef`.
  - `setPlayerColor()`, `newGame({playerColor})`, `setPlayerName` all use refs.
  - `selectSquare` now checks `game.turn() === prev.playerColor` and selects `prev.playerColor` pieces (not hardcoded 'w').
  - Promotion rank check uses `prev.playerColor === 'w' ? '8' : '1'`.
  - `requestAiMove` computes `aiColor` from the ref; winner derivation is color-agnostic ("White wins" → ai wins if aiColor==='w').
  - AI-trigger effect fires when `state.turn === state.aiColor`.
  - `resign` uses dynamic "White/Black wins by resignation" based on aiColor.
  - `saveGame` persists the actual `playerColor`.
  - `undo` rewinds to player's turn correctly for either color.
- Board orientation: ChessBoard accepts `orientation` prop ('w'|'b'); `squareToGrid` + coordinate labels respect `flipped` so the board rotates 180° when player is Black. Verified: first square = h1 when playing Black.
- Captured-pieces system:
  - `CapturedPiece` type (id, type, color, capturedBy, fromSquare, nonce) added to GameState.
  - `applyMove` detects captures (incl. en passant), records the victim piece with its origin square BEFORE removal, appends to `state.captured`, and sets `state.lastCapture` + bumps `captureNonce`.
  - `CapturedTray` component: two trays ("You captured" / "AI captured") above the board, showing captured piece glyphs with spring entrance animation (rotateY, scale, slide-in) and a material-balance "+N" badge. Verified: "AI captured ♝ +3" after the AI took my bishop.
  - `CaptureFlyOff` overlay: renders the just-captured piece at its origin square, then animates it flying off-board (translate + rotateZ + rotateY 360° + fade) toward the capturing side's tray edge. VLM-confirmed a bishop flying off mid-animation.
  - Board wrapper uses a ResizeObserver to feed accurate boardRect to the fly-off overlay for precise positioning.
- EvalBar + side-panel text made color-aware ("You"/"Harmon AI" labels swap based on playerColor; idle text says "Harmon opens with White" when player is Black).
- Fixed init-effect infinite loop (game object in deps caused re-render loop → client crash) via a `didInitRef` mount guard.
- VLM-verified: dark logo visible, captures trays readable in dark mode, fly-off animation visible mid-flight, Random produces both colors across attempts.
- Lint clean, no console/runtime errors.

Stage Summary:
- Players can now choose White, Black, or Random. Board flips for Black, AI opens when player is Black. Captures are tracked with a 3D animated fly-off to side trays showing material balance. Dark-mode logo fixed. All verified end-to-end.

---
Task ID: 7
Agent: main
Task: Confetti on every game end (win/loss/draw) + celebratory banner.

Work Log:
- Hook: changed confetti trigger from `winner === "player" || winner === "ai"` to `gameOver` (any ending) in both applyMove and requestAiMove paths. Resign already always bumped. Now draws (stalemate, insufficient material, threefold repetition) also fire confetti.
- Confetti component rewrite:
  - Now fires for winner === "draw" too (was previously early-returned).
  - Three palettes: PLAYER_COLORS (emerald/azure/gold — victory), AI_COLORS (rose/umber — Harmon wins), DRAW_COLORS (golden multi-color — draw).
  - Three particle shapes: rect, circle, and streamer (long thin ribbons) for richer celebration.
  - Particle counts: player win 140, draw 130, AI win 90 (draws and wins get bigger celebrations).
  - Added celebratory banner overlay: a centered glass card with a large serif headline ("Victory!" / "Harmon Wins" / "Draw") in the outcome accent color, plus the result label as subtitle (e.g. "White wins by checkmate", "Black wins by resignation", "Draw — Stalemate"). Spring entrance + pulsing scale on the headline.
  - Banner auto-fades after ~3.2s; confetti runs ~4.8s.
- GameScreen: passes `resultLabel={state.gameResult}` to Confetti so the banner shows the exact result.
- VLM-verified: player win → green "Victory!" banner with blue/green/yellow confetti; resign → red "Harmon Wins" banner with red/yellow/brown confetti. Draw path uses identical mechanism with golden palette + "Draw" banner.
- Lint clean, no console/runtime errors. Cleaned test DB records.

Stage Summary:
- Animated confetti + celebratory banner now fires on EVERY game end: player win (green "Victory!"), AI win / resign (red "Harmon Wins"), and draw (golden "Draw"). Each with a distinct color palette and the actual result label as subtitle.

---
Task ID: 8
Agent: main
Task: Fix hydration mismatch error on <body>.

Work Log:
- Root cause: the Grammarly browser extension injects `data-gr-ext-installed` and `data-new-gr-c-s-check-loaded` attributes onto <body> after SSR but before React hydrates, causing a hydration mismatch. This is NOT an app-code bug — the React error message itself notes browser extensions as a cause.
- Fix: added `suppressHydrationWarning` to the <body> tag in src/app/layout.tsx (the <html> tag already had it). This is React's recommended approach for browser-extension-injected attributes — it tells React to ignore attribute-only differences on that element during hydration, while still hydrating children correctly.
- Verified: no hydration errors on entry screen or after navigating into the game. Lint clean.

Stage Summary:
- Hydration mismatch resolved with a one-line, framework-recommended fix.

---
Task ID: 9
Agent: main
Task: Fix dark-mode captured-piece visibility, enhance Analyse button with LLM suggestions, add Influence tooltip, increase font size.

Work Log:
- CapturedTray dark-mode fix: each captured piece now sits on a contrasting rounded-full backdrop chip (dark disc for white pieces, light cream disc for black pieces) so both colors are readable in both light and dark mode. VLM-confirmed the captured bishop is visible on its disc in dark mode.
- Analyse Game button (renamed from "Review Game"): now triggers requestAnalysis() which (a) fetches the review markers if not already loaded, then (b) calls a new /api/analyze endpoint that uses the LLM to generate a personalized coaching analysis with specific move-referenced suggestions (missed wins, better moves, timing). The analysis displays in a "Coach's Analysis" panel with a Brain icon, skeleton loading state, and a Re-run button. Verified: returns move-specific feedback like "after Black's questionable 2...b5, you could have challenged with 2.c4".
- /api/analyze endpoint: takes sans + annotations + playerName + playerColor + result, builds a compact annotated move list, prompts the LLM as a Beth-Harmon-spirit coach, returns ~220-word flowing analysis covering opening principles, key turning points, what the player could have done better/earlier, and an encouraging closing.
- Influence tooltip: wrapped the "Influence" label in a shadcn Tooltip (with an Info icon) that explains on hover: "Toggles a colour overlay on every square showing which side controls it... Warm cream tones = White-controlled, deep umber tones = Black-controlled. Use it to spot weak squares, hanging pieces, and who owns the centre at a glance." VLM-confirmed the tooltip renders.
- Font size increase: bumped the root html font-size from 16px to 17px (mobile) / 17.5px (sm) / 18px (lg+) so all rem-based sizing scales up uniformly. Also bulk-bumped fixed px text classes: text-[10px]/text-[11px] → text-xs, text-[12px] → text-[13px] across all chess components + theme toggle.
- Lint clean, no console/runtime errors. Cleaned test DB records.

Stage Summary:
- Dark-mode captured pieces now readable (contrast chips). Analyse Game button delivers LLM-powered personalized coaching suggestions. Influence toggle has a descriptive tooltip. App-wide font size increased for better readability.

---
Task ID: 10
Agent: main
Task: Responsive captured trays + collapsible Analysis modal with dual-layout replay.

Work Log:
- CapturedTray responsiveness fix: rewrote to fixed h-9 height, flex-1 min-w-0 with overflow-x-auto (horizontal scroll if many pieces), shrink-0 chips (h-6 w-6, no negative margin overlap), shrink-0 label + diff badge. No more vertical stacking/overflow. Verified: 38px fixed height on mobile, no overflow.
- AnalysisModal (new component): a Dialog-based collapsible modal with dual layout:
  - LEFT (52% on desktop, full on mobile): replay ChessBoard + controls (Reset, Prev, Play/Pause auto-play, Next) + Slider + current-move annotation chip (kind badge + SAN + side). The board shows review markers (Brilliant/Blunder squares) and best-move arrows.
  - RIGHT (48% on desktop, stacks below on mobile): Coach's Analysis panel (LLM text with skeleton loading + Re-run button) + compact GameReview (summary + per-move detail).
  - Responsive: md:flex-row side-by-side, flex-col stacked on mobile. Max-h-[92vh] with internal scroll.
  - Closable via X button, ESC, or backdrop click. Reopenable via "Analyse Game" button or "View Analysis" button in the game-over banner.
  - Auto-play steps through moves at 1.1s intervals; stops at end or on manual navigation.
- GameScreen wiring:
  - Added analysisOpen state.
  - "Analyse Game" button now opens the modal + triggers requestAnalysis (if not already loading/loaded).
  - Game-over banner now has a "View Analysis" button to reopen the modal.
  - Removed the inline Coach's Analysis + Review panels from the side panel (moved into the modal) — the side panel no longer grows long, solving the "scroll down past the board" problem.
  - GameReview now accepts a `compact` prop that hides its own slider/header (the modal provides controls).
- VLM-verified: modal dual-layout (board left, analysis right), Prev/Play/Next controls work (4→3→2), ESC closes, reopen works, mobile stacks vertically, trays are single-row and neatly contained.
- Lint clean (used rAF pattern for set-state-in-effect), no console/runtime errors. Cleaned test DB.

Stage Summary:
- Captured trays are now responsive (fixed height, horizontal scroll, no overflow). Analysis opens in a collapsible dual-layout modal with a full move-by-move replay board (Prev/Play/Next + markers/arrows) alongside the LLM coaching text — no more scrolling past the board to reach the analysis.

---
Task ID: 11
Agent: main
Task: Layout redesign — compact navbar, 3-column layout, fix modal responsiveness, UAT.

Work Log:
- Compact navbar: reduced to a single sticky row holding brand+match (left), Influence toggle + difficulty pills (center), theme/sound/exit (right). Added DifficultySelectorCompact (small pill buttons with pips, label hidden on <sm). Influence toggle moved into navbar with its tooltip preserved.
- 3-column main layout (xl screens): LEFT panel (Harmon's last move/thinking + move history + game controls + game-over banner), CENTER (board + captured trays), RIGHT (eval bar + turn indicator/quick stats). On mobile/tablet it stacks: board first, then left panel, then right panel. Eliminated the long vertical scroll — page now fits in ~604px vs 577px viewport (27px overflow vs hundreds before).
- Moved "Harmon's last move" section from right side to LEFT of the board (utilizing empty space). Game controls (New/Undo/Analyse/Resign) moved into the left panel below move history (no longer below the board).
- Difficulty selector: compact pills in navbar on sm+, full card selector shown in right panel only on mobile (<sm).
- Analysis modal responsiveness fix: body now uses overflow-y-auto on mobile (single scrollable column) and md:overflow-hidden with dual panes (each scrolls independently) on desktop. Reduced header padding, made title truncate, moves badge hidden on mobile. VLM-confirmed: dual layout on desktop, vertical stack on mobile, no conflicts.
- Dark/light contrast audit: VLM-confirmed all surfaces (navbar, board, side panels, eval bar, difficulty pills, influence toggle) have strong contrast in both modes. Added dark: variants for game-over banner crown colors and resign hover.
- UAT (PM-style, every feature in both themes):
  1. Entry screen (light): name input, color selector (White/Black/Random), difficulty, Begin button — all present.
  2. Game layout (light): 3-column, navbar with Level pills + Influence, no wasted space, minimal scroll. VLM-confirmed.
  3. Dark mode: full contrast verified — navbar, board, pieces, side panels, pills, toggle all readable. VLM-confirmed.
  4. Move + AI response: e4 → Na6, Harmon's last move shows in LEFT panel with LLM narration.
  5. Influence toggle: heatmap renders, toggles off.
  6. Difficulty change: Club Player pill activates.
  7. Analyse modal (desktop): opens, dual layout, replay controls (70 buttons), Coach's Analysis LLM text loads. VLM-confirmed.
  8. Analyse modal (mobile): stacks vertically, scrollable, no conflicts. VLM-confirmed.
  9. Resign flow: dialog → confirm → "Black wins by resignation" + "Harmon Wins" confetti banner.
  10. Leaderboard: opens, shows 2 games, Top Players + Recent Games tabs.
  11. Mobile game layout: stacks reasonably, navbar compact, no overflow. VLM-confirmed.
- No console/runtime errors, lint clean, DB queries working. Cleaned test records.

Stage Summary:
- Navbar is now compact and utilized (difficulty pills + influence toggle inline). 3-column layout eliminates wasted space and long scroll. Harmon's last move moved to left of board. Analysis modal is fully responsive (dual-pane desktop, stacked scrollable mobile). Dark/light contrast verified across all surfaces. Full UAT passed for every feature in both themes.
