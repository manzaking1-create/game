import { useEffect, useRef, useState } from 'react';
import { KeyBindings, GameState, Particle, Projectile, Enemy, GameStats } from '../types';
import { sound } from '../sound';
import { RefreshCw, Play, Settings, Eye, Zap, Volume2, Award, Swords, Compass } from 'lucide-react';

interface GameCanvasProps {
  bindings: KeyBindings;
  onSetState: (state: GameState) => void;
  tileSize: number;
  playerSpeed: number;
  onUpdateHighScore: (score: number) => void;
  highScore: number;
}

interface DamagePop {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export default function GameCanvas({
  bindings,
  onSetState,
  tileSize,
  playerSpeed,
  onUpdateHighScore,
  highScore,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Images loading state
  const [playerLoaded, setPlayerLoaded] = useState<boolean>(false);
  const [groundLoaded, setGroundLoaded] = useState<boolean>(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  // References to image objects
  const playerImgRef = useRef<HTMLImageElement | null>(null);
  const groundImgRef = useRef<HTMLImageElement | null>(null);

  // Game UI overlays
  const [score, setScore] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerEnergy, setPlayerEnergy] = useState<number>(100);
  const [combo, setCombo] = useState<number>(0);
  const [defeatedCount, setDefeatedCount] = useState<number>(0);
  const [activeState, setActiveState] = useState<GameState>('PLAYING');

  // Input states tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Player state
  const playerPos = useRef({ x: 1600, y: 1600 }); // Centered in a 50x50 grid of tileSize (3200x3200 at size 64)
  const playerFacingLeft = useRef<boolean>(false);
  const playerAnimFrame = useRef<number>(0);
  const playerAnimTick = useRef<number>(0);
  const playerActionState = useRef<'idle' | 'walk' | 'attack' | 'dance' | 'skill'>('idle');
  const actionTimer = useRef<number>(0);

  // Particle, Projectile, Enemy management
  const particles = useRef<Particle[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const damagePops = useRef<DamagePop[]>([]);

  // Expanding ring info for the Skill
  const energyRings = useRef<{ x: number; y: number; r: number; maxR: number; active: boolean; color: string }[]>([]);

  // Active hitboxes (for the punch)
  const hitboxes = useRef<{ x: number; y: number; w: number; h: number; life: number; maxLife: number; active: boolean }[]>([]);

  // Camera tracking
  const camera = useRef({ x: 1200, y: 1200, targetX: 1200, targetY: 1200 });

  // Map limits based on 50x50 tiles
  const MAP_TILES = 50;
  const mapWidth = MAP_TILES * tileSize;
  const mapHeight = MAP_TILES * tileSize;

  // Initialize Assets
  useEffect(() => {
    // 1. Load Player sprite
    const playerImg = new Image();
    playerImg.crossOrigin = 'anonymous';
    playerImg.referrerPolicy = 'no-referrer';
    playerImg.src = 'https://raw.githubusercontent.com/banyapon/banyapon.github.io/refs/heads/main/studio/images/player.png';
    playerImg.onload = () => {
      setPlayerLoaded(true);
      playerImgRef.current = playerImg;
    };
    playerImg.onerror = () => {
      console.warn('Failed to load player.png, using procedural player box');
      setPlayerLoaded(false);
    };

    // 2. Load Ground texture
    const groundImg = new Image();
    groundImg.crossOrigin = 'anonymous';
    groundImg.referrerPolicy = 'no-referrer';
    groundImg.src = 'https://res.cloudinary.com/dsucg33fv/image/upload/v1782439980/ground_d1kjrx.png';
    groundImg.onload = () => {
      setGroundLoaded(true);
      groundImgRef.current = groundImg;
    };
    groundImg.onerror = () => {
      console.warn('Failed to load ground.png, using fallback colored grid');
      setGroundLoaded(false);
    };
  }, []);

  // Spawn initial enemies & dummies
  const spawnEnemies = () => {
    enemies.current = [];
    
    // Spawn static training dummies (great for combos!)
    for (let i = 0; i < 8; i++) {
      enemies.current.push({
        id: `dummy-${i}`,
        x: playerPos.current.x + (Math.random() - 0.5) * 800,
        y: playerPos.current.y + (Math.random() - 0.5) * 800,
        vx: 0,
        vy: 0,
        type: 'dummy',
        hp: 150,
        maxHp: 150,
        size: 40,
        color: '#d97706',
        speed: 0,
        state: 'idle',
        stateTimer: 0,
        facingLeft: Math.random() > 0.5,
      });
    }

    // Spawn walking slimes
    for (let i = 0; i < 15; i++) {
      enemies.current.push({
        id: `slime-${i}`,
        x: Math.random() * (mapWidth - 200) + 100,
        y: Math.random() * (mapHeight - 200) + 100,
        vx: 0,
        vy: 0,
        type: 'slime',
        hp: 80,
        maxHp: 80,
        size: 30,
        color: '#10b981',
        speed: 1.5,
        state: 'idle',
        stateTimer: 0,
        facingLeft: Math.random() > 0.5,
      });
    }

    // Spawn shadow spirits
    for (let i = 0; i < 8; i++) {
      enemies.current.push({
        id: `spirit-${i}`,
        x: Math.random() * (mapWidth - 200) + 100,
        y: Math.random() * (mapHeight - 200) + 100,
        vx: 0,
        vy: 0,
        type: 'spirit',
        hp: 100,
        maxHp: 100,
        size: 35,
        color: '#8b5cf6',
        speed: 2.2,
        state: 'idle',
        stateTimer: 0,
        facingLeft: Math.random() > 0.5,
      });
    }
  };

  // Run initial spawn
  useEffect(() => {
    spawnEnemies();
    sound.playVictory(); // Satisfying entry fanfare
  }, [tileSize]);

  // Key Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Prevent scrolling defaults for arrows and space
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key)) {
        e.preventDefault();
      }

      // Check for immediate single-press events (like attacks/skills)
      if (key === bindings.attack) {
        triggerAttack();
      } else if (key === bindings.skill) {
        triggerSkill();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [bindings]);

  // Logic to trigger the Quick Punch (P) and Shoot Orange Fireballs (ลูกไฟสีส้ม)
  const triggerAttack = () => {
    if (playerActionState.current === 'attack') return; // Debounce action

    playerActionState.current = 'attack';
    actionTimer.current = 16; // 16 frames of attack animation
    playerAnimFrame.current = 0; // Reset frame to starting block

    // Sound effect (swift synth swoosh!)
    sound.playPunch();

    // Determine attack coordinates
    const reach = 85;
    const boxWidth = 90;
    const boxHeight = 100;
    const pX = playerPos.current.x;
    const pY = playerPos.current.y;

    const hX = playerFacingLeft.current ? pX - reach - boxWidth/2 : pX + reach - boxWidth/2;
    const hY = pY - boxHeight / 2;

    // Create physical Hitbox
    hitboxes.current.push({
      x: hX,
      y: hY,
      w: boxWidth,
      h: boxHeight,
      life: 8,
      maxLife: 8,
      active: true,
    });

    // Spawn impact swing sparks
    for (let i = 0; i < 8; i++) {
      particles.current.push({
        id: Math.random().toString(),
        x: pX + (playerFacingLeft.current ? -40 : 40),
        y: pY + (Math.random() - 0.5) * 60,
        vx: (playerFacingLeft.current ? -1 : 1) * (Math.random() * 4 + 3),
        vy: (Math.random() - 0.5) * 4,
        color: `hsl(${Math.random() * 20 + 20}, 100%, 60%)`, // Flame fire colors
        size: Math.random() * 6 + 3,
        life: 20,
        maxLife: 20,
        alpha: 1,
        type: 'hit',
      });
    }

    // "เปลี่ยนจากยกเป็น ปล่อยพลัง ซ้ายขวาตรงๆ ลูกไฟสีส้ม"
    // Shoot an orange fireball projectile straight left/right!
    sound.playFireball();
    const fireSpeed = 11;
    const fVx = playerFacingLeft.current ? -fireSpeed : fireSpeed;
    
    projectiles.current.push({
      id: Math.random().toString(),
      x: pX + (playerFacingLeft.current ? -40 : 40),
      y: pY - 5, // slightly offset to match shoulder height
      vx: fVx,
      vy: 0, // Fly straight horizontally
      size: 16,
      color: '#f97316', // Glowing orange
      damage: 45,
      angle: playerFacingLeft.current ? Math.PI : 0,
      life: 120, // max active lifetime frames
      maxLife: 120,
    });
  };

  // Logic to trigger the Energy Burst Skill (O)
  const triggerSkill = () => {
    // Check if player has enough Energy (uses 30 energy)
    if (playerEnergy < 30) {
      // Spawn failing blue fizzles to signal empty energy
      for (let i = 0; i < 5; i++) {
        particles.current.push({
          id: Math.random().toString(),
          x: playerPos.current.x,
          y: playerPos.current.y - 20,
          vx: (Math.random() - 0.5) * 3,
          vy: -Math.random() * 3,
          color: '#3b82f6',
          size: Math.random() * 3 + 2,
          life: 15,
          maxLife: 15,
          alpha: 1,
        });
      }
      return;
    }

    // Deduct Energy
    setPlayerEnergy((prev) => Math.max(0, prev - 30));

    playerActionState.current = 'skill';
    actionTimer.current = 30; // Channelling stance for skill duration
    playerAnimFrame.current = 0;

    // Play synthesized Energy blast audio!
    sound.playEnergyBurst();

    // Create an expanding energy ring
    energyRings.current.push({
      x: playerPos.current.x,
      y: playerPos.current.y,
      r: 10,
      maxR: 240, // Expands outward to 240 pixels
      active: true,
      color: '#f97316', // Rich flame orange ring
    });

    // Create a gorgeous shockwave particle bloom
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 16) {
      const spd = Math.random() * 5 + 4;
      particles.current.push({
        id: Math.random().toString(),
        x: playerPos.current.x,
        y: playerPos.current.y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: `hsl(${30 + Math.random() * 20}, 100%, 55%)`, // neon fire orange range
        size: Math.random() * 8 + 4,
        life: 40,
        maxLife: 40,
        alpha: 1,
        type: 'shockwave',
      });
    }
  };

