import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { KeyBindings, GameState } from '../types';
import { sound } from '../sound';
import { Keyboard, Volume2, Save, RotateCcw, Sliders, Check, HelpCircle } from 'lucide-react';

interface OptionsMenuProps {
  bindings: KeyBindings;
  onChangeBindings: (bindings: KeyBindings) => void;
  onSetState: (state: GameState) => void;
  soundVolume: number;
  onChangeSoundVolume: (volume: number) => void;
  tileSize: number;
  onChangeTileSize: (size: number) => void;
  playerSpeed: number;
  onChangePlayerSpeed: (speed: number) => void;
}

export default function OptionsMenu({
  bindings,
  onChangeBindings,
  onSetState,
  soundVolume,
  onChangeSoundVolume,
  tileSize,
  onChangeTileSize,
  playerSpeed,
  onChangePlayerSpeed,
}: OptionsMenuProps) {
  const [activeRebind, setActiveRebind] = useState<keyof KeyBindings | null>(null);
  const [volume, setVolume] = useState<number>(soundVolume * 100);
  const [localTileSize, setLocalTileSize] = useState<number>(tileSize);
  const [localSpeed, setLocalSpeed] = useState<number>(playerSpeed);
  const [savedFeedback, setSavedFeedback] = useState<boolean>(false);

  // Default bindings to restore
  const defaultBindings: KeyBindings = {
    up: 'w',
    down: 's',
    left: 'a',
    right: 'd',
    attack: 'p',
    skill: 'o',
    dance: 'i',
  };

  useEffect(() => {
    if (!activeRebind) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const key = e.key.toLowerCase();
      
      // Avoid binding Escape or space without caution, but allow most normal characters
      if (key === 'escape') {
        setActiveRebind(null);
        return;
      }

      // Create new bindings
      const updated = { ...bindings, [activeRebind]: key };
      onChangeBindings(updated);
      setActiveRebind(null);
      sound.playClick();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeRebind, bindings, onChangeBindings]);

  const handleSave = () => {
    sound.playClick();
    onChangeSoundVolume(volume / 100);
    onChangeTileSize(localTileSize);
    onChangePlayerSpeed(localSpeed);
    
    // Apply sound manager volume immediately
    sound.setVolume(volume / 100);
    
    setSavedFeedback(true);
    setTimeout(() => {
      setSavedFeedback(false);
      onSetState('START_MENU');
    }, 800);
  };

  const handleReset = () => {
    sound.playClick();
    onChangeBindings(defaultBindings);
    setVolume(50);
    setLocalTileSize(64);
    setLocalSpeed(5);
    onChangeSoundVolume(0.5);
    onChangeTileSize(64);
    onChangePlayerSpeed(5);
    sound.setVolume(0.5);
  };

  // Helper to get printable key representation
  const formatKey = (key: string) => {
    if (key === ' ') return 'SPACE';
    if (key === 'arrowup') return '▲ UP';
    if (key === 'arrowdown') return '▼ DOWN';
    if (key === 'arrowleft') return '◀ LEFT';
    if (key === 'arrowright') return '▶ RIGHT';
    return key.toUpperCase();
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-start bg-neutral-950 text-white overflow-y-auto p-6 font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.1)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Header */}
      <div className="z-10 w-full max-w-2xl flex flex-col items-center mt-2 mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-orange-500 uppercase flex items-center gap-2">
          <Sliders className="w-6 h-6 text-orange-500 animate-pulse" />
          Game Options & Controls
        </h1>
        <p className="text-xs text-neutral-400 mt-1">Configure keyboard bindings and gameplay settings</p>
      </div>

      <div className="z-10 w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
        
        {/* Left Column: Key Bindings */}
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 backdrop-blur">
          <h2 className="text-md font-semibold text-neutral-200 border-b border-neutral-800 pb-3 mb-4 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-orange-500" />
            Key Bindings
          </h2>

          <div className="flex flex-col gap-2.5">
            {[
              { label: 'Move Up', action: 'up' as keyof KeyBindings },
              { label: 'Move Down', action: 'down' as keyof KeyBindings },
              { label: 'Move Left', action: 'left' as keyof KeyBindings },
              { label: 'Move Right', action: 'right' as keyof KeyBindings },
              { label: 'Punch / Attack (P)', action: 'attack' as keyof KeyBindings, extra: 'Triggers hit box and fireball' },
              { label: 'Energy Skill (O)', action: 'skill' as keyof KeyBindings, extra: 'Creates expanding ring' },
              { label: 'Dance Action (I)', action: 'dance' as keyof KeyBindings, extra: 'Plays dance loop animation' },
            ].map(({ label, action, extra }) => (
              <div key={action} className="flex items-center justify-between bg-neutral-950/80 border border-neutral-900/80 rounded-xl p-2.5 hover:border-neutral-800/80 transition-all">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-300">{label}</span>
                  {extra && <span className="text-[10px] text-neutral-500">{extra}</span>}
                </div>

                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveRebind(action);
                  }}
                  className={`min-w-24 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                    activeRebind === action
                      ? 'bg-orange-500 border-orange-400 text-white animate-pulse'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 text-orange-400'
                  }`}
                >
                  {activeRebind === action ? 'PRESS KEY...' : formatKey(bindings[action])}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl bg-neutral-950/40 border border-neutral-800 text-[11px] text-neutral-500 flex gap-2">
            <HelpCircle className="w-4 h-4 text-neutral-400 flex-shrink-0" />
            <span>Note: Secondary bindings like **Arrow keys** are always enabled alongside movement keys for flexibility!</span>
          </div>
        </div>

        {/* Right Column: Game Engine Tweaks */}
        <div className="flex flex-col gap-5">
          {/* Sounds and FX Card */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 backdrop-blur">
            <h2 className="text-md font-semibold text-neutral-200 border-b border-neutral-800 pb-3 mb-4 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-orange-500" />
              Sound FX
            </h2>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs text-neutral-400">
                <span>SFX Volume</span>
                <span className="font-bold font-mono text-orange-400">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-850 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="text-[10px] text-neutral-500 mt-1">
                Adjust synthetic retro audio volumes for punches, fireballs, and energy skills.
              </div>
            </div>
          </div>

          {/* Map & Ground Configurations */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 backdrop-blur">
            <h2 className="text-md font-semibold text-neutral-200 border-b border-neutral-800 pb-3 mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-orange-500" />
              Map & Ground Texture
            </h2>

            <div className="flex flex-col gap-4">
              {/* Tile Size Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs text-neutral-400">
                  <span>Ground Tile Scale (Tiling)</span>
                  <span className="font-bold font-mono text-orange-400">{localTileSize}px</span>
                </div>
                <input
                  type="range"
                  min="32"
                  max="128"
                  step="8"
                  value={localTileSize}
                  onChange={(e) => setLocalTileSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-850 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <span className="text-[10px] text-neutral-500">
                  Lower pixel values make the `ground.png` tile smaller (ทำ tiling เล็ก). Recommended: 64px.
                </span>
              </div>

              {/* Character Speed Multiplier */}
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex justify-between items-center text-xs text-neutral-400">
                  <span>Player Base Speed</span>
                  <span className="font-bold font-mono text-orange-400">{localSpeed} px/frame</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="9"
                  step="0.5"
                  value={localSpeed}
                  onChange={(e) => setLocalSpeed(Number(e.target.value))}
                  className="w-full h-1.5 bg-neutral-850 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
                <span className="text-[10px] text-neutral-500">
                  Speed of movement on the 50x50 ground plane.
                </span>
              </div>

              {/* Grid dimension display */}
              <div className="flex justify-between items-center bg-neutral-950/50 p-2.5 rounded-lg border border-neutral-800 text-xs">
                <span className="text-neutral-400">Ground Plane Dimensions:</span>
                <span className="font-mono text-neutral-200 font-bold">50 x 50 Tiles (3,200px)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Persistent Save/Reset bottom rail */}
      <div className="absolute bottom-0 inset-x-0 bg-neutral-900/90 border-t border-neutral-800/80 backdrop-blur p-4 flex justify-center z-20">
        <div className="w-full max-w-2xl flex justify-between gap-4">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold py-2.5 px-4 rounded-xl border border-neutral-850 hover:border-neutral-700 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restore Defaults
          </button>

          <button
            onClick={handleSave}
            disabled={savedFeedback}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-bold py-2.5 px-6 rounded-xl shadow-[0_2px_12px_rgba(249,115,22,0.2)] transition-all cursor-pointer border border-orange-400/20 min-w-36"
          >
            {savedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 animate-bounce" />
                SAVED SUCCESS!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                SAVE & GO BACK
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
