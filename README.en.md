# RiaChess mobile

[Version française](README.md)

Chess app for Android and iPhone by the [RiaChess](https://riachess.fr) club: play, solve puzzles, analyse your games and learn openings and endgames.

## Status

| Phase | Scope | Status |
| --- | --- | --- |
| 1. Foundations | Board (tap and drag and drop), pass and play, PGN, FR/EN | In progress |
| 2. Play the computer | Native Stockfish, 8 levels | Planned |
| 3. Analysis | Evaluation, best moves, Lichess / chess.com import | Planned |
| 4. Puzzles | Offline Lichess puzzle database (CC0) | Planned |
| 5. Learn | Openings with spaced repetition, endgames | Planned |
| 6. Online play | Through the Lichess API (Lichess account) | Planned |
| 7. Accounts | Same account as riachess.fr, premium status | Planned |

Available today: pass and play on one device, tap or drag and drop moves, legal squares shown, promotion, check, checkmate and draw detection (stalemate, threefold repetition, 50-move rule, insufficient material), captured pieces and material balance, undo, board flip, PGN copy.

## Stack

- [Expo](https://expo.dev) SDK 57, React Native, TypeScript
- Expo Router (screens in `src/app/`)
- [chess.js](https://github.com/jhlywa/chess.js) for the rules
- react-native-gesture-handler and react-native-svg for the board
- Jest (`jest-expo`) for tests

## Layout

```
src/
  app/        screens (Expo Router)
  domain/     game logic, no React Native dependency
  i18n/       FR/EN strings
  ui/         theme, board, components
```

## Run locally

```bash
npm install
npm run web       # browser, http://localhost:8190
npm start         # Metro on port 8190, then Expo Go or a development build
```

No environment variables are needed yet.

## Tests and checks

```bash
npm test          # Jest tests
npm run typecheck # TypeScript
```

## Deployment

Android and iOS builds will go through EAS (`npx eas-cli@latest build`), with no local Xcode or Android Studio. Store publishing is not set up yet.

## License and credits

Code licensed under [GPL-3.0-or-later](LICENSE), to stay compatible with the Stockfish engine that will be embedded.

"cburnett" pieces by Colin M.L. Burnett (GPLv2+), the default Lichess piece set.

© 2026 Riadh MNASRI
