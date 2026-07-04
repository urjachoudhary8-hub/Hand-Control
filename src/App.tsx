import React, { useState, useCallback } from 'react';
import { HandData, LaptopSettings, TelemetryLog } from './types';
import HandTracker from './components/HandTracker';
import OSDesktop, { getAccentClasses } from './components/OSDesktop';
import AppFaceReader from './components/AppFaceReader';
import { Monitor, HelpCircle, HardDrive, Wifi, Cpu, Sun } from 'lucide-react';

export default function App() {
  // Biometric panel sidebar viewing modes: 'all' (dual synapse) | 'hand' | 'face'
  const [sidebarMode, setSidebarMode] = useState<'all' | 'hand' | 'face'>('all');

  // Main settings orchestrator
  const [settings, setSettings] = useState<LaptopSettings>({
    cursorSensitivity: 1.4,
    cursorSmoothing: 0.45,
    showWebcamOverlay: true,
    showSkeleton: true,
    simulatedHandMode: false, // Default to real webcam tracking for hand gestures
    theme: 'slate',
    accentColor: 'cyan',
    lensInvertMode: false,
    volume: 60,
    calibTL_x: 0.1,
    calibTL_y: 0.1,
    calibTR_x: 0.9,
    calibTR_y: 0.1,
    calibBL_x: 0.1,
    calibBL_y: 0.9,
    calibBR_x: 0.9,
    calibBR_y: 0.9,
    eyeControlMode: false,
    blinkClickSensitivity: 0.5
  });

  // Current physical/simulated coordinate and action frame
  const [handData, setHandData] = useState<HandData>({
    x: 0.5,
    y: 0.5,
    isPinching: false,
    isFist: false,
    gesture: 'POINTER',
    confidence: 1.0,
    lastUpdated: Date.now()
  });

  // Hardware telemetry logger history buffer
  const [logs, setLogs] = useState<TelemetryLog[]>([
    { id: '1', timestamp: '00:00:01', message: 'Hand OS hardware boot sequence completed successfully.', type: 'success' },
    { id: '2', timestamp: '00:00:02', message: 'Micro-kernel loaded. Awaiting aero tracking links...', type: 'info' }
  ]);

  const addLog = useCallback((message: string, type: 'info' | 'success' | 'warn' | 'active' = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [
      ...prev.slice(-30), // Retain the last 30 logs inside telemetry buffer
      { id: Date.now().toString() + Math.random().toString(), timestamp, message, type }
    ]);
  }, []);

  const updateSettings = (next: Partial<LaptopSettings>) => {
    setSettings((s) => ({ ...s, ...next }));
  };

  const handleHandUpdate = (newHand: HandData, isDirect: boolean = false) => {
    if (isDirect) {
      setHandData(newHand);
      return;
    }

    // Determine min and max boundaries from coordinates
    const minX = (settings.calibTL_x + settings.calibBL_x) / 2;
    const maxX = (settings.calibTR_x + settings.calibBR_x) / 2;
    const minY = (settings.calibTL_y + settings.calibTR_y) / 2;
    const maxY = (settings.calibBL_y + settings.calibBR_y) / 2;

    const rawX = newHand.rawX ?? newHand.x;
    const rawY = newHand.rawY ?? newHand.y;

    // Linear mapping from camera window [min, max] boundary to full OS desktop space [0, 1]
    let calibX = (rawX - minX) / (maxX - minX || 0.01);
    let calibY = (rawY - minY) / (maxY - minY || 0.01);

    calibX = Math.max(0, Math.min(1, calibX));
    calibY = Math.max(0, Math.min(1, calibY));

    setHandData({
      ...newHand,
      x: calibX,
      y: calibY,
      rawX,
      rawY
    });
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0f1d] text-slate-150 flex flex-col items-center justify-center p-2 sm:p-4 font-sans md:overflow-hidden select-none">
      
      {/* 1. ARCHITECTURAL HIGH-DENSITY HUD HEADER */}
      <header className="w-full max-w-7xl mb-2.5 flex items-center justify-between flex-wrap gap-2 p-2 bg-[#0c1223]/95 border border-slate-800 rounded-lg shadow-sm font-mono">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/35 flex items-center justify-center text-cyan-400">
            <Cpu size={15} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-mono flex items-center gap-1.5 leading-none">
              HC-OS // GESTURE_PRIMARY <span className="text-[8px] font-bold px-1.5 py-0.5 bg-cyan-950/60 border border-cyan-800/40 rounded text-cyan-400">BUILD #88-C</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none mt-1 font-mono">
              Advanced Real-time Computer Vision (MediaPipe) OS Cockpit
            </p>
          </div>
        </div>

        {/* Top telemetry high-density readout chips */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#131b31]/80 border border-slate-800 rounded text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] animate-pulse" />
            <span className="text-slate-500">CORE:</span> <strong className="text-slate-100">ONLINE</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-[#131b31]/80 border border-slate-800 rounded text-slate-400">
            <span className={`w-1.5 h-1.5 rounded-full ${settings.simulatedHandMode ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'} animate-pulse`} />
            <span className="text-slate-500">LINK:</span> <strong className={settings.simulatedHandMode ? 'text-amber-400' : 'text-emerald-400'}>{settings.simulatedHandMode ? 'SIMULATOR' : 'CAM_AERO'}</strong>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-[#131b31]/80 border border-slate-800 rounded text-slate-400">
            <span className="text-slate-500">POS:</span> <strong className="text-cyan-400 font-bold">{handData.x.toFixed(4)}, {handData.y.toFixed(4)}</strong>
          </div>
        </div>
      </header>

      {/* 2. SPLIT LAYOUT: PHYSICAL LAPTOP SHELL + SENSOR CONTROL PANEL */}
      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-grow md:max-h-[82vh] md:min-h-[500px]">
        
        {/* PHYSICAL LAPTOP CHASSIS (LEFT/MAIN BLOCK - 8 cols) */}
        <section className="lg:col-span-8 flex flex-col items-center justify-center bg-slate-950/20 rounded-2xl border border-slate-900 md:p-4 shadow-2xl relative overflow-hidden">
          
          {/* Aesthetic grid light backdrops */}
          <div className="absolute top-0 inset-x-0 h-40 bg-radial from-sky-500/3 to-transparent blur-3xl pointer-events-none" />

          {/* LAPTOP DISPLAY MONITOR (Includes Bezels + Webcam Lens) */}
          <div className="w-full aspect-[16/10] bg-slate-950 rounded-2xl p-3 relative flex flex-col shadow-[0_0_40px_rgba(0,0,0,0.8)] border-4 border-slate-950 flex-shrink flex-grow select-none">
            
            {/* Top monitor Bezel accessories */}
            <div className="absolute top-1 inset-x-0 h-4 flex items-center justify-center gap-1.5 select-none pointer-events-none z-45">
              
              {/* Webcam Lens */}
              <div className="w-2 h-2 rounded-full bg-slate-905 border border-slate-800 flex items-center justify-center ring-1 ring-slate-800/40">
                <div className="w-0.5 h-0.5 rounded-full bg-indigo-500" />
              </div>

              {/* Glowing hardware active light indicator */}
              <span className={`w-1 h-1 rounded-full ${settings.simulatedHandMode ? 'bg-slate-800' : 'bg-green-500 shadow-[0_0_6px_rgba(16,185,129,1)]'}`} />
              
              {/* Webcam Mic Hole */}
              <span className="w-0.5 h-0.5 rounded-full bg-slate-900" />
            </div>

            {/* Rubber protective bumpers inside edges */}
            <div className="absolute top-1 left-1.5 w-1 h-0.5 rounded bg-slate-800" />
            <div className="absolute top-1 right-1.5 w-1 h-0.5 rounded bg-slate-800" />

            {/* LOWER BEZEL BRAND GLOW */}
            <div className="absolute bottom-1 inset-x-0 h-4 flex items-center justify-center select-none pointer-events-none">
              <span className="text-[7px] font-mono font-bold tracking-[0.25em] text-slate-500 uppercase">
                HAND OS PRO
              </span>
            </div>

            {/* GLOSSY DEEP GLASS REFLECTION LAYER ASPECT COVERS */}
            <div className="absolute inset-3 border border-slate-900 bg-sky-950/5 rounded-lg flex flex-col overflow-hidden shadow-inner flex-grow relative z-10" id="virtual_laptop_screen">
              
              {/* Mounted virtual Operating System workspace screen */}
              <OSDesktop 
                hand={handData} 
                settings={settings} 
                updateSettings={updateSettings} 
                logs={logs} 
                addLog={addLog} 
                onHandUpdate={handleHandUpdate}
              />

              {/* High-Tech Magnifying Screen Inspection Lens Overlay */}
              {(() => {
                const accent = getAccentClasses(settings.accentColor);
                return (
                  <div 
                    className="absolute pointer-events-none rounded-full border border-dashed transition-all duration-100 ease-out z-45 flex items-center justify-center shadow-2xl"
                    style={{
                      left: `${handData.x * 100}%`,
                      top: `${handData.y * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '100px',
                      height: '100px',
                      boxShadow: `0 0 20px rgba(15, 23, 42, 0.4), inset 0 0 15px rgba(255, 255, 255, 0.05)`,
                      borderColor: settings.accentColor === 'cyan' ? 'rgba(34, 211, 238, 0.35)' : 
                                   settings.accentColor === 'pink' ? 'rgba(244, 114, 182, 0.35)' : 
                                   settings.accentColor === 'emerald' ? 'rgba(16, 185, 129, 0.35)' : 
                                   settings.accentColor === 'amber' ? 'rgba(245, 158, 11, 0.35)' : 
                                   settings.accentColor === 'velvet' ? 'rgba(168, 85, 247, 0.35)' : 
                                   'rgba(244, 63, 94, 0.35)',
                    }}
                  >
                    {/* Backdrop zoom amplification blur, contrast distortion & optional negative invert logic */}
                    <div 
                      className="absolute inset-0 rounded-full transition-all duration-200 pointer-events-none" 
                      style={{
                        backdropFilter: settings.lensInvertMode 
                          ? 'blur(1.5px) brightness(1.15) contrast(1.12) invert(1)' 
                          : 'blur(1.5px) brightness(1.15) contrast(1.12)'
                      }}
                    />

                    {/* Fine laser crosshair */}
                    <div className="absolute w-[80%] h-[1px] bg-white/15" />
                    <div className="absolute h-[80%] w-[1px] bg-white/15" />

                    {/* Concentric rotating telemetry ring */}
                    <div className="absolute inset-2.5 rounded-full border border-dotted animate-spin opacity-55" 
                         style={{ 
                           animationDuration: '12s',
                           borderColor: settings.accentColor === 'cyan' ? 'rgba(34, 211, 238, 0.5)' : 
                                        settings.accentColor === 'pink' ? 'rgba(244, 114, 182, 0.5)' : 
                                        settings.accentColor === 'emerald' ? 'rgba(16, 185, 129, 0.5)' : 
                                        settings.accentColor === 'amber' ? 'rgba(245, 158, 11, 0.5)' : 
                                        settings.accentColor === 'velvet' ? 'rgba(168, 85, 247, 0.5)' : 
                                        'rgba(244, 63, 94, 0.5)',
                         }} />

                    {/* Active inspection status badge tag */}
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                      <span className={`font-mono text-[7px] font-bold tracking-wider ${accent.text} bg-slate-950/90 px-1.5 py-0.5 rounded border border-slate-800/80 whitespace-nowrap uppercase flex items-center gap-1 shadow-md`}>
                        <span className={`w-1 h-1 rounded-full ${accent.bg} animate-ping inline-block`} />
                        INS_X: {(handData.x * 100).toFixed(0)} Y: {(handData.y * 100).toFixed(0)} {settings.lensInvertMode ? ' [NEG]' : ''}
                      </span>
                    </div>
                    
                    {/* Glass glare overlay swipe highlight reflection */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10 opacity-60 pointer-events-none" />

                    {/* Lens corner sight target guidelines */}
                    <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-white/30 rounded-tl-sm" />
                    <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-white/30 rounded-tr-sm" />
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-white/30 rounded-bl-sm" />
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-white/30 rounded-br-sm" />
                  </div>
                );
              })()}

            </div>

          </div>

          {/* DESIGN ACCENTS: PHYSICAL HINGE */}
          <div className="w-[30%] h-3.5 bg-slate-900 border-x border-b border-slate-950/80 rounded-b-xl flex justify-center items-center relative z-20 select-none pointer-events-none shadow" />

          {/* CYBERPUNK KEYBOARD DECK (Lower body panel) */}
          <div className="w-[94%] h-24 bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-t border-slate-800 rounded-b-2xl relative shadow-2xl flex flex-col items-center justify-between p-2 select-none pointer-events-none">
            
            {/* Embedded glowing keyboard indicators */}
            <div className="w-full flex justify-between px-10 text-[6px] font-mono text-slate-650 uppercase tracking-widest mt-1">
              <span>Aero Synchronizer Input active</span>
              <span>100% Core Matrix Linked</span>
            </div>

            {/* Glowing Laptop keyboard mockup lines */}
            <div className="w-[85%] h-5 border-t border-slate-800/80 bg-slate-950/60 rounded flex justify-between items-center px-6 relative mt-1.5 shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)]">
              {Array.from({ length: 14 }).map((_, i) => (
                <div key={i} className="h-2 w-4 rounded-xs bg-slate-900 border border-slate-955 flex items-center justify-center">
                  <div className={`h-0.5 w-2 rounded-2xs ${settings.simulatedHandMode ? 'bg-amber-500/20' : 'bg-cyan-500/20'}`} />
                </div>
              ))}
            </div>

            {/* Laptop Touchpad cutout bezel panel layout */}
            <div className="w-24 h-11 border-t border-x border-slate-850 bg-slate-900/40 rounded-t-lg relative flex items-center justify-center p-0.5">
              <div className="h-full w-full rounded-t border-t border-dashed border-slate-800" />
            </div>

          </div>

        </section>

        {/* SIDEBAR GESTURES CAMERA EYE MONITOR (RIGHT BLOCK - 4 cols) */}
        <section className="lg:col-span-4 flex flex-col h-full bg-[#070b16] border border-slate-900 rounded-2xl overflow-hidden shadow-2xl" id="sidebar_hardware_tracker">
          
          {/* MULTI-BIOMETRIC CONTROL SWITCHER */}
          <div className="flex border-b border-slate-900 bg-slate-950/90 p-1.5 gap-1.5 font-mono text-[9px] select-none z-10 shrink-0">
            <button
              onClick={() => {
                setSidebarMode('all');
                addLog('Activated Dual-Synapse monitoring for all panels.', 'info');
              }}
              className={`flex-1 py-1.5 px-2 rounded-md font-bold uppercase tracking-wider text-center transition-all cursor-pointer ${
                sidebarMode === 'all'
                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 border border-transparent'
              }`}
            >
              📊 Dual All
            </button>
            <button
              onClick={() => {
                setSidebarMode('hand');
                addLog('Focused sidebar tracker on Hand Gestures Panel.', 'info');
              }}
              className={`flex-1 py-1.5 px-2 rounded-md font-bold uppercase tracking-wider text-center transition-all cursor-pointer ${
                sidebarMode === 'hand'
                  ? 'bg-amber-950 text-amber-400 border border-amber-800/40 shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 border border-transparent'
              }`}
            >
              ✋ Hand Panel
            </button>
            <button
              onClick={() => {
                setSidebarMode('face');
                addLog('Focused sidebar tracker on Face Gaze/Expressions Panel.', 'info');
              }}
              className={`flex-1 py-1.5 px-2 rounded-md font-bold uppercase tracking-wider text-center transition-all cursor-pointer ${
                sidebarMode === 'face'
                  ? 'bg-emerald-950 text-[#00dfc1] border border-[#00dfc1]/30 shadow-[0_0_10px_rgba(0,223,193,0.25)]'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900 border border-transparent'
              }`}
            >
              👁️ Face Panel
            </button>
          </div>

          {/* Conditional Multi-Biometric Panel Renderer */}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto divide-y divide-slate-900 bg-[#080d1a]">
            
            {(sidebarMode === 'all' || sidebarMode === 'hand') && (
              <div className={`${sidebarMode === 'all' ? 'h-1/2 min-h-[260px]' : 'h-full'} flex flex-col min-h-0 overflow-y-auto relative`}>
                {sidebarMode === 'all' && (
                  <div className="absolute top-2 left-3 z-30 font-mono text-[8.5px] font-bold text-amber-500 uppercase flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded border border-amber-700/35 shadow pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" /> MODULE_01A // HAND_SENSORS
                  </div>
                )}
                <HandTracker 
                  settings={settings} 
                  updateSettings={updateSettings} 
                  onHandUpdate={handleHandUpdate} 
                  addLog={addLog} 
                />
              </div>
            )}

            {(sidebarMode === 'all' || sidebarMode === 'face') && (
              <div className={`${sidebarMode === 'all' ? 'h-1/2 min-h-[260px]' : 'h-full'} flex flex-col min-h-0 overflow-y-auto relative`}>
                {sidebarMode === 'all' && (
                  <div className="absolute top-2 left-3 z-30 font-mono text-[8.5px] font-bold text-[#00dfc1] uppercase flex items-center gap-1 bg-slate-950/90 px-1.5 py-0.5 rounded border border-[#00dfc1]/35 shadow pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00dfc1] animate-ping" /> MODULE_01B // FACE_MESH
                  </div>
                )}
                <AppFaceReader 
                  hand={handData} 
                  settings={settings} 
                  updateSettings={updateSettings} 
                  addLog={addLog} 
                  onHandUpdate={handleHandUpdate}
                />
              </div>
            )}

          </div>
        </section>

      </main>

      {/* 3. COEF INSTRUCTIONAL MARGIN TIP BADGES */}
      <footer className="w-full max-w-7xl mt-4 px-1 flex flex-wrap justify-between gap-3 text-5xs font-mono text-slate-550 uppercase tracking-widest select-none pointer-events-none">
        <p>Aero Computer Vision calibrated in real-time local environment grids</p>
        <p>Copyright © 2026 Google AI Studio workspace</p>
      </footer>

    </div>
  );
}
