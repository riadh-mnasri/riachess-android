# RiaChess Android

[Version française](README.md)

Android chess app by the [RiaChess](https://riachess.fr) club. The code (Expo / React Native) can also be built for iOS. The goal: one app for playing (pass and play, against the computer, online), puzzles, game analysis and learning openings and endgames, with the club's coaching follow-up.

<p>
  <img src="docs/screenshots/home.png" alt="Home screen" width="280" />
  &nbsp;
  <img src="docs/screenshots/bot-game.png" alt="Game against Stockfish" width="280" />
</p>

## Contents

- [Features](#features)
- [Try it on an Android phone](#try-it-on-an-android-phone)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Chess engine](#chess-engine)
- [Run locally](#run-locally)
- [npm scripts](#npm-scripts)
- [Tests](#tests)
- [Builds and release](#builds-and-release)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License and credits](#license-and-credits)

## Features

### Available

**Board**
- Tap to move (piece, then square) or drag and drop.
- Legal squares shown, captures marked with a ring.
- Last move and checked king highlighted.
- Coordinates on the board edge, board flip.
- Promotion piece picker.
- Vector pieces, sharp on every screen size.

**Pass and play**: two players on one device.

**Play the computer**: Stockfish 19, 8 levels, play White, Black or a random side. The engine thinks without blocking the interface. "Undo" takes back both your move and the computer's.

**During a game**
- Check, checkmate and draw detection: stalemate, threefold repetition, 50-move rule, insufficient material.
- Captured pieces and material balance shown for each side.
- Move list in algebraic notation.
- Copy the game as PGN, with the date and player names.
- Haptic feedback on every move on phones.

**General**: French and English interface (device language by default, switch from the home screen), the club's navy and gold theme.

### Coming next

Online play through Lichess, puzzles, analysis, Learn section, RiaChess account: see the [roadmap](#roadmap).

## Try it on an Android phone

**With the APK (recommended).** A test APK is built with EAS (see [Builds and release](#builds-and-release)). On the phone:
1. Open the download link provided by EAS.
2. Allow installing apps from the browser if Android asks.
3. Install and open RiaChess.

**With Expo Go (no install).**
1. Install [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) on the phone.
2. Run `npm start` on the computer, with the phone on the same Wi-Fi.
3. Scan the QR code shown in the terminal.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | [Expo](https://expo.dev) SDK 57, React Native 0.86, strict TypeScript |
| Navigation | Expo Router (screens in `src/app/`) |
| Game rules | [chess.js](https://github.com/jhlywa/chess.js) |
| Board | Custom component: react-native-gesture-handler, react-native-svg |
| Engine | [Stockfish.js](https://github.com/nmrugg/stockfish.js) 19 (WASM), Web Worker or WebView |
| Tests | Jest (`jest-expo`) |
| Builds | EAS Build (Android and iOS in the cloud) |

## Architecture

The code keeps game rules apart from rendering, so the logic stays testable without a phone:

```
src/
  app/                    Expo Router screens
    index.tsx             home
    play/local.tsx        pass and play
    play/bot.tsx          game against the computer
  domain/                 pure logic, no React or React Native
    game.ts               game state, moves, status, material, PGN
    bot.ts                computer levels, move choice
  infrastructure/
    engine/               Stockfish adapters
      uci.ts              UCI protocol, request queue
      EngineHost.tsx      Android and iOS: hidden WebView
      EngineHost.web.tsx  web: Web Worker
      bootstrap.ts        Stockfish worker startup
  ui/
    board/                board, geometry, SVG pieces
    game/GameView.tsx     game screen shared by all modes
    theme.ts              club colors
  i18n/                   FR/EN strings
scripts/
  build-engine.mjs        embeds Stockfish at install time
```

**Principles**
- `domain/` depends on no framework. Game state is immutable: every move returns a new state.
- The engine is reached through a UCI interface (`UciTransport`). Swapping the WebView for a native module will not touch the rest of the app.
- Metro picks the adapter per platform through the `.web.tsx` and `.tsx` suffixes.

## Chess engine

The app embeds **Stockfish 19 "lite", single-threaded**: 1.8 MB of WASM with a smaller neural network. When dependencies are installed, `scripts/build-engine.mjs` turns it into a TypeScript module (`src/infrastructure/engine/generated/`, not committed). The engine therefore works **offline**.

- **Web**: the engine runs in a Web Worker created from the embedded script.
- **Android and iOS**: the same worker runs in a hidden WebView. It works in Expo Go, with no native module. A faster native C++ module is planned together with analysis.

**Levels**

| Level | Name | Skill Level | Depth | Max time | Random moves |
| --- | --- | --- | --- | --- | --- |
| 1 | Discovery | 0 | 1 | 50 ms | 45 % |
| 2 | Beginner | 0 | 2 | 100 ms | 25 % |
| 3 | Beginner + | 2 | 3 | 150 ms | 12 % |
| 4 | Club | 5 | 5 | 200 ms | 5 % |
| 5 | Club + | 8 | 6 | 300 ms | 0 % |
| 6 | Advanced | 11 | 8 | 400 ms | 0 % |
| 7 | Strong | 15 | 12 | 600 ms | 0 % |
| 8 | Maximum | 20 | 18 | 1 s | 0 % |

Even at its weakest setting, Stockfish is too strong for a beginner. The first levels therefore play some of their moves at random. These settings live in `src/domain/bot.ts`.

## Run locally

**Requirements**: Node.js 20 or newer, npm.

```bash
git clone https://github.com/riadh-mnasri/riachess-android.git
cd riachess-android
npm install        # installs dependencies and embeds Stockfish
npm run web        # opens the app in the browser: http://localhost:8190
npm start          # Metro on port 8190, for Expo Go or a development build
```

The development port is **8190**. No environment variables are needed yet.

## npm scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Metro server (port 8190) |
| `npm run web` | Web version in the browser |
| `npm run android` / `npm run ios` | Open the app on an emulator or device |
| `npm test` | Jest tests |
| `npm run typecheck` | TypeScript check |
| `postinstall` | Regenerates the embedded Stockfish module (automatic) |

## Tests

```bash
npm test
npm run typecheck
```

The tests cover:
- **the domain**: legal moves, checkmate, stalemate, promotion, undo, material, PGN export, computer levels and move choice;
- **board geometry**: touched square for each orientation, FEN parsing;
- **the UCI adapter**, with a fake engine: startup, best move, requests handled one after another.

Tests follow a `Given / When / Then` structure.

## Builds and release

Builds go through [EAS](https://docs.expo.dev/eas/), with no local Android Studio or Xcode. Profiles in `eas.json`:

| Profile | Output | Use |
| --- | --- | --- |
| `preview` | Installable Android APK | Testing on a phone |
| `development` | Development build | Debugging native code |
| `production` | AAB (Play Store), IPA (App Store) | Release |

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

To publish on Google Play, a personal developer account must first run a closed test with 12 testers for 14 days.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1. Foundations | Board, pass and play, PGN, FR/EN | Done |
| 2. Play the computer | Stockfish, 8 levels | Done |
| 3. Analysis | Evaluation bar, best moves, mistake labels, Lichess / chess.com import | Planned |
| 4. Puzzles | Offline Lichess puzzle database (CC0), rating, themes | Planned |
| 5. Learn | Opening repertoires with spaced repetition, endgame lessons | Planned |
| 6. Online play | Games on Lichess through the official API | Planned |
| 7. Accounts | Sign in with the riachess.fr account, premium status | Planned |
| 8. Club space | Coach assignments, student follow-up | After the MVP |

## Contributing

- Commit messages follow the Angular format: `type(scope): subject` (e.g. `feat(board): add premoves`).
- Before proposing a change, `npm test` and `npm run typecheck` must pass.
- Game logic goes in `src/domain/`, with its tests.

## License and credits

- Code licensed under [GPL-3.0-or-later](LICENSE), compatible with Stockfish.
- [Stockfish](https://stockfishchess.org) (GPLv3), through Nathan Rugg's WASM port [Stockfish.js](https://github.com/nmrugg/stockfish.js).
- "cburnett" pieces by Colin M.L. Burnett (GPLv2+), the default [Lichess](https://lichess.org) piece set.
- [chess.js](https://github.com/jhlywa/chess.js) (BSD-2-Clause).

© 2026 Riadh MNASRI
