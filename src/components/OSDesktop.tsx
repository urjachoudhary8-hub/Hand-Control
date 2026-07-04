import React, { useState, useEffect, useRef } from 'react';
import { HandData, OSWindow, AppId, LaptopSettings, TelemetryLog } from '../types';
import { 
  Play, 
  Terminal, 
  Settings, 
  Volume2, 
  X, 
  Minus, 
  Square, 
  HelpCircle, 
  Paintbrush, 
  Gamepad2, 
  Music, 
  Keyboard as KeyIcon, 
  Sliders, 
  Monitor, 
  Clock, 
  CircleDot,
  Target,
  Scan,
  Sparkles
} from 'lucide-react';

// Sub App Component Imports
import AppGuide from './AppGuide';
import AppAirPaint from './AppAirPaint';
import AppGestureGame from './AppGestureGame';
import AppMediaHub from './AppMediaHub';
import AppVirtualKeyboard from './AppVirtualKeyboard';
import AppCalibration from './AppCalibration';
import AppFaceReader from './AppFaceReader';
import AppAiWorkspace from './AppAiWorkspace';

interface OSDesktopProps {
  hand: HandData;
  settings: LaptopSettings;
  updateSettings: (s: Partial<LaptopSettings>) => void;
  logs: TelemetryLog[];
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
  onHandUpdate: (data: HandData) => void;
}

const APP_METADATA: { [key in AppId]: { title: string; icon: any; color: string } } = {
  guide: { title: 'Gestures Academy', icon: HelpCircle, color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30' },
  airpaint: { title: 'Air Paint', icon: Paintbrush, color: 'text-pink-400 bg-pink-950/40 border-pink-500/30' },
  game: { title: 'Celestial Shield', icon: Gamepad2, color: 'text-amber-400 bg-amber-955/40 border-amber-500/30' },
  media: { title: 'Media Hub', icon: Music, color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' },
  keyboard: { title: 'Gesture Notepad', icon: KeyIcon, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' },
  settings: { title: 'Control Panel', icon: Sliders, color: 'text-slate-400 bg-slate-800/40 border-slate-705/30' },
  calibration: { title: 'Aero Calibrator', icon: Target, color: 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30' },
  faceread: { title: 'Aero Face Scanner', icon: Scan, color: 'text-[#00dfc1] bg-[#00dfc1]/10 border-[#00dfc1]/30' },
  aiworkspace: { title: 'Aero AI Workspace', icon: Sparkles, color: 'text-cyan-300 bg-cyan-950/40 border-cyan-500/30' }
};

// Subtly synthesized retro-futuristic sound triggers utilizing native Web Audio API
export const playAmbientSound = (type: 'click' | 'hover' | 'minimize' | 'maximize' | 'open' | 'close' | 'wave') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } else if (type === 'hover') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      gain.gain.setValueAtTime(0.005, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'minimize') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.22);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.24);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'maximize' || type === 'open') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } else if (type === 'close') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(400, ctx.currentTime);
      osc1.frequency.setValueAtTime(200, ctx.currentTime + 0.08);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(500, ctx.currentTime);
      osc2.frequency.setValueAtTime(250, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.21);
      osc2.stop(ctx.currentTime + 0.21);
    } else if (type === 'wave') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(240, ctx.currentTime + 0.12);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    }
  } catch (err) {
    console.warn('AudioContext trigger deferred:', err);
  }
};

