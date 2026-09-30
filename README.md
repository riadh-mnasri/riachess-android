# RiaChess mobile

[English version](README.en.md)

Application mobile d'échecs du club [RiaChess](https://riachess.fr), pour Android et iPhone : jouer, résoudre des problèmes, analyser ses parties et apprendre les ouvertures et les finales.

## État d'avancement

| Phase | Contenu | État |
| --- | --- | --- |
| 1. Fondations | Échiquier (toucher et glisser-déposer), partie à deux, PGN, FR/EN | En cours |
| 2. Contre l'ordinateur | Stockfish natif, 8 niveaux | À venir |
| 3. Analyse | Évaluation, meilleurs coups, import Lichess / chess.com | À venir |
| 4. Problèmes | Base de puzzles Lichess (CC0) hors ligne | À venir |
| 5. Apprendre | Ouvertures en répétition espacée, finales | À venir |
| 6. Jeu en ligne | Via l'API Lichess (compte Lichess) | À venir |
| 7. Comptes | Même compte que riachess.fr, statut premium | À venir |

Déjà disponible : partie à deux sur le même appareil, coups au toucher ou au glisser-déposer, cases jouables affichées, promotion, détection de l'échec, du mat et des nulles (pat, triple répétition, 50 coups, matériel insuffisant), pièces prises et avantage matériel, reprise de coup, plateau retournable, copie du PGN.

## Stack

- [Expo](https://expo.dev) SDK 57, React Native, TypeScript
- Expo Router (écrans dans `src/app/`)
- [chess.js](https://github.com/jhlywa/chess.js) pour les règles
- react-native-gesture-handler et react-native-svg pour l'échiquier
- Jest (`jest-expo`) pour les tests

## Structure

```
src/
  app/        écrans (Expo Router)
  domain/     logique de partie, sans dépendance à React Native
  i18n/       textes FR/EN
  ui/         thème, échiquier, composants
```

## Lancer le projet en local

```bash
npm install
npm run web       # navigateur, http://localhost:8190
npm start         # Metro sur le port 8190, puis Expo Go ou un build de développement
```

Aucune variable d'environnement n'est nécessaire pour l'instant.

## Tests et vérifications

```bash
npm test          # tests Jest
npm run typecheck # TypeScript
```

## Déploiement

Les builds Android et iOS passeront par EAS (`npx eas-cli@latest build`), sans Xcode ni Android Studio en local. La publication sur les stores n'est pas encore en place.

## Licence et crédits

Code sous licence [GPL-3.0-or-later](LICENSE), pour rester compatible avec le moteur Stockfish qui sera intégré.

Pièces « cburnett » de Colin M.L. Burnett (GPLv2+), le jeu de pièces par défaut de Lichess.

© 2026 Riadh MNASRI
