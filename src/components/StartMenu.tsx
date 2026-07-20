import { motion } from 'motion/react';
import { GameState, KeyBindings } from '../types';
import { sound } from '../sound';
import { Play, Settings, Keyboard, ShieldAlert } from 'lucide-react';

interface StartMenuProps {
  onSetState: (state: GameState) => void;
  bindings: KeyBindings;
  highScore: number;
}

export default function StartMenu({ onSetState, bindings, highScore }: StartMenuProps) {
  const handleStart = () => {
    sound.playClick();
    onSetState('PLAYING');
  };

  const handleOptions = () => {
    sound.playClick();
    onSetState('OPTIONS');
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between bg-neutral-950 text-white overflow-hidden p-6 font-sans">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Floating particles (ambient decoration) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-orange-500/20 blur-sm"
            style={{
              width: Math.random() * 80 + 40,
              height: Math.random() * 80 + 40,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * -100 - 50],
              x: [0, (Math.random() - 0.5) * 60],
              opacity: [0.2, 0.6, 0],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Top Bar (Highscore info) */}
      <div className="z-10 w-full flex justify-between items-center max-w-4xl text-neutral-400 text-sm font-mono mt-2">
        <div className="flex items-center gap-2 bg-neutral-900/80 border border-neutral-800/80 px-3.5 py-1.5 rounded-full shadow-inner">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>BSRU STUDIO</span>
        </div>
        <div className="bg-neutral-900/80 border border-neutral-800/80 px-3.5 py-1.5 rounded-full shadow-inner text-amber-400 font-bold">
          🏆 HIGH SCORE: {highScore}
        </div>
      </div>

      {/* Main Content (Logo & Menu) */}
      <div className="z-10 flex-1 flex flex-col items-center justify-center max-w-lg w-full gap-8 my-4">
        {/* Animated Game Logo */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative flex flex-col items-center"
        >
          {/* Logo glow effect behind */}
          <div className="absolute inset-0 bg-orange-600/30 blur-2xl rounded-full transform scale-110" />

          <img
            id="game-logo"
            src="https://res.cloudinary.com/dsucg33fv/image/upload/v1782709347/logo_i8827v.png"
            alt="Sprite Action Logo"
            className="w-80 md:w-96 h-auto relative drop-shadow-[0_12px_24px_rgba(249,115,22,0.4)] select-none hover:scale-105 transition-transform duration-300"
            referrerPolicy="no-referrer"
          />

          <p className="mt-4 text-xs font-mono tracking-[0.25em] text-neutral-400 uppercase text-center bg-black/40 px-3 py-1 rounded">
            Sprite Arena & Fire Burst
          </p>
        </motion.div>

        {/* Action Menu */}
        <div className="flex flex-col w-full gap-3 sm:px-8">
          <motion.button
            id="btn-play"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            onMouseEnter={() => sound.playClick()}
            className="flex items-center justify-center gap-3 w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-lg py-4 px-6 rounded-xl shadow-[0_4px_20px_rgba(249,115,22,0.3)] transition-all cursor-pointer border border-orange-400/30"
          >
            <Play className="w-5 h-5 fill-current" />
            START GAME
          </motion.button>

          <motion.button
            id="btn-options"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOptions}
            onMouseEnter={() => sound.playClick()}
            className="flex items-center justify-center gap-3 w-full bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-semibold py-3.5 px-6 rounded-xl border border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer"
          >
            <Settings className="w-5 h-5 text-neutral-400" />
            CONTROLS & OPTIONS
          </motion.button>
        </div>
      </div>

      {/* Footer Controls Preview */}
      <div className="z-10 w-full max-w-4xl border-t border-neutral-900 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-500 gap-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5 text-neutral-400" />
            <span>Move:</span>
            <span className="font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-neutral-300 font-semibold uppercase">
              {bindings.up}/{bindings.left}/{bindings.down}/{bindings.right}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span>Punch:</span>
            <span className="font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-amber-500 font-semibold uppercase">
              {bindings.attack}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span>Skill:</span>
            <span className="font-mono bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-cyan-400 font-semibold uppercase">
              {bindings.skill}
            </span>
          </span>
        </div>
        <div className="font-mono text-[10px] text-neutral-600">
          POWERED BY HTML5 CANVAS & REACT
        </div>
      </div>
    </div>
  );
}