export const getAccentClasses = (accent: string | undefined) => {
  switch (accent) {
    case 'pink':
      return {
        text: 'text-pink-400',
        textMuted: 'text-pink-300',
        border: 'border-pink-500/40',
        bg: 'bg-pink-600',
        bgHover: 'hover:bg-pink-500',
        bgMuted: 'bg-pink-950/20',
        glow: 'shadow-[0_0_15px_rgba(244,114,182,0.8)]',
        accentColorClass: 'pink',
        cursorBorder: 'border-pink-400 bg-pink-500/10 shadow-[0_0_12px_rgba(244,114,182,0.8)]',
        cursorCenter: 'bg-pink-350',
        startBtn: 'bg-pink-600 hover:bg-pink-500 border-pink-450/40 shadow-pink-950',
      };
    case 'emerald':
      return {
        text: 'text-emerald-400',
        textMuted: 'text-emerald-300',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-600',
        bgHover: 'hover:bg-emerald-500',
        bgMuted: 'bg-emerald-950/20',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.8)]',
        accentColorClass: 'emerald',
        cursorBorder: 'border-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.8)]',
        cursorCenter: 'bg-emerald-350',
        startBtn: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-450/40 shadow-emerald-950',
      };
    case 'amber':
      return {
        text: 'text-amber-400',
        textMuted: 'text-amber-300',
        border: 'border-amber-500/40',
        bg: 'bg-amber-600',
        bgHover: 'hover:bg-amber-500',
        bgMuted: 'bg-amber-950/20',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.8)]',
        accentColorClass: 'amber',
        cursorBorder: 'border-amber-400 bg-amber-500/10 shadow-[0_0_12px_rgba(245,158,11,0.8)]',
        cursorCenter: 'bg-amber-350',
        startBtn: 'bg-amber-600 hover:bg-amber-500 border-amber-450/40 shadow-amber-950',
      };
    case 'velvet':
      return {
        text: 'text-purple-400',
        textMuted: 'text-purple-300',
        border: 'border-purple-500/40',
        bg: 'bg-purple-600',
        bgHover: 'hover:bg-purple-500',
        bgMuted: 'bg-purple-950/20',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.8)]',
        accentColorClass: 'purple',
        cursorBorder: 'border-purple-400 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.8)]',
        cursorCenter: 'bg-purple-350',
        startBtn: 'bg-purple-600 hover:bg-purple-500 border-purple-450/40 shadow-purple-950',
      };
    case 'rose':
      return {
        text: 'text-rose-400',
        textMuted: 'text-rose-300',
        border: 'border-rose-500/40',
        bg: 'bg-rose-600',
        bgHover: 'hover:bg-rose-500',
        bgMuted: 'bg-rose-950/20',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.8)]',
        accentColorClass: 'rose',
        cursorBorder: 'border-rose-400 bg-rose-500/10 shadow-[0_0_12px_rgba(244,63,94,0.8)]',
        cursorCenter: 'bg-rose-350',
        startBtn: 'bg-rose-600 hover:bg-rose-500 border-rose-450/40 shadow-rose-950',
      };
    case 'cyan':
    default:
      return {
        text: 'text-cyan-400',
        textMuted: 'text-cyan-300',
        border: 'border-cyan-500/40',
        bg: 'bg-cyan-600',
        bgHover: 'hover:bg-cyan-550',
        bgMuted: 'bg-cyan-950/20',
        glow: 'shadow-[0_0_15px_rgba(6,182,212,0.8)]',
        accentColorClass: 'cyan',
        cursorBorder: 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.8)]',
        cursorCenter: 'bg-cyan-350',
        startBtn: 'bg-sky-600 hover:bg-sky-500 border-sky-450/40 shadow-sky-950',
      };
  }
};