  // Main game loop (State tracking, physics, collisions, rendering)
  useEffect(() => {
    let animationFrameId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler keeping drawing buffer crisp
    const handleResize = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    
    // Register ResizeObserver for container
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    handleResize();

    // Game loop ticks (runs up to 60fps)
    const update = () => {
      if (activeState !== 'PLAYING') return;

      // 1. Recover mana/energy over time (1.2 per frame tick)
      setPlayerEnergy((prev) => Math.min(100, prev + 0.3));

      // 2. Resolve movement input based on configured keys
      let dx = 0;
      let dy = 0;

      const bindingUp = bindings.up.toLowerCase();
      const bindingDown = bindings.down.toLowerCase();
      const bindingLeft = bindings.left.toLowerCase();
      const bindingRight = bindings.right.toLowerCase();
      const bindingDance = bindings.dance.toLowerCase();

      // Check bindings + standard secondary Arrow keys for flexibility
      if (keysPressed.current[bindingUp] || keysPressed.current['arrowup']) dy -= 1;
      if (keysPressed.current[bindingDown] || keysPressed.current['arrowdown']) dy += 1;
      if (keysPressed.current[bindingLeft] || keysPressed.current['arrowleft']) dx -= 1;
      if (keysPressed.current[bindingRight] || keysPressed.current['arrowright']) dx += 1;

      // Normalize diagonal vectors
      if (dx !== 0 && dy !== 0) {
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;
      }

      // Check current active stance
      if (playerActionState.current === 'attack' || playerActionState.current === 'skill') {
        // Slow down movement when executing attacks
        dx *= 0.25;
        dy *= 0.25;

        // Count down active frames
        actionTimer.current--;
        if (actionTimer.current <= 0) {
          playerActionState.current = 'idle';
        }
      } else if (keysPressed.current[bindingDance]) {
        // Play dance animation
        playerActionState.current = 'dance';
        dx = 0;
        dy = 0;
      } else if (dx !== 0 || dy !== 0) {
        playerActionState.current = 'walk';
      } else {
        playerActionState.current = 'idle';
      }

      // Record player facing direction
      if (dx < 0) playerFacingLeft.current = true;
      if (dx > 0) playerFacingLeft.current = false;

      // Apply movement speed and clamp to tiled map boundaries
      playerPos.current.x += dx * playerSpeed;
      playerPos.current.y += dy * playerSpeed;

      const playerBorders = 35; // margin boundary
      playerPos.current.x = Math.max(playerBorders, Math.min(mapWidth - playerBorders, playerPos.current.x));
      playerPos.current.y = Math.max(playerBorders, Math.min(mapHeight - playerBorders, playerPos.current.y));

      // 3. Advance player sprite sheet animation frames
      playerAnimTick.current++;

      // Set framing velocity based on action state (Attack/P is played faster!)
      let ticksPerFrame = 8;
      if (playerActionState.current === 'attack') {
        ticksPerFrame = 3; // "เล่น Animation ไวขึ้น" - advance attack frames much faster!
      } else if (playerActionState.current === 'skill') {
        ticksPerFrame = 5;
      } else if (playerActionState.current === 'idle') {
        ticksPerFrame = 12; // slow breathing
      }

      if (playerAnimTick.current >= ticksPerFrame) {
        playerAnimTick.current = 0;
        playerAnimFrame.current = (playerAnimFrame.current + 1) % 4; // Loop 4 frames
      }

      // 4. Update Projectiles (Orange Fireballs)
      for (let i = projectiles.current.length - 1; i >= 0; i--) {
        const proj = projectiles.current[i];
        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.life--;

        // Spawn beautiful floating orange ember trail behind the fireball!
        if (Math.random() > 0.3) {
          particles.current.push({
            id: Math.random().toString(),
            x: proj.x - proj.vx * 0.5,
            y: proj.y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5 - 0.8,
            color: '#f97316',
            size: Math.random() * 4 + 2,
            life: 25,
            maxLife: 25,
            alpha: 1,
          });
        }

        // Check map limits
        if (proj.life <= 0 || proj.x < 0 || proj.x > mapWidth || proj.y < 0 || proj.y > mapHeight) {
          projectiles.current.splice(i, 1);
          continue;
        }

        // Check hit against targets/enemies
        let hitSomething = false;
        for (let j = 0; j < enemies.current.length; j++) {
          const enemy = enemies.current[j];
          const dist = Math.hypot(proj.x - enemy.x, proj.y - enemy.y);
          if (dist < proj.size/2 + enemy.size/2) {
            // Apply damage and knockback
            damageEnemy(enemy, proj.damage, proj.vx * 0.15);
            hitSomething = true;
            break;
          }
        }

        if (hitSomething) {
          // Spawn little explosion cloud on impact
          for (let k = 0; k < 12; k++) {
            particles.current.push({
              id: Math.random().toString(),
              x: proj.x,
              y: proj.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              color: k % 2 === 0 ? '#ea580c' : '#f59e0b',
              size: Math.random() * 5 + 3,
              life: 30,
              maxLife: 30,
              alpha: 1,
            });
          }
          projectiles.current.splice(i, 1);
        }
      }

      // 5. Update expanding energy rings from skill
      for (let i = energyRings.current.length - 1; i >= 0; i--) {
        const ring = energyRings.current[i];
        ring.r += 7.5; // expand velocity

        // Trigger wave collisions against any surrounding enemies
        for (let j = 0; j < enemies.current.length; j++) {
          const enemy = enemies.current[j];
          const dist = Math.hypot(ring.x - enemy.x, ring.y - enemy.y);
          
          // If inside expanding boundary (give some tolerance)
          if (dist > ring.r - 20 && dist < ring.r + 20) {
            const angle = Math.atan2(enemy.y - ring.y, enemy.x - ring.x);
            // High knockback & moderate skill damage!
            const kX = Math.cos(angle) * 12;
            damageEnemy(enemy, 3, kX); // ticks multiple times as ring crosses, super fun!
          }
        }

        // Add edge spark particles
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          particles.current.push({
            id: Math.random().toString(),
            x: ring.x + Math.cos(a) * ring.r,
            y: ring.y + Math.sin(a) * ring.r,
            vx: Math.cos(a) * 1.5,
            vy: Math.sin(a) * 1.5,
            color: '#fbbf24',
            size: Math.random() * 4 + 2,
            life: 15,
            maxLife: 15,
            alpha: 1,
          });
        }

        if (ring.r >= ring.maxR) {
          energyRings.current.splice(i, 1);
        }
      }

      // 6. Update physical Hitboxes (the punch arc)
      for (let i = hitboxes.current.length - 1; i >= 0; i--) {
        const h = hitboxes.current[i];
        h.life--;

        // Check collide
        if (h.life > 0) {
          for (let j = 0; j < enemies.current.length; j++) {
            const enemy = enemies.current[j];
            if (
              enemy.x + enemy.size/2 > h.x &&
              enemy.x - enemy.size/2 < h.x + h.w &&
              enemy.y + enemy.size/2 > h.y &&
              enemy.y - enemy.size/2 < h.y + h.h
            ) {
              // Punch knockback
              const kb = playerFacingLeft.current ? -5 : 5;
              damageEnemy(enemy, 12, kb);
            }
          }
        } else {
          hitboxes.current.splice(i, 1);
        }
      }

      // 7. Update Enemies Behavior
      for (let i = enemies.current.length - 1; i >= 0; i--) {
        const enemy = enemies.current[i];
        
        // Handle physical decay/dying
        if (enemy.hp <= 0) {
          // Increment defeat
          setDefeatedCount((prev) => prev + 1);
          setScore((prev) => {
            const updated = prev + (enemy.type === 'spirit' ? 150 : enemy.type === 'slime' ? 80 : 30);
            if (updated > highScore) {
              onUpdateHighScore(updated);
            }
            return updated;
          });

          // Gold coins blast
          for (let k = 0; k < 12; k++) {
            particles.current.push({
              id: Math.random().toString(),
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 5,
              vy: -Math.random() * 5 - 2,
              color: '#fbbf24', // golden yellow stars
              size: Math.random() * 5 + 3,
              life: 35,
              maxLife: 35,
              alpha: 1,
              type: 'sparkle',
            });
          }

          enemies.current.splice(i, 1);

          // Auto respawn elsewhere to keep arena populated
          setTimeout(() => {
            if (activeState === 'PLAYING') {
              enemies.current.push({
                id: `enemy-respawn-${Math.random()}`,
                x: Math.random() * (mapWidth - 200) + 100,
                y: Math.random() * (mapHeight - 200) + 100,
                vx: 0,
                vy: 0,
                type: enemy.type,
                hp: enemy.maxHp,
                maxHp: enemy.maxHp,
                size: enemy.size,
                color: enemy.color,
                speed: enemy.speed,
                state: 'idle',
                stateTimer: 0,
                facingLeft: Math.random() > 0.5,
              });
            }
          }, 3500);

          continue;
        }

        // Apply knockback/velocity decay
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;
        enemy.vx *= 0.85;
        enemy.vy *= 0.85;

        // Keep enemies within bound box limits
        enemy.x = Math.max(enemy.size, Math.min(mapWidth - enemy.size, enemy.x));
        enemy.y = Math.max(enemy.size, Math.min(mapHeight - enemy.size, enemy.y));

        // AI States
        enemy.stateTimer--;
        if (enemy.stateTimer <= 0) {
          enemy.state = Math.random() > 0.3 ? 'chase' : 'idle';
          enemy.stateTimer = Math.random() * 120 + 60;
        }

        if (enemy.type !== 'dummy') {
          const distToPlayer = Math.hypot(playerPos.current.x - enemy.x, playerPos.current.y - enemy.y);
          
          if (enemy.state === 'chase' && distToPlayer < 600) {
            // Face and walk towards player
            const angle = Math.atan2(playerPos.current.y - enemy.y, playerPos.current.x - enemy.x);
            enemy.vx += Math.cos(angle) * enemy.speed * 0.15;
            enemy.vy += Math.sin(angle) * enemy.speed * 0.15;
            
            enemy.facingLeft = playerPos.current.x < enemy.x;
          }

          // Deal touch damage to player with cooldown
          if (distToPlayer < enemy.size/2 + 25) {
            // Apply slight damage to player if player not currently attacking
            if (Math.random() < 0.05 && playerActionState.current !== 'skill') {
              setPlayerHp((prev) => {
                const updated = Math.max(0, prev - (enemy.type === 'spirit' ? 2 : 1));
                if (updated === 0) {
                  // Game over trigger
                  setActiveState('GAME_OVER');
                }
                return updated;
              });

              // Push player back slightly
              const pAngle = Math.atan2(playerPos.current.y - enemy.y, playerPos.current.x - enemy.x);
              playerPos.current.x += Math.cos(pAngle) * 8;
              playerPos.current.y += Math.sin(pAngle) * 8;
            }
          }
        }
      }

      // 8. Update floating particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        p.alpha = Math.max(0, p.life / p.maxLife);

        if (p.life <= 0) {
          particles.current.splice(i, 1);
        }
      }

      // 9. Update Damage popup text
      for (let i = damagePops.current.length - 1; i >= 0; i--) {
        const pop = damagePops.current[i];
        pop.y -= 1.2; // float up
        pop.life--;
        if (pop.life <= 0) {
          damagePops.current.splice(i, 1);
        }
      }

      // 10. Update Camera to smoothly lerp target player center
      const targetCamX = playerPos.current.x - canvas.width / 2;
      const targetCamY = playerPos.current.y - canvas.height / 2;

      // Keep camera inside map boundaries
      camera.current.targetX = Math.max(0, Math.min(mapWidth - canvas.width, targetCamX));
      camera.current.targetY = Math.max(0, Math.min(mapHeight - canvas.height, targetCamY));

      // LERP camera
      camera.current.x += (camera.current.targetX - camera.current.x) * 0.12;
      camera.current.y += (camera.current.targetY - camera.current.y) * 0.12;

      // 11. Render Frame
      drawGame(ctx, canvas.width, canvas.height);

      animationFrameId = requestAnimationFrame(update);
    };

