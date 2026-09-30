// © 2026 Riadh MNASRI
import { useState } from "react";
import { newGame, playMove, undoMove, type Color, type GameState, type MoveInput } from "../../domain/game";
import { useI18n } from "../../i18n";
import { GameView, haptic } from "../../ui/game/GameView";

const anyone = () => true;

export default function LocalGame() {
  const { t } = useI18n();
  const [game, setGame] = useState<GameState>(() => newGame());
  const [orientation, setOrientation] = useState<Color>("w");

  const onMove = (move: MoveInput) => {
    const next = playMove(game, move);
    if (!next) return;
    setGame(next);
    haptic(next.status.kind === "playing" ? "move" : "end");
  };

  return (
    <GameView
      title={t.game.title}
      game={game}
      orientation={orientation}
      onFlip={() => setOrientation(orientation === "w" ? "b" : "w")}
      playerNames={{ w: t.game.white, b: t.game.black }}
      canMove={anyone}
      onMove={onMove}
      onUndo={() => setGame(undoMove(game))}
      onRestart={() => setGame(newGame())}
      pgnEvent={t.game.title}
    />
  );
}