export default function OSDesktop({
  hand,
  settings,
  updateSettings,
  logs,
  addLog,
  onHandUpdate
}: OSDesktopProps) {
  const [windows, setWindows] = useState<OSWindow[]>([
    { id: 'guide', title: 'Gestures Academy', icon: 'HelpCircle', isOpen: true, isMinimized: false, isMaximized: false, x: 12, y: 10, width: 320, height: 420, zIndex: 10 },
    { id: 'airpaint', title: 'Air Paint', icon: 'Paintbrush', isOpen: false, isMinimized: false, isMaximized: false, x: 25, y: 15, width: 440, height: 350, zIndex: 1 },
    { id: 'game', title: 'Celestial Shield', icon: 'Gamepad2', isOpen: false, isMinimized: false, isMaximized: false, x: 20, y: 20, width: 420, height: 380, zIndex: 1 },
    { id: 'media', title: 'Media Hub', icon: 'Music', isOpen: false, isMinimized: false, isMaximized: false, x: 30, y: 12, width: 440, height: 390, zIndex: 1 },
    { id: 'keyboard', title: 'Gesture Notepad', icon: 'Keyboard', isOpen: false, isMinimized: false, isMaximized: false, x: 22, y: 18, width: 400, height: 390, zIndex: 1 },
    { id: 'settings', title: 'Control Panel', icon: 'Sliders', isOpen: false, isMinimized: false, isMaximized: false, x: 35, y: 40, width: 330, height: 400, zIndex: 1 },
    { id: 'calibration', title: 'Aero Calibrator', icon: 'Target', isOpen: false, isMinimized: false, isMaximized: false, x: 28, y: 12, width: 470, height: 410, zIndex: 1 },
    { id: 'faceread', title: 'Aero Face Scanner', icon: 'Scan', isOpen: false, isMinimized: false, isMaximized: false, x: 20, y: 18, width: 480, height: 420, zIndex: 1 },
    { id: 'aiworkspace', title: 'Aero AI Workspace', icon: 'Sparkles', isOpen: false, isMinimized: false, isMaximized: false, x: 18, y: 16, width: 460, height: 430, zIndex: 1 }
  ]);

  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const accent = getAccentClasses(settings.accentColor);
  
  // Ref tracking window state holding/carrying
  const grabbedWindowId = useRef<AppId | null>(null);
  const grabOffset = useRef({ x: 0, y: 0 });
  const desktopRef = useRef<HTMLDivElement | null>(null);

  // Click simulation cooling
  const clickedElements = useRef<Set<any>>(new Set());
  const prevPinchState = useRef(false);

  // Synchronize System clock ticks (local time representation)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme Wallpaper mapping
  const getWallpaperStyle = () => {
    switch (settings.theme) {
      case 'cyberpunk':
        return 'bg-gradient-to-tr from-slate-950 via-purple-950/80 to-indigo-950 text-pink-400';
      case 'warm-oak':
        return 'bg-gradient-to-br from-amber-950/45 via-amber-900/30 to-slate-950 border-amber-800/10 text-amber-200';
      case 'polar':
        return 'bg-gradient-to-tr from-slate-100 via-sky-50 to-blue-100 text-slate-800';
      case 'slate':
      default:
        return 'bg-gradient-to-br from-slate-905 via-slate-950 to-slate-900 border-slate-800/50 text-sky-400';
    }
  };

  // Windows depth stacking order mechanism
  const focusWindow = (id: AppId) => {
    playAmbientSound('click');
    setWindows((prevWins) => {
      const highestZ = Math.max(...prevWins.map((w) => w.zIndex), 0);
      return prevWins.map((w) => {
        if (w.id === id) {
          return { ...w, isMinimized: false, zIndex: highestZ + 1 };
        }
        return w;
      });
    });
    setStartMenuOpen(false);
  };

  const closeWindow = (id: AppId) => {
    playAmbientSound('close');
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isOpen: false } : w)));
    addLog(`Dismantled active application process: ${APP_METADATA[id].title}`, 'warn');
  };

  const minimizeWindow = (id: AppId) => {
    playAmbientSound('minimize');
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMinimized: true } : w)));
    addLog(`Stashed window to taskbar stack: ${APP_METADATA[id].title}`, 'info');
  };

  const maximizeWindow = (id: AppId) => {
    playAmbientSound('maximize');
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w)));
  };

  const launchApp = (id: AppId) => {
    playAmbientSound('open');
    setWindows((prev) => prev.map((w) => (w.id === id ? { ...w, isOpen: true, isMinimized: false } : w)));
    focusWindow(id);
    addLog(`Launched virtual application: ${APP_METADATA[id].title}`, 'success');
  };

  // Wave swiping triggers: Wave locks can close windows
  useEffect(() => {
    if (hand.gesture === 'WAVE_LEFT') {
      playAmbientSound('wave');
      // Toggle Start Menu on wave swipe
      setStartMenuOpen((prev) => !prev);
      addLog('Start Menu toggled via horizontal system Wave sweeps', 'info');
    }
  }, [hand.gesture]);

  // Window Physical Dragging Module
  useEffect(() => {
    if (!desktopRef.current) return;

    const deskBounds = desktopRef.current.getBoundingClientRect();
    const handPX = hand.x * deskBounds.width;
    const handPY = hand.y * deskBounds.height;

    const activeGrab = hand.gesture === 'GRAB' || hand.isFist;

    if (activeGrab) {
      if (!grabbedWindowId.current) {
        // Find which Window titlebar contains the hand cursor
        // Sort by z-index descending to grab the top-most window under cursor first
        const sortedWins = [...windows]
          .filter((w) => w.isOpen && !w.isMinimized && !w.isMaximized)
          .sort((a, b) => b.zIndex - a.zIndex);

        for (const win of sortedWins) {
          // Window bounds mapped in pixels
          const winLeft = (win.x / 100) * deskBounds.width;
          const winTop = (win.y / 100) * deskBounds.height;
          const winRight = winLeft + win.width;
          const winHeaderBottom = winTop + 36; // 36px titlebar height

          if (
            handPX >= winLeft &&
            handPX <= winRight &&
            handPY >= winTop &&
            handPY <= winHeaderBottom
          ) {
            // MATCH! Lock this window for carrying
            grabbedWindowId.current = win.id;
            grabOffset.current = {
              x: handPX - winLeft,
              y: handPY - winTop
            };
            focusWindow(win.id);
            addLog(`Grip validated: Dragging window '${win.title}'`, 'active');
            break;
          }
        }
      } else {
        // Carrying window: track new laptop screen dimensions
        const winId = grabbedWindowId.current;
        setWindows((prevWins) =>
          prevWins.map((w) => {
            if (w.id === winId) {
              const targetPX = handPX - grabOffset.current.x;
              const targetPY = handPY - grabOffset.current.y;

              const nextXPercent = Math.max(0, Math.min(90, (targetPX / deskBounds.width) * 100));
              const nextYPercent = Math.max(0, Math.min(85, (targetPY / deskBounds.height) * 100));

              return {
                ...w,
                x: nextXPercent,
                y: nextYPercent
              };
            }
            return w;
          })
        );
      }
    } else {
      // Released fist grab
      if (grabbedWindowId.current) {
        addLog(`Grip released. Window docked.`, 'info');
      }
      grabbedWindowId.current = null;
    }
  }, [hand.x, hand.y, hand.gesture, hand.isFist]);

  // Click interaction detector inside Workspace (Tapping desktop icons or buttons)
  useEffect(() => {
    const isCurrentlyPinching = hand.isPinching || hand.gesture === 'PINCH_CLICK';

    if (isCurrentlyPinching && !prevPinchState.current) {
      if (!desktopRef.current) return;
      const deskBounds = desktopRef.current.getBoundingClientRect();
      const handWindowX = deskBounds.left + hand.x * deskBounds.width;
      const handWindowY = deskBounds.top + hand.y * deskBounds.height;

      // Find standard clickables manually by coordinate calculations (highly robust)
      const elementsUnder = document.elementsFromPoint(handWindowX, handWindowY);
      
      let clickActivated = false;
      let targetElement: HTMLElement | null = null;

      // Find the first matching interactive element under the cursor or its ancestor chain
      for (const el of elementsUnder) {
        let current: HTMLElement | null = el as HTMLElement;
        while (current && current !== desktopRef.current) {
          if (
            current.tagName === 'BUTTON' ||
            current.tagName === 'A' ||
            current.tagName === 'INPUT' ||
            current.tagName === 'SELECT' ||
            current.tagName === 'TEXTAREA' ||
            current.getAttribute('role') === 'button' ||
            current.id?.startsWith('launch_') ||
            current.id?.startsWith('preset_') ||
            current.id?.startsWith('click_pinch_') ||
            current.classList.contains('cursor-pointer') ||
            (current as any).onclick
          ) {
            targetElement = current;
            break;
          }
          current = current.parentElement;
        }
        if (targetElement) break;
      }

      // If no explicitly interactive element is found, default to the topmost element under the cursor to let standard handlers catch indeed
      if (!targetElement && elementsUnder.length > 0) {
        targetElement = elementsUnder[0] as HTMLElement;
      }

      if (targetElement) {
        // Trigger standard click method
        targetElement.click();
        
        // Also dispatch full native MouseEvent sequence to trigger complex React/custom event listeners
        const mouseEventOpts = {
          clientX: handWindowX,
          clientY: handWindowY,
          bubbles: true,
          cancelable: true,
          view: window,
        };
        targetElement.dispatchEvent(new MouseEvent('mousedown', mouseEventOpts));
        targetElement.dispatchEvent(new MouseEvent('mouseup', mouseEventOpts));
        
        clickActivated = true;
      }

      if (clickActivated) {
        // Quick visual hover feedback on cursor
        addLog('Pinch click lock executed.', 'success');
      }
    }

    prevPinchState.current = isCurrentlyPinching;
  }, [hand.isPinching, hand.gesture, hand.x, hand.y]);

  const activeWin = [...windows].filter(w => w.isOpen && !w.isMinimized).sort((a,b) => b.zIndex - a.zIndex)[0];
  const activeWindowId = activeWin ? activeWin.id : null;

  return (
    <div 
      className={`flex-1 flex flex-col h-full relative overflow-hidden select-none ${getWallpaperStyle()} transition-colors duration-500`}
      style={settings.customWallpaper ? { backgroundImage: `url(${settings.customWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}}
      ref={desktopRef}
      id="os_desktop_workspace"
    >
      
      {/* 1. PRIMARY DESKTOP WORKSPACE GRID */}
      <div className="flex-grow relative p-5 flex flex-col gap-3 items-start bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] overflow-hidden" id="desktop_grid_launchers">
        
        {/* Soft glowing ambient light points */}
        <div className={`absolute top-1/4 left-1/3 w-72 h-72 rounded-full blur-[100px] pointer-events-none opacity-20 transition-colors duration-500 ${
          settings.accentColor === 'cyan' ? 'bg-cyan-500/35' :
          settings.accentColor === 'pink' ? 'bg-pink-500/35' :
          settings.accentColor === 'emerald' ? 'bg-emerald-500/35' :
          settings.accentColor === 'amber' ? 'bg-amber-500/35' :
          settings.accentColor === 'velvet' ? 'bg-purple-500/35' :
          'bg-rose-500/35'
        }`} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

        {/* Neon lines design accents for space age interfaces */}
        <div className="absolute top-3 right-4 text-right select-none pointer-events-none opacity-20">
          <span className="text-[8px] font-mono tracking-widest text-slate-400 block">SYSTEM GRID MONITOR</span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-400 font-mono">GRID_MATRIX_ACTIVE</span>
        </div>

        {/* Desktop Launchers Grid - Aesthetic Bento Box Layout */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-6 p-2 z-10 max-w-full" id="apps_bento_launchers">
          {(Object.keys(APP_METADATA) as AppId[]).map((appId) => {
            const info = APP_METADATA[appId];
            const Icon = info.icon;
            
            return (
              <button
                key={appId}
                id={`launch_${appId}`}
                onClick={() => launchApp(appId)}
                onMouseEnter={() => playAmbientSound('hover')}
                className="group flex flex-col items-center justify-center p-2.5 w-[84px] h-[92px] rounded-2xl border border-transparent hover:border-white/10 hover:bg-white/5 hover:backdrop-blur-md cursor-pointer transition-all duration-200 text-center relative focus:outline-none focus:ring-1 focus:ring-white/10"
              >
                {/* Visual Glow Effect Behind Active/Hovered Icon */}
                <div className={`absolute -inset-1 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 group-focus:opacity-100 blur-md transition-opacity duration-300 pointer-events-none -z-10 bg-radial from-cyan-400/10 to-transparent`} />
                
                {/* Icon Cage with custom visual styling */}
                <div className="p-3 rounded-2xl bg-slate-950/45 border border-slate-800/60 shadow-inner group-hover:scale-108 group-hover:border-slate-700 transition-all duration-200 flex items-center justify-center mb-2">
                  <Icon size={18} className="text-slate-350 transition-colors group-hover:text-white" />
                </div>
                
                <span className="text-[10px] font-sans font-medium tracking-wide text-slate-300 group-hover:text-white line-clamp-2 leading-tight w-full max-h-[28px] overflow-hidden select-none transition-colors">
                  {info.title.replace('Aero ', '').replace('Gesture ', '')}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2. WINDOW MANAGER (DRAGGABLE APPLICATION LAYERS) */}
        {windows.map((win) => {
          if (!win.isOpen || win.isMinimized) return null;
          const AppIcon = APP_METADATA[win.id].icon;
          const isActive = win.id === activeWindowId;

          // Glowing border based on selected accent color for high-end look
          const activeBorderClass = isActive 
            ? `${accent.border} ${accent.glow} ring-1 ring-white/10` 
            : 'border-slate-800/80 shadow-md opacity-95 hover:opacity-100';

          return (
            <div
              key={win.id}
              className={`absolute bg-slate-900/95 backdrop-blur-md border rounded-2xl overflow-hidden flex flex-col transition-all duration-150 ${
                win.isMaximized 
                  ? 'inset-x-0 inset-y-0 !w-full !h-full !left-0 !top-0 z-40' 
                  : 'z-30'
              } ${activeBorderClass}`}
              style={{
                left: win.isMaximized ? '0' : `${win.x}%`,
                top: win.isMaximized ? '0' : `${win.y}%`,
                width: win.isMaximized ? '100%' : `${win.width}px`,
                height: win.isMaximized ? '100%' : `${win.height}px`,
                zIndex: win.zIndex
              }}
              onClick={() => focusWindow(win.id)}
            >
              
              {/* Draggable Titlebar (Header) with custom dots control design */}
              <div 
                className={`h-11 px-4 flex items-center justify-between border-b select-none flex-shrink-0 transition-colors duration-200 ${
                  isActive 
                    ? 'bg-slate-950/90 border-slate-800/80' 
                    : 'bg-slate-955/80 border-slate-900'
                } cursor-grab active:cursor-grabbing hover:bg-slate-900/30`}
                id={`titlebar_${win.id}`}
              >
                <div className="flex items-center gap-2.5">
                  <AppIcon size={14} className={isActive ? accent.text : 'text-slate-500'} />
                  <span className={`text-[11px] font-sans font-bold tracking-wider uppercase truncate max-w-[130px] sm:max-w-none transition-colors duration-200 ${
                    isActive ? 'text-slate-100' : 'text-slate-400'
                  }`}>
                    {win.title}
                  </span>
                  {isActive && (
                    <span className={`w-1.5 h-1.5 rounded-full ${accent.bg} animate-pulse shadow-[0_0_8px_currentColor]`} />
                  )}
                </div>
                
                {/* High-tech Window Control Dots */}
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id); }}
                    onMouseEnter={() => playAmbientSound('hover')}
                    className="w-3.5 h-3.5 rounded-full bg-amber-500/10 hover:bg-amber-500/35 border border-amber-500/30 flex items-center justify-center text-amber-400 transition-all cursor-pointer group"
                    title="Minimize"
                  >
                    <Minus size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); maximizeWindow(win.id); }}
                    onMouseEnter={() => playAmbientSound('hover')}
                    className="w-3.5 h-3.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/35 border border-emerald-500/30 flex items-center justify-center text-emerald-450 transition-all cursor-pointer hidden md:flex group"
                    title="Maximize"
                  >
                    <Square size={6} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); closeWindow(win.id); }}
                    onMouseEnter={() => playAmbientSound('hover')}
                    className="w-3.5 h-3.5 rounded-full bg-rose-500/10 hover:bg-rose-500/35 border border-rose-500/30 flex items-center justify-center text-rose-400 transition-all cursor-pointer group"
                    title="Close"
                  >
                    <X size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>

              {/* Application Body Mounts */}
              <div className="flex-grow overflow-hidden relative">
                {win.id === 'guide' && <AppGuide hand={hand} addLog={addLog} />}
                {win.id === 'airpaint' && <AppAirPaint hand={hand} addLog={addLog} />}
                {win.id === 'game' && <AppGestureGame hand={hand} addLog={addLog} />}
                {win.id === 'media' && (
                  <AppMediaHub 
                    hand={hand} 
                    volume={settings.volume} 
                    setVolume={(v) => updateSettings({ volume: v })} 
                    addLog={addLog} 
                  />
                )}
                {win.id === 'keyboard' && <AppVirtualKeyboard hand={hand} addLog={addLog} />}
                {win.id === 'calibration' && (
                  <AppCalibration 
                    hand={hand} 
                    settings={settings} 
                    updateSettings={updateSettings} 
                    addLog={addLog} 
                  />
                )}
                {win.id === 'faceread' && (
                  <AppFaceReader 
                    hand={hand} 
                    settings={settings} 
                    updateSettings={updateSettings} 
                    addLog={addLog} 
                    onHandUpdate={onHandUpdate}
                  />
                )}
                {win.id === 'aiworkspace' && (
                  <AppAiWorkspace 
                    settings={settings}
                    updateSettings={updateSettings}
                    addLog={addLog}
                    launchApp={launchApp}
                    changeTheme={(t) => updateSettings({ theme: t })}
                    changeVolume={(v) => updateSettings({ volume: v })}
                    onTypeNote={(text) => {
                      const event = new CustomEvent('aitype_note', { detail: { text } });
                      window.dispatchEvent(event);
                    }}
                  />
                )}
                {win.id === 'settings' && (
                  /* SYSTEM CONTROL PANEL WINDOW */
                  <div className="flex flex-col h-full bg-slate-900 text-slate-150 p-4 font-mono justify-between overflow-y-auto">
                    <div className="flex flex-col gap-4">
                      
                       {/* Theme Selection */}
                      <div className="flex flex-col gap-1.5 border-b border-slate-850 pb-3">
                        <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider">Visual Desktop Theme</span>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {(['slate', 'cyberpunk', 'warm-oak', 'polar'] as const).map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                updateSettings({ theme: t });
                                addLog(`Wallpaper landscape adapted: ${t}`, 'success');
                              }}
                              className={`p-2 rounded-lg border text-3xs font-bold text-center cursor-pointer transition-all ${
                                settings.theme === t 
                                  ? `bg-slate-950 ${accent.border} ${accent.text} shadow-sm` 
                                  : 'bg-slate-950 border-slate-900 hover:bg-slate-850 text-slate-450'
                              }`}
                            >
                              {t.replace('-', ' ').toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Accent Color Customizer (UI CX Upgrade) */}
                      <div className="flex flex-col gap-1.5 border-b border-slate-850 pb-3">
                        <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider">UI Color Experience (Accent)</span>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          {(['cyan', 'pink', 'emerald', 'amber', 'velvet', 'rose'] as const).map((col) => {
                            const mapCol = {
                              cyan: { bg: 'bg-cyan-500', name: 'CYAN', border: 'border-cyan-500' },
                              pink: { bg: 'bg-pink-500', name: 'PINK', border: 'border-pink-500' },
                              emerald: { bg: 'bg-emerald-500', name: 'EMERALD', border: 'border-emerald-500' },
                              amber: { bg: 'bg-amber-500', name: 'AMBER', border: 'border-amber-500' },
                              velvet: { bg: 'bg-purple-500', name: 'VELVET', border: 'border-purple-500' },
                              rose: { bg: 'bg-rose-500', name: 'ROSE', border: 'border-rose-500' }
                            }[col];
                            const isSelected = settings.accentColor === col;
                            return (
                              <button
                                key={col}
                                onClick={() => {
                                  updateSettings({ accentColor: col });
                                  addLog(`UI accent color matched to Holographic ${mapCol.name}`, 'success');
                                }}
                                className={`flex items-center gap-1.5 p-1.5 px-2 rounded-lg border text-[9px] font-bold cursor-pointer transition-all ${
                                  isSelected 
                                    ? `bg-slate-950 text-white ${mapCol.border} shadow-[0_0_10px_rgba(255,255,255,0.1)]` 
                                    : 'bg-slate-950 border-slate-900 hover:bg-slate-850 text-slate-450'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full ${mapCol.bg} flex-shrink-0`} />
                                <span>{mapCol.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Display Settings toggles */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider">Engine Visual Overlays</span>
                        <div className="flex flex-col gap-2 mt-1.5">
                          {/* Webcam visible state */}
                          <div className="flex items-center justify-between text-2xs p-2 bg-slate-950 rounded border border-slate-900">
                            <span>Draw camera visual feed</span>
                            <button
                              onClick={() => {
                                updateSettings({ showWebcamOverlay: !settings.showWebcamOverlay });
                                addLog(settings.showWebcamOverlay ? 'Quiet camera mode active.' : 'Drawing active vision logs over video', 'info');
                              }}
                              className={`px-3 py-1 rounded text-3xs font-semibold ${
                                settings.showWebcamOverlay 
                                  ? 'bg-emerald-950 border border-emerald-700/50 text-emerald-350' 
                                  : 'bg-slate-900 text-slate-500 border border-slate-800'
                              }`}
                            >
                              {settings.showWebcamOverlay ? 'DRAW' : 'HIDE'}
                            </button>
                          </div>

                          {/* Lens Color Inversion */}
                          <div className="flex items-center justify-between text-2xs p-2 bg-slate-950 rounded border border-slate-900">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200">Magnifier Invert Mode</span>
                              <span className="text-[8px] text-slate-500">Renders lens colors in negative</span>
                            </div>
                            <button
                              onClick={() => {
                                updateSettings({ lensInvertMode: !settings.lensInvertMode });
                                addLog(!settings.lensInvertMode ? 'Lens Invert mode: NEGATIVE ACTIVE' : 'Lens Invert mode: NORMAL COLORS', 'info');
                              }}
                              className={`px-2 py-1.5 rounded text-[8px] font-bold uppercase transition-all whitespace-nowrap ${
                                settings.lensInvertMode 
                                  ? 'bg-amber-950/80 border border-amber-600/50 text-amber-300' 
                                  : 'bg-slate-900 text-slate-500 border border-slate-800/80 hover:text-slate-400'
                              }`}
                            >
                              {settings.lensInvertMode ? 'NEGATIVE' : 'NORMAL'}
                            </button>
                          </div>

                          {/* Human Eye Gaze Tracking toggle override */}
                          <div className="flex items-center justify-between text-2xs p-2 bg-slate-950 rounded border border-slate-900">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200">Gaze Tracking Pointer</span>
                              <span className="text-[8px] text-slate-500">Overrides hand cursor with Eye tracking sights</span>
                            </div>
                            <button
                              onClick={() => {
                                const nextVal = !settings.eyeControlMode;
                                updateSettings({ eyeControlMode: nextVal });
                                addLog(nextVal ? 'SYS_LINK: Human Eye Iris tracking system connected' : 'SYS_LINK: Returned control to hand/keyboard module', nextVal ? 'success' : 'warn');
                              }}
                              className={`px-3 py-1 rounded text-3xs font-bold leading-none uppercase ${
                                settings.eyeControlMode 
                                  ? 'bg-cyan-950 border border-cyan-800/50 text-cyan-400' 
                                  : 'bg-slate-900 text-slate-500 border border-slate-800 hover:text-slate-400'
                              }`}
                            >
                              {settings.eyeControlMode ? 'ACTIVE' : 'OFF'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Calibration indicators */}
                      <div className="p-2.5 bg-slate-950 rounded border border-slate-850 text-3xs text-slate-500 leading-normal">
                        <p className="font-bold text-slate-350 mb-1">🔥 Gestures Directives:</p>
                        <p>1. Wave left/right to skip music tracks or toggle menu.</p>
                        <p>2. Keep fingers upright and still to stabilize pointer cursor.</p>
                      </div>

                    </div>

                    {/* Developer Credits Info */}
                    <div className="border-t border-slate-850 pt-3 text-center text-4xs text-slate-650 tracking-wider uppercase select-none pointer-events-none">
                      Hand OS Simulator v1.0.4 - MIT
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })}

      </div>

      {/* 3. HARDWARE TELEMETRY LOG PANEL - SIDEBAR (Beautiful Margins Logging lines) */}
      <div 
        className="absolute bottom-16 right-4 w-64 max-h-56 bg-slate-950/85 border border-slate-850 shadow-2xl rounded-xl overflow-hidden font-mono text-[9px] flex flex-col z-20 pointer-events-none select-none select-none hover:opacity-10 opacity-75 md:opacity-90 md:hover:opacity-100 transition-opacity"
        id="side_telemetry_terminal"
      >
        <div className="px-2.5 py-1.5 bg-slate-900/60 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Terminal size={10} className="text-emerald-450 animate-pulse" />
            <span className="font-bold text-slate-400 capitalize">System Telemetry Logs</span>
          </div>
          <span className="text-[8px] text-slate-600 uppercase">Interactive</span>
        </div>
        <div className="p-2 gap-1 overflow-y-auto max-h-48 flex flex-col-reverse text-[9px]">
          {logs.slice().reverse().map((log) => {
            let col = 'text-slate-400';
            if (log.type === 'success') col = 'text-emerald-400';
            if (log.type === 'warn') col = 'text-amber-400';
            if (log.type === 'active') col = accent.text;
            return (
              <div key={log.id} className={`${col} leading-snug flex gap-1 items-start`}>
                <span className="text-slate-650 shrink-0">[{log.timestamp}]</span>
                <span>{log.message}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SYSTEM TASKBAR (Bottom bar) */}
      <div className="h-12 bg-slate-950 border-t border-slate-850 flex items-center justify-between px-3 z-45 flex-shrink-0 select-none">
        
        {/* Start Button launcher menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playAmbientSound('click');
              setStartMenuOpen(!startMenuOpen);
            }}
            onMouseEnter={() => playAmbientSound('hover')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-mono text-2xs font-bold uppercase shadow transition-all cursor-pointer border ${accent.startBtn}`}
            id="start_menu_toggle"
          >
            <Play size={10} fill="currentColor" className="rotate-270" />
            Menu
          </button>

          {/* Opened Windows Tabs Drawer listed on taskbar */}
          <div className="hidden sm:flex items-center gap-1 border-l border-slate-850 pl-2">
            {windows.map((win) => {
              if (!win.isOpen) return null;
              const AppIcon = APP_METADATA[win.id].icon;

              return (
                <button
                  key={win.id}
                  onClick={() => focusWindow(win.id)}
                  onMouseEnter={() => playAmbientSound('hover')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-4xs font-mono font-bold tracking-wider uppercase rounded-md border cursor-pointer transition-all ${
                    !win.isMinimized 
                      ? `bg-slate-800 border-slate-700 shadow-inner ${accent.text}` 
                      : 'bg-slate-900 border-slate-900 text-slate-500 hover:bg-slate-850'
                  }`}
                >
                  <AppIcon size={10} />
                  {win.title.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right side logs displays - volume indicator & clock */}
        <div className="flex items-center gap-2.5 text-slate-400 h-full font-mono text-xs">
          
          {/* Quick volume widget preview */}
          <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-900/60 rounded border border-slate-900">
            <Volume2 size={13} className="text-slate-500" />
            <span className="text-[9px] font-bold text-slate-400">{settings.volume}%</span>
          </div>

          {/* Clock representation */}
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-900/60 rounded border border-slate-900 flex-shrink-0">
            <Clock size={12} className="text-slate-500" />
            <span className="text-2xs font-bold text-slate-300">{currentTime || '00:00:00'}</span>
          </div>
        </div>

      </div>

      {/* 5. GESTURE ACTIVE START MENU DRAWER OVERLAY */}
      {startMenuOpen && (
        <div 
          className="absolute bottom-14 left-4 w-52 bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-2xl z-50 flex flex-col font-mono"
          id="pop_start_menu"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2.5 bg-slate-900 border-b border-slate-850">
            <p className="text-[9px] font-bold text-slate-450 uppercase tracking-widest flex items-center gap-1">
              <CircleDot size={11} className={`${accent.text} animate-ping`} />
              App Launcher index
            </p>
          </div>
          <div className="p-1.5 space-y-0.5">
            {windows.map((w) => {
              const AppIcon = APP_METADATA[w.id].icon;

              return (
                <button
                  key={w.id}
                  onClick={() => launchApp(w.id)}
                  onMouseEnter={() => playAmbientSound('hover')}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg text-3xs md:hover:bg-slate-900 hover:text-white flex items-center gap-2 text-slate-400 cursor-pointer transition-all"
                >
                  <AppIcon size={12} className={accent.text} />
                  <span className="capitalize">{w.title}</span>
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-slate-900 bg-slate-955 flex items-center justify-between">
            <button
              onClick={() => {
                playAmbientSound('close');
                setWindows((prev) => prev.map((w) => ({ ...w, isOpen: false })));
                setStartMenuOpen(false);
                addLog('Command: Shut down all active modules.', 'warn');
              }}
              onMouseEnter={() => playAmbientSound('hover')}
              className="text-[8px] font-bold text-rose-450 hover:text-rose-400 uppercase w-full text-center cursor-pointer py-1 bg-rose-955 hover:bg-rose-950/20 rounded border border-rose-900/40"
            >
              Kill All Processes
            </button>
          </div>
        </div>
      )}

      {/* 6. SYSTEM FLOATING TRACKED HAND POINTER CURSOR */}
      <div 
        className="absolute pointer-events-none transition-all duration-[80ms] rounded-full z-100 flex items-center justify-center translate-x-[0px] translate-y-[0px]"
        style={{
          left: `${hand.x * 100}%`,
          top: `${hand.y * 100}%`,
          transform: 'translate(-50%, -50%)',
          width: settings.eyeControlMode ? '32px' : '24px',
          height: settings.eyeControlMode ? '32px' : '24px'
        }}
        id="aero_pointer_cursor"
      >
        {settings.eyeControlMode ? (
          <>
            {/* Eye tracking crosshair pointer layout */}
            {/* Outer dotted iris scanning ring */}
            <div className={`absolute rounded-full border border-dashed animate-spin transition-all duration-150 ${
              hand.isPinching || hand.gesture === 'PINCH_CLICK'
                ? 'border-emerald-400 bg-emerald-500/10 scale-90 shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                : `scale-110 ${accent.cursorBorder}`
            }`} style={{ inset: '0', animationDuration: '6s' }} />

            {/* Inner pupil reticle lens */}
            <div className={`absolute rounded-full border transition-all duration-150 ${
              hand.isPinching || hand.gesture === 'PINCH_CLICK'
                ? 'border-emerald-350 scale-55'
                : `scale-75 ${accent.border}`
            }`} style={{ inset: '5px' }} />

            {/* Reticle laser ticks */}
            <div className={`absolute w-[1px] h-[36px] opacity-40 ${accent.bg}`} />
            <div className={`absolute h-[1px] w-[36px] opacity-40 ${accent.bg}`} />

            {/* Small glowing pupil core */}
            <div className={`w-2 h-2 rounded-full absolute transition-all duration-150 ${
              hand.isPinching || hand.gesture === 'PINCH_CLICK'
                ? 'bg-emerald-400 scale-[0.6]'
                : accent.bg
            }`} />
          </>
        ) : (
          <>
            {/* Glow halo pointer outer wrapper */}
            <div className={`absolute rounded-full border transition-all duration-150 ${
              hand.isPinching || hand.gesture === 'PINCH_CLICK'
                ? 'scale-[0.55] border-emerald-400 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.9)]'
                : hand.gesture === 'GRAB' || hand.isFist
                  ? 'scale-110 border-amber-400 bg-amber-500/10 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                  : accent.cursorBorder
            }`} style={{ inset: '0' }} />

            {/* Small solid point cursor center core */}
            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-150 ${
              hand.isPinching || hand.gesture === 'PINCH_CLICK'
                ? 'bg-emerald-350'
                : hand.gesture === 'GRAB' || hand.isFist
                  ? 'bg-amber-400'
                  : 'bg-white'
            }`} />
          </>
        )}

        {/* Diagnostic gesture label tags under mouse ring */}
        <div className="absolute top-7 bg-slate-950/90 border border-slate-800 text-[8px] font-mono font-bold text-slate-355 px-1 rounded whitespace-nowrap shadow uppercase select-none pointer-events-none tracking-wider scale-90">
          {settings.eyeControlMode ? (hand.isPinching || hand.gesture === 'PINCH_CLICK' ? 'IRIS CLICK' : 'IRIS TRACK') : hand.gesture}
        </div>
      </div>

    </div>
  );
}
