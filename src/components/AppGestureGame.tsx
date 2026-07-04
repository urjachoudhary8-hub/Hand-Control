import React, { useEffect, useRef, useState } from 'react';
import { HandData } from '../types';
import { Shield, Play, RotateCcw, Heart, Trophy, Zap, Radio } from 'lucide-react';

interface AppGestureGameProps {
  hand: HandData;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
}

interface GameObject {
  id: number;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  speed: number;
  type: 'core' | 'comet'; // core: +score, comet: -health
  size: number;
}

export default function AppGestureGame({ hand, addLog }: AppGestureGameProps) {
  const [gameState, setGameState] = useState<'lobby' | 'playing' | 'gameover'>('lobby');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [health, setHealth] = useState(5); // Lives count
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [particle, setParticle] = useState<{ x: number; y: number; color: string; duration: number } | null>(null);

  const [objects, setObjects] = useState<GameObject[]>([]);
  const gameLoopRef = useRef<number | null>(null);
  const objectIdCounter = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Read high score on mount
  useEffect(() => {
    const saved = localStorage.getItem('handos_deflector_highscore');
    if (saved) {
      setHighScore(parseInt(saved));
    }
  }, []);

  // Web Audio Context Synthesizer for Retro Beeps
  const playRetroSound = (type: 'bounce' | 'damage' | 'over') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'bounce') {
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4 note
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1); // Slide up
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // Low note
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25); // Slide down
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'over') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
        osc.start();
        osc.stop(ctx.currentTime + 0.7);
      }
    } catch (e) {
      // Ignored if browser policy blocks sound before user clicks
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setHealth(5);
    setSpeedMultiplier(1);
    setObjects([]);
    objectIdCounter.current = 0;
    addLog('Celestial laser grids activated. Move hand to deflect power cores!', 'success');
  };

  // Main game ticks loop
  useEffect(() => {
    if (gameState !== 'playing') {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
      return;
    }

    let lastSpawn = Date.now();
    let spawnRate = 1800; // ms

    const tick = () => {
      // 1. Move Falling Objects down
      setObjects((prev) => {
        const nextObjects: GameObject[] = [];
        
        // Paddle position (clamped 0 - 100)
        // hand.x is normalized 0 to 1, reflect it nicely
        const paddleX = hand.x * 100;
        const paddleWidthY = 90; // Paddle sits near 90% vertical bound
        const paddleWidthHalf = 8.5; // Represents paddle collision horizontal size

        prev.forEach((obj) => {
          const nextY = obj.y + obj.speed * speedMultiplier;

          // Check lower boundaries
          if (nextY >= paddleWidthY - 2 && nextY <= paddleWidthY + 2) {
            // Check horizontal collision with laser shield paddle
            const xDist = Math.abs(obj.x - paddleX);
            if (xDist <= paddleWidthHalf) {
              // INTERCEPTED!
              if (obj.type === 'core') {
                setScore((s) => {
                  const newScore = s + 10;
                  // Increase speed as score builds up
                  if (newScore > 0 && newScore % 50 === 0) {
                    setSpeedMultiplier((m) => m + 0.15);
                  }
                  return newScore;
                });
                setParticle({ x: obj.x, y: paddleWidthY, color: '#10b981', duration: 15 });
                playRetroSound('bounce');
              } else {
                // Comets must be dodged: meeting them drains power
                setHealth((h) => {
                  const nextH = h - 1;
                  if (nextH <= 0) {
                    endTheGame();
                  }
                  return nextH;
                });
                setParticle({ x: obj.x, y: paddleWidthY, color: '#f43f5e', duration: 25 });
                playRetroSound('damage');
              }
              return; // Filter out this object (deflected)
            }
          }

          // Off-screen boundary checks
          if (nextY >= 100) {
            if (obj.type === 'core') {
              // Missed a vital core: small shields damage
              setHealth((h) => {
                const nextH = h - 1;
                if (nextH <= 0) {
                  endTheGame();
                }
                return nextH;
              });
              setParticle({ x: obj.x, y: 98, color: '#f59e0b', duration: 20 });
              playRetroSound('damage');
            }
            return; // Filter out
          }

          nextObjects.push({ ...obj, y: nextY });
        });

        return nextObjects;
      });

      // 2. Spawn Random Elements
      const curTime = Date.now();
      const adjustedSpawnRate = Math.max(900, spawnRate - score * 3);
      if (curTime - lastSpawn > adjustedSpawnRate) {
        const isCore = Math.random() > 0.35; // 65% spawn items are cores, 35% comets
        const newObj: GameObject = {
          id: objectIdCounter.current++,
          x: 5 + Math.random() * 90,
          y: 0,
          speed: 1.1 + Math.random() * 0.9,
          type: isCore ? 'core' : 'comet',
          size: isCore ? 14 : 18
        };
        setObjects((o) => [...o, newObj]);
        lastSpawn = curTime;
      }

      // 3. Clear existing visual hit particles
      setParticle((p) => {
        if (!p) return null;
        if (p.duration <= 1) return null;
        return { ...p, duration: p.duration - 1 };
      });

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, score, speedMultiplier, hand.x]);

  const endTheGame = () => {
    setGameState('gameover');
    playRetroSound('over');
    addLog(`Reactor shut down. Final Score: ${score}`, 'warn');

    setHighScore((currentHigh) => {
      if (score > currentHigh) {
        localStorage.setItem('handos_deflector_highscore', score.toString());
        addLog(`Crowned New Defender Record is ${score}!`, 'success');
        return score;
      }
      return currentHigh;
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans p-4 relative justify-between overflow-hidden" ref={containerRef}>
      
      {/* HUD Header Dashboard */}
      <div className="flex justify-between items-center bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 shadow-sm z-10 font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Trophy className="text-amber-400" size={14} />
            <span className="text-3xs text-slate-500 uppercase">Records:</span>
            <span className="text-2xs font-semibold text-amber-300">{highScore}</span>
          </div>
          <div className="flex items-center gap-1 border-l border-slate-800 pl-3">
            <Zap className="text-green-400" size={14} />
            <span className="text-3xs text-slate-500 uppercase">Energy:</span>
            <span className="text-2xs font-semibold text-green-300">{score}</span>
          </div>
        </div>

        {/* Reactor Health state hearts */}
        <div className="flex items-center gap-1">
          <span className="text-3xs text-slate-500 uppercase mr-1">Grid Integrities:</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <Heart 
              key={i} 
              size={11} 
              className={`transition-colors ${i < health ? 'text-rose-500 fill-rose-500' : 'text-slate-800 fill-slate-850'}`}
            />
          ))}
        </div>
      </div>

      {/* Primary Arcade Monitor Canvas */}
      <div className="flex-1 relative bg-slate-950 border border-slate-900 rounded-xl mt-3 overflow-hidden" id="arcade_monitor">
        
        {/* LOBBY WELCOME VIEW */}
        {gameState === 'lobby' && (
          <div className="absolute inset-0 flex flex-col justify-center items-center p-6 bg-radial from-slate-900 to-slate-950 select-none">
            <div className="w-12 h-12 bg-sky-950/50 border border-sky-500/30 rounded-full flex items-center justify-center mb-3 text-sky-400 animate-pulse">
              <Shield size={24} />
            </div>
            
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest font-mono text-center">
              Celestial Deflector
            </h3>
            
            <p className="text-xs text-slate-400 text-center max-w-xs mt-1.5 mb-6 leading-relaxed">
              Slide your deflector paddle with air-pointing gestures left and right to capture falling <span className="text-emerald-400 font-bold">Star Cores (+10pts)</span> and shield the system from hazardous red <span className="text-rose-450 font-bold">Asteroids (-1 Health)</span>!
            </p>

            <button
              onClick={startGame}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-mono rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-sky-950 border border-sky-400/30 cursor-pointer hover:scale-105 transition-all"
            >
              <Play size={13} fill="currentColor" />
              Power Up Grids
            </button>
          </div>
        )}

        {/* ACTIVE ARCADES PLAY AREA */}
        {gameState === 'playing' && (
          <div className="w-full h-full relative" id="game_arena">
            
            {/* Grid Matrix retro lines backdrop */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.1)_1px,transparent_1px)] bg-[size:24px_24px] opacity-25 pointer-events-none" />

            {/* Falling entities */}
            {objects.map((obj) => (
              <div
                key={obj.id}
                className="absolute flex items-center justify-center transition-all duration-75 pointer-events-none"
                style={{
                  left: `${obj.x}%`,
                  top: `${obj.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${obj.size}px`,
                  height: `${obj.size}px`
                }}
              >
                {obj.type === 'core' ? (
                  /* Glowing Star Cores (Collectibles) */
                  <div className="relative w-full h-full">
                    <div className="absolute inset-x-0 inset-y-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
                    <div className="w-3 h-3 bg-emerald-400 rounded-full border border-white flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  </div>
                ) : (
                  /* Menacing Comets (Hazards) */
                  <div className="relative w-full h-full rotate-45">
                    <div className="absolute inset-0 bg-red-650 opacity-40 blur-xs rounded-sm animate-pulse" />
                    <div className="w-4.5 h-4.5 bg-rose-500 border border-amber-500 rounded-sm shadow-lg shadow-red-900" />
                  </div>
                )}
              </div>
            ))}

            {/* Particle Collision explosion clouds */}
            {particle && (
              <div 
                className="absolute w-20 h-20 rounded-full mix-blend-screen pointer-events-none transition-opacity duration-300 flex items-center justify-center"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle, ${particle.color}40 0%, transparent 70%)`
                }}
              >
                <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: particle.color }} />
              </div>
            )}

            {/* Shield Laser Paddle (Guided dynamically by hand's X percentage) */}
            <div
              className={`absolute bottom-[10%] h-3 w-[17%] -translate-x-1/2 transition-all duration-100 flex items-center justify-center z-20`}
              style={{ left: `${hand.x * 100}%` }}
              id="laser_shield_paddle"
            >
              {/* Retro metallic grid block paddle */}
              <div className="w-full h-full bg-cyan-400 rounded-md border border-white relative shadow-[0_0_12px_rgba(34,211,238,0.7)] flex justify-between px-0.5 items-center">
                <div className="w-1 h-1 bg-white rounded-full"></div>
                <div className="w-4 h-0.5 bg-white/40 rounded"></div>
                <div className="w-1 h-1 bg-white rounded-full"></div>
              </div>
              <div className="absolute -bottom-2.5 text-[7px] font-mono font-bold text-cyan-300 tracking-widest uppercase text-center select-none whitespace-nowrap">
                DEFLECTOR SHIELD
              </div>
            </div>

            {/* Calibration visual pointer crosshair helper on top */}
            <div 
              className="absolute h-full w-0.5 border-l border-dashed border-sky-500/20 pointer-events-none top-0 -translate-x-1/2 shadow-inner"
              style={{ left: `${hand.x * 100}%` }}
            />

          </div>
        )}

        {/* GAMEOVER SHUTDOWN VIEW */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 flex flex-col justify-center items-center p-6 bg-slate-950 text-center select-none">
            <span className="text-3xs bg-red-950 text-red-300 font-mono font-bold px-2.5 py-1 mb-2 rounded-full border border-red-500/30 tracking-widest uppercase">
              GRID COLLAPSED
            </span>
            
            <h3 className="text-base font-bold text-slate-100 uppercase font-mono mb-1">
              Reactor Shutdown
            </h3>
            
            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-6">
              The shield defense grid sustained critical integrity damage and went offline. Power score harvested: <strong className="text-cyan-400 font-mono font-bold text-sm">+{score}</strong>.
            </p>

            <button
              onClick={startGame}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-705 cursor-pointer shadow-md transition-all"
            >
              <RotateCcw size={13} />
              Recharge Reactor
            </button>
          </div>
        )}

      </div>

      {/* Bottom instructional footer status lines */}
      <div className="mt-3 text-center pointer-events-none select-none">
        <span className="text-4xs text-slate-600 font-mono uppercase tracking-widest">
          {gameState === 'playing' ? 'Sensor: Tracking index finger horizontally' : 'Grid Calibrated via aero physics'}
        </span>
      </div>

    </div>
  );
}
