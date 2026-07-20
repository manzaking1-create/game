import { useState, useEffect } from 'react';
import { GameState, KeyBindings } from './types';
import StartMenu from './components/StartMenu';
import OptionsMenu from './components/OptionsMenu';
import GameCanvas from './components/GameCanvas';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START_MENU');

  // Key bindings state (with robust defaults as requested)
  const [bindings, setBindings] = useState<KeyBindings>(() => {
    const saved = localStorage.getItem('sprite_game_bindings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      up: 'w',
      down: 's',
      left: 'a',
      right: 'd',
      attack: 'p',
      skill: 'o',
      dance: 'i',
    };
  });

  // Score persistence
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem('sprite_game_highscore');
    return saved ? Number(saved) : 0;
  });

  // Tiling size for the 50x50 ground_d1kjrx.png
  const [tileSize, setTileSize] = useState<number>(() => {
    const saved = localStorage.getItem('sprite_game_tilesize');
    return saved ? Number(saved) : 64; // default 64px
  });

  // Character movement velocity
  const [playerSpeed, setPlayerSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('sprite_game_playerspeed');
    return saved ? Number(saved) : 5.0; // default 5.0
  });

  // Sound Volume setting
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    const saved = localStorage.getItem('sprite_game_volume');
    return saved ? Number(saved) : 0.5; // default 50%
  });

  // Persist changes
  const handleUpdateBindings = (newBindings: KeyBindings) => {
    setBindings(newBindings);
    localStorage.setItem('sprite_game_bindings', JSON.stringify(newBindings));
  };

  const handleUpdateHighScore = (score: number) => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sprite_game_highscore', String(score));
    }
  };

  const handleUpdateTileSize = (size: number) => {
    setTileSize(size);
    localStorage.setItem('sprite_game_tilesize', String(size));
  };

  const handleUpdatePlayerSpeed = (speed: number) => {
    setPlayerSpeed(speed);
    localStorage.setItem('sprite_game_playerspeed', String(speed));
  };

  const handleUpdateVolume = (vol: number) => {
    setSoundVolume(vol);
    localStorage.setItem('sprite_game_volume', String(vol));
  };

  return (
    <main className="w-screen h-screen flex items-center justify-center bg-neutral-950 select-none overflow-hidden text-neutral-100">
      <div className="w-full h-full relative flex flex-col max-w-full max-h-full overflow-hidden bg-neutral-900 border border-neutral-900 shadow-2xl">
        {gameState === 'START_MENU' && (
          <StartMenu
            onSetState={setGameState}
            bindings={bindings}
            highScore={highScore}
          />
        )}

        {gameState === 'OPTIONS' && (
          <OptionsMenu
            bindings={bindings}
            onChangeBindings={handleUpdateBindings}
            onSetState={setGameState}
            soundVolume={soundVolume}
            onChangeSoundVolume={handleUpdateVolume}
            tileSize={tileSize}
            onChangeTileSize={handleUpdateTileSize}
            playerSpeed={playerSpeed}
            onChangePlayerSpeed={handleUpdatePlayerSpeed}
          />
        )}

        {gameState === 'PLAYING' && (
          <GameCanvas
            bindings={bindings}
            onSetState={setGameState}
            tileSize={tileSize}
            playerSpeed={playerSpeed}
            onUpdateHighScore={handleUpdateHighScore}
            highScore={highScore}
          />
        )}
      </div>
    </main>
  );
}