    // Helper to register hit damage on enemies
    const damageEnemy = (enemy: Enemy, amount: number, knockbackX: number) => {
      // Avoid hitting dead enemies
      if (enemy.hp <= 0) return;

      enemy.hp = Math.max(0, enemy.hp - amount);
      enemy.vx += knockbackX;
      enemy.vy += (Math.random() - 0.5) * 4;

      // Add combo
      setCombo((prev) => prev + 1);

      // Play synthesized audio
      sound.playEnemyHit();

      // Spawn pop numbers
      const isCritical = amount > 15 || Math.random() > 0.8;
      const displayDamage = isCritical ? Math.floor(amount * 1.5) : Math.floor(amount);
      const popColor = isCritical ? '#f59e0b' : '#ef4444';
      
      damagePops.current.push({
        id: Math.random().toString(),
        x: enemy.x,
        y: enemy.y - enemy.size,
        text: isCritical ? `💥 CRIT! ${displayDamage}` : `-${displayDamage}`,
        color: popColor,
        life: 45,
        maxLife: 45,
      });

      // Spawn bright splash debris
      for (let k = 0; k < 6; k++) {
        particles.current.push({
          id: Math.random().toString(),
          x: enemy.x,
          y: enemy.y,
          vx: knockbackX * 0.3 + (Math.random() - 0.5) * 4,
          vy: -Math.random() * 4 - 1,
          color: enemy.color,
          size: Math.random() * 4 + 2,
          life: 25,
          maxLife: 25,
          alpha: 1,
        });
      }
    };

