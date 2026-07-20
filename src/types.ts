export interface KeyBindings {
  up: string;
  down: string;
  left: string;
  right: string;
  attack: string;
  skill: string;
  dance: string;
}

export type GameState = 'START_MENU' | 'OPTIONS' | 'PLAYING' | 'GAME_OVER' | 'VICTORY';

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
  type?: 'ember' | 'ring' | 'shockwave' | 'hit' | 'sparkle';
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  damage: number;
  angle: number;
  life: number;
  maxLife: number;
}

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: 'slime' | 'spirit' | 'dummy';
  hp: number;
  maxHp: number;
  size: number;
  color: string;
  speed: number;
  state: 'idle' | 'chase' | 'hurt' | 'dance';
  stateTimer: number;
  facingLeft: boolean;
}

export interface GameStats {
  score: number;
  highScore: number;
  enemiesDefeated: number;
  combo: number;
  comboTimer: number;
  maxCombo: number;
}

export interface SoundConfig {
  volume: number; // 0 to 1
  sfxEnabled: boolean;
}
