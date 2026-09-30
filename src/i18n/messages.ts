// © 2026 Riadh MNASRI
export const fr = {
  home: {
    tagline: "Le club d'échecs dans votre poche",
    playNow: "Jouer maintenant",
    localTitle: "Partie à deux",
    localBody: "Un téléphone, deux joueurs. Idéal au club ou à la maison.",
    comingSoon: "Bientôt",
    upcoming: "Au programme",
    modes: {
      bot: { title: "Contre l'ordinateur", body: "Stockfish, 8 niveaux" },
      online: { title: "Jouer en ligne", body: "Avec votre compte Lichess" },
      puzzles: { title: "Problèmes", body: "Des milliers de combinaisons" },
      analysis: { title: "Analyse", body: "Revoyez vos parties coup par coup" },
      learn: { title: "Apprendre", body: "Ouvertures et finales" },
    },
    footer: "Club RiaChess",
  },
  game: {
    title: "Partie à deux",
    white: "Blancs",
    black: "Noirs",
    toMove: "au trait",
    check: "Échec !",
    checkmate: (winner: string) => `Échec et mat, les ${winner} gagnent`,
    draw: {
      stalemate: "Pat, partie nulle",
      threefold: "Nulle par triple répétition",
      insufficient: "Nulle, matériel insuffisant",
      "fifty-moves": "Nulle par la règle des 50 coups",
    },
    noMoves: "Les Blancs commencent. Touchez ou faites glisser une pièce.",
    flip: "Retourner",
    undo: "Reprendre",
    newGame: "Nouvelle",
    copyPgn: "PGN",
    copied: "PGN copié",
    rematch: "Rejouer",
    promoteTitle: "Promotion",
  },
};

export type Messages = typeof fr;

export const en: Messages = {
  home: {
    tagline: "Your chess club in your pocket",
    playNow: "Play now",
    localTitle: "Pass and play",
    localBody: "One phone, two players. Perfect at the club or at home.",
    comingSoon: "Soon",
    upcoming: "Coming up",
    modes: {
      bot: { title: "Play the computer", body: "Stockfish, 8 levels" },
      online: { title: "Play online", body: "With your Lichess account" },
      puzzles: { title: "Puzzles", body: "Thousands of tactics" },
      analysis: { title: "Analysis", body: "Review your games move by move" },
      learn: { title: "Learn", body: "Openings and endgames" },
    },
    footer: "RiaChess club",
  },
  game: {
    title: "Pass and play",
    white: "White",
    black: "Black",
    toMove: "to move",
    check: "Check!",
    checkmate: (winner: string) => `Checkmate, ${winner} wins`,
    draw: {
      stalemate: "Stalemate, draw",
      threefold: "Draw by threefold repetition",
      insufficient: "Draw, insufficient material",
      "fifty-moves": "Draw by the 50-move rule",
    },
    noMoves: "White starts. Tap or drag a piece.",
    flip: "Flip",
    undo: "Undo",
    newGame: "New",
    copyPgn: "PGN",
    copied: "PGN copied",
    rematch: "Play again",
    promoteTitle: "Promotion",
  },
};