    // Main Draw Function
    const drawGame = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      // Apply Camera Offset
      ctx.translate(-camera.current.x, -camera.current.y);

      // --- A. Draw Tiled Ground Plane ---
      const startTileX = Math.floor(camera.current.x / tileSize);
      const endTileX = Math.ceil((camera.current.x + w) / tileSize);
      const startTileY = Math.floor(camera.current.y / tileSize);
      const endTileY = Math.ceil((camera.current.y + h) / tileSize);

      const clampStartX = Math.max(0, startTileX);
      const clampEndX = Math.min(MAP_TILES, endTileX);
      const clampStartY = Math.max(0, startTileY);
      const clampEndY = Math.min(MAP_TILES, endTileY);

      // Load image pattern if ground is loaded, otherwise use retro checkerboard grid
      if (groundLoaded && groundImgRef.current) {
        for (let tx = clampStartX; tx < clampEndX; tx++) {
          for (let ty = clampStartY; ty < clampEndY; ty++) {
            ctx.drawImage(
              groundImgRef.current,
              tx * tileSize,
              ty * tileSize,
              tileSize,
              tileSize
            );
          }
        }
      } else {
        // Fallback beautiful dark grid line checker
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let tx = clampStartX; tx <= clampEndX; tx++) {
          ctx.beginPath();
          ctx.moveTo(tx * tileSize, clampStartY * tileSize);
          ctx.lineTo(tx * tileSize, clampEndY * tileSize);
          ctx.stroke();
        }
        for (let ty = clampStartY; ty <= clampEndY; ty++) {
          ctx.beginPath();
          ctx.moveTo(clampStartX * tileSize, ty * tileSize);
          ctx.lineTo(clampEndX * tileSize, ty * tileSize);
          ctx.stroke();
        }
      }

      // Draw outer world borders
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, mapWidth, mapHeight);

      // --- B. Draw Shadows of Entities ---
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      // Player shadow
      ctx.beginPath();
      ctx.ellipse(playerPos.current.x, playerPos.current.y + 25, 25, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Enemies shadows
      enemies.current.forEach((enemy) => {
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y + enemy.size / 2 - 2, enemy.size * 0.6, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- C. Draw Enemies/Dummies ---
      enemies.current.forEach((enemy) => {
        ctx.save();
        
        if (enemy.type === 'dummy') {
          // Draw stationary training log dummy
          ctx.fillStyle = enemy.color;
          ctx.fillRect(enemy.x - 16, enemy.y - 30, 32, 60);
          
          // Straw binding bands
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(enemy.x - 16, enemy.y - 15, 32, 6);
          ctx.fillRect(enemy.x - 16, enemy.y + 10, 32, 6);

          // Head cross bandage
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(enemy.x - 8, enemy.y - 24);
          ctx.lineTo(enemy.x + 8, enemy.y - 12);
          ctx.moveTo(enemy.x + 8, enemy.y - 24);
          ctx.lineTo(enemy.x - 8, enemy.y - 12);
          ctx.stroke();
        } else if (enemy.type === 'slime') {
          // Draw bouncing cute green slimes
          const bounce = Math.abs(Math.sin(Date.now() / 250)) * 6;
          ctx.fillStyle = enemy.color;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y + 12 - bounce, enemy.size/2 + 2, Math.PI, 0, false);
          ctx.lineTo(enemy.x + enemy.size/2, enemy.y + 15);
          ctx.lineTo(enemy.x - enemy.size/2, enemy.y + 15);
          ctx.closePath();
          ctx.fill();

          // Cute tiny face
          ctx.fillStyle = '#064e3b';
          const faceDir = enemy.facingLeft ? -4 : 4;
          ctx.fillRect(enemy.x - 5 + faceDir, enemy.y + 2 - bounce, 3, 3);
          ctx.fillRect(enemy.x + 2 + faceDir, enemy.y + 2 - bounce, 3, 3);
        } else {
          // Draw hovering dark spirits
          const float = Math.sin(Date.now() / 180) * 8;
          // Glowing back radial gradients
          const glow = ctx.createRadialGradient(enemy.x, enemy.y + float, 5, enemy.x, enemy.y + float, enemy.size);
          glow.addColorStop(0, '#a78bfa');
          glow.addColorStop(1, 'rgba(139, 92, 246, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y + float, enemy.size, 0, Math.PI*2);
          ctx.fill();

          // Spirit core
          ctx.fillStyle = '#7c3aed';
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y + float, 12, 0, Math.PI*2);
          ctx.fill();

          // White eyes
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(enemy.x - 5, enemy.y - 3 + float, 3, 3);
          ctx.fillRect(enemy.x + 2, enemy.y - 3 + float, 3, 3);
        }

        // Draw Health/HP tiny overhead bar
        if (enemy.hp < enemy.maxHp) {
          const barW = 40;
          const barH = 4.5;
          const barY = enemy.y - enemy.size - 10;
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(enemy.x - barW/2, barY, barW, barH);
          ctx.fillStyle = '#10b981';
          ctx.fillRect(enemy.x - barW/2, barY, barW * (enemy.hp / enemy.maxHp), barH);
        }

        ctx.restore();
      });

      // --- D. Draw Player ---
      ctx.save();
      const pX = playerPos.current.x;
      const pY = playerPos.current.y;

      // Define row corresponding to current state
      // Row 0: Idle (ยืนนิ่งๆ)
      // Row 1: Walk (เดิน)
      // Row 2: Attack (โจมตี)
      // Row 3: Dance (เต้น)
      let currentRow = 0;
      if (playerActionState.current === 'walk') {
        currentRow = 1;
      } else if (playerActionState.current === 'attack') {
        currentRow = 2;
      } else if (playerActionState.current === 'dance') {
        currentRow = 3;
      } else if (playerActionState.current === 'skill') {
        // Skill uses either attack frame or dance frame beautifully
        currentRow = 2;
      }

      const pSize = 120; // Player visually scaling size for better fit on 64px ground
      const drawX = pX - pSize / 2;
      const drawY = pY - pSize / 2 - 10; // offset a bit upwards

      if (playerLoaded && playerImgRef.current) {
        // Source sprite box is exactly 256x256
        const sx = playerAnimFrame.current * 256;
        const sy = currentRow * 256;

        ctx.save();
        if (playerFacingLeft.current) {
          // Mirror horizontally
          ctx.translate(drawX + pSize / 2, drawY + pSize / 2);
          ctx.scale(-1, 1);
          ctx.drawImage(
            playerImgRef.current,
            sx,
            sy,
            256,
            256,
            -pSize / 2,
            -pSize / 2,
            pSize,
            pSize
          );
        } else {
          ctx.drawImage(
            playerImgRef.current,
            sx,
            sy,
            256,
            256,
            drawX,
            drawY,
            pSize,
            pSize
          );
        }
        ctx.restore();
      } else {
        // Fallback procedural visual player (if sprite fails or loading)
        ctx.fillStyle = '#f97316';
        ctx.fillRect(pX - 20, pY - 45, 40, 60);
        // Face visor
        ctx.fillStyle = '#1e293b';
        const lookDir = playerFacingLeft.current ? -12 : 6;
        ctx.fillRect(pX + lookDir, pY - 35, 8, 12);
      }

      // --- E. Draw Hitboxes (Swift Punch visuals) ---
      hitboxes.current.forEach((h) => {
        if (h.active) {
          ctx.fillStyle = 'rgba(234, 88, 12, 0.12)';
          ctx.strokeStyle = 'rgba(234, 88, 12, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(h.x, h.y, h.w, h.h);
          ctx.fillRect(h.x, h.y, h.w, h.h);
        }
      });

      // --- F. Draw Expanding Rings (Skill: Energy burst) ---
      energyRings.current.forEach((ring) => {
        // Outward neon circular ripple
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 5 * (1 - ring.r / ring.maxR) + 1.5;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner translucent circular glow fill
        ctx.fillStyle = 'rgba(249, 115, 22, 0.04)';
        ctx.fill();
      });

      // --- G. Draw Fireball Projectiles ---
      projectiles.current.forEach((proj) => {
        const glowRad = proj.size * 1.8;
        const radialGlow = ctx.createRadialGradient(proj.x, proj.y, 2, proj.x, proj.y, glowRad);
        radialGlow.addColorStop(0, '#fffbeb');
        radialGlow.addColorStop(0.3, '#f59e0b');
        radialGlow.addColorStop(0.7, '#ea580c');
        radialGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');

        ctx.fillStyle = radialGlow;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, glowRad, 0, Math.PI*2);
        ctx.fill();
      });

      // --- H. Draw Particles ---
      particles.current.forEach((p) => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        
        ctx.beginPath();
        if (p.type === 'sparkle') {
          // Draw star/diamond shape
          ctx.moveTo(p.x, p.y - p.size);
          ctx.lineTo(p.x + p.size/2, p.y);
          ctx.lineTo(p.x, p.y + p.size);
          ctx.lineTo(p.x - p.size/2, p.y);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      });

      // --- I. Draw Damage Pops ---
      damagePops.current.forEach((pop) => {
        ctx.fillStyle = pop.color;
        ctx.font = 'bold 13px "JetBrains Mono", Courier, monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(pop.text, pop.x, pop.y);
        ctx.shadowBlur = 0; // reset
      });

      ctx.restore(); // Undo Camera offset translation
    };

    // Spawn loop
    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [groundLoaded, playerLoaded, activeState, tileSize, playerSpeed, highScore]);

  // Combo decay tracker
  useEffect(() => {
    if (combo > 0) {
      const interval = setInterval(() => {
        setCombo((prev) => {
          if (prev <= 1) return 0;
          return prev - 1; // gradual decay
        });
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [combo]);

  const handleRestart = () => {
    sound.playClick();
    setScore(0);
    setPlayerHp(100);
    setPlayerEnergy(100);
    setCombo(0);
    setDefeatedCount(0);
    playerPos.current = { x: 1600, y: 1600 };
    spawnEnemies();
    setActiveState('PLAYING');
  };

  const handleMainMenu = () => {
    sound.playClick();
    onSetState('START_MENU');
  };

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-neutral-950 overflow-hidden select-none">
      
      {/* Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 block w-full h-full" />

      {/* TOP HEADS-UP HUD (Gamer dashboard overlay) */}
      <div className="absolute top-4 inset-x-4 z-10 flex flex-col gap-2 pointer-events-none">
        
        {/* Row 1: Player Bars & Score */}
        <div className="flex justify-between items-start gap-4 w-full">
          {/* Life and Energy gauges */}
          <div className="flex flex-col gap-2 max-w-xs w-full bg-neutral-900/90 border border-neutral-800/80 p-3 rounded-2xl shadow-2xl backdrop-blur">
            
            {/* HP Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold text-neutral-400">
                <span className="flex items-center gap-1.5 uppercase">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  Player HP
                </span>
                <span className="text-red-400 font-bold">{Math.floor(playerHp)}%</span>
              </div>
              <div className="w-full h-3 bg-neutral-950 rounded-md overflow-hidden p-0.5 border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded transition-all duration-150 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                  style={{ width: `${playerHp}%` }}
                />
              </div>
            </div>

            {/* Energy Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[10px] font-mono tracking-wider font-bold text-neutral-400">
                <span className="flex items-center gap-1.5 uppercase">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                  Energy (Skill O)
                </span>
                <span className="text-cyan-400 font-bold">{Math.floor(playerEnergy)}/100</span>
              </div>
              <div className="w-full h-3 bg-neutral-950 rounded-md overflow-hidden p-0.5 border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-600 to-sky-400 rounded transition-all duration-150 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  style={{ width: `${playerEnergy}%` }}
                />
              </div>
            </div>
          </div>

          {/* Score & Combo */}
          <div className="flex items-center gap-3">
            {/* Combo notification */}
            {combo > 2 && (
              <div className="flex flex-col items-center justify-center bg-gradient-to-r from-orange-600 to-amber-500 border border-orange-400 px-4 py-1.5 rounded-xl shadow-lg scale-105 animate-bounce">
                <span className="text-[10px] font-mono font-black text-white/80 uppercase tracking-widest leading-none">Combo</span>
                <span className="text-lg font-mono font-black text-white leading-none">{combo}x</span>
              </div>
            )}

            {/* Score box */}
            <div className="bg-neutral-900/90 border border-neutral-800/80 p-3 rounded-2xl shadow-2xl backdrop-blur flex flex-col text-right items-end min-w-36">
              <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wider">Score</span>
              <span className="text-xl font-mono font-black text-amber-400 tracking-tight">{score}</span>
              <span className="text-[9px] font-mono text-neutral-400 mt-0.5">High Score: {highScore}</span>
            </div>
          </div>
        </div>

        {/* Row 2: Status overview */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-neutral-900/85 border border-neutral-850 px-3 py-1 rounded-full text-xs text-neutral-400 backdrop-blur font-mono">
            <Swords className="w-3.5 h-3.5 text-orange-500" />
            <span>Defeated:</span>
            <strong className="text-neutral-200 font-bold">{defeatedCount}</strong>
          </div>

          <div className="flex gap-2">
            <div className="bg-neutral-900/85 border border-neutral-850 px-3 py-1 rounded-full text-xs text-neutral-400 backdrop-blur font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping"></span>
              <span>P: Fireball Shoot</span>
            </div>
            <div className="bg-neutral-900/85 border border-neutral-850 px-3 py-1 rounded-full text-xs text-neutral-400 backdrop-blur font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              <span>O: Radial Burst</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORNER HUD ELEMENTS (Bottom-right MiniMap & controls helper) */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-3 items-end pointer-events-none">
        {/* Simple interactive game map minimap */}
        <div className="bg-neutral-900/95 border border-neutral-800 p-2 rounded-xl shadow-2xl backdrop-blur flex flex-col items-center">
          <span className="text-[9px] font-mono font-bold text-neutral-500 uppercase mb-1 flex items-center gap-1">
            <Compass className="w-3 h-3 text-neutral-400" />
            Map Radar
          </span>
          {/* Render scaled map grid */}
          <div className="relative w-28 h-28 bg-neutral-950 border border-neutral-850 rounded overflow-hidden">
            {/* Player spot */}
            <div
              className="absolute w-2 h-2 rounded-full bg-amber-400 border border-white shadow-[0_0_4px_#fbbf24] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-75"
              style={{
                left: `${(playerPos.current.x / mapWidth) * 100}%`,
                top: `${(playerPos.current.y / mapHeight) * 100}%`,
              }}
            />

            {/* Enemy spots */}
            {enemies.current.map((enemy, idx) => (
              <div
                key={enemy.id || idx}
                className="absolute w-1 h-1 rounded-full bg-red-500 transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(enemy.x / mapWidth) * 100}%`,
                  top: `${(enemy.y / mapHeight) * 100}%`,
                }}
              />
            ))}
          </div>
          <span className="text-[8px] font-mono text-neutral-500 mt-1">Grid Plane: 50x50 Tiles</span>
        </div>
      </div>

      {/* TOP-RIGHT CONTROLLER PAUSE / OPTIONS BUTTON */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => {
            sound.playClick();
            onSetState('OPTIONS');
          }}
          className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white p-2.5 rounded-xl border border-neutral-800 backdrop-blur transition-all cursor-pointer shadow-lg"
          title="Adjust Controls"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={handleMainMenu}
          className="bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white px-3.5 py-2 rounded-xl border border-neutral-800 backdrop-blur transition-all cursor-pointer shadow-lg text-xs font-mono font-bold flex items-center gap-2"
        >
          MENU
        </button>
      </div>

      {/* INNER VIEWPORT GAME OVER SCREEN OVERLAY */}
      {activeState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-30 bg-black/85 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm animate-fade-in">
          <Award className="w-16 h-16 text-red-500 mb-2 animate-bounce" />
          <h2 className="text-3xl font-black text-red-500 tracking-tight uppercase">Defeat in Battle</h2>
          <p className="text-neutral-400 text-sm max-w-sm mt-2">
            Your Health was completely depleted by the Arena creatures. Try again to push your limits!
          </p>

          <div className="mt-6 p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col gap-2 min-w-64">
            <div className="flex justify-between text-xs text-neutral-500 border-b border-neutral-850 pb-1.5">
              <span>Final Score:</span>
              <strong className="text-amber-400 font-mono text-sm">{score}</strong>
            </div>
            <div className="flex justify-between text-xs text-neutral-500 pb-1">
              <span>Enemies Banished:</span>
              <strong className="text-neutral-200 font-mono">{defeatedCount}</strong>
            </div>
          </div>

          <div className="flex gap-3.5 mt-8 w-full max-w-sm">
            <button
              onClick={handleMainMenu}
              className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-semibold py-3 px-4 rounded-xl border border-neutral-800 cursor-pointer text-xs"
            >
              Main Menu
            </button>
            <button
              onClick={handleRestart}
              className="flex-1 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold py-3 px-4 rounded-xl cursor-pointer text-xs shadow-[0_4px_12px_rgba(249,115,22,0.3)]"
            >
              Restart Battle
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
