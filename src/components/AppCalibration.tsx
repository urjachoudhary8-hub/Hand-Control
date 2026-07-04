import React, { useState, useEffect, useRef } from 'react';
import { HandData, LaptopSettings } from '../types';
import { 
  Target, 
  RefreshCw, 
  HelpCircle, 
  Maximize2, 
  CornerDownRight, 
  Crop, 
  CheckCircle,
  Eye,
  Sliders,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Grid,
  Activity,
  Compass
} from 'lucide-react';

interface AppCalibrationProps {
  hand: HandData;
  settings: LaptopSettings;
  updateSettings: (s: Partial<LaptopSettings>) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
}

export default function AppCalibration({
  hand,
  settings,
  updateSettings,
  addLog
}: AppCalibrationProps) {
  // Use raw (uncalibrated) hand positions so the user can accurately point to anchors in camera coordinate space
  const rawX = hand.rawX ?? hand.x;
  const rawY = hand.rawY ?? hand.y;

  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // activeCorner tracks which corner is currently being active-dragged
  const [activeCorner, setActiveCorner] = useState<'TL' | 'TR' | 'BL' | 'BR' | null>(null);
  // selectedCorner tracks which corner is selected for the fine-tuning pad below
  const [selectedCorner, setSelectedCorner] = useState<'TL' | 'TR' | 'BL' | 'BR'>('TL');
  const [isHoveredCorner, setIsHoveredCorner] = useState<'TL' | 'TR' | 'BL' | 'BR' | null>(null);
  const [showGridGuide, setShowGridGuide] = useState<boolean>(true);

  // Calibration corner details mapped out of settings state
  const corners = {
    TL: { x: settings.calibTL_x, y: settings.calibTL_y },
    TR: { x: settings.calibTR_x, y: settings.calibTR_y },
    BL: { x: settings.calibBL_x, y: settings.calibBL_y },
    BR: { x: settings.calibBR_x, y: settings.calibBR_y }
  };

  // Check if hand is near any corner to enable visual highlight on hover
  useEffect(() => {
    let foundNear: 'TL' | 'TR' | 'BL' | 'BR' | null = null;
    const threshold = 0.09; // Proximity margin inside [0..1] range

    Object.entries(corners).forEach(([key, corner]) => {
      const distance = Math.sqrt(Math.pow(rawX - corner.x, 2) + Math.pow(rawY - corner.y, 2));
      if (distance < threshold) {
        foundNear = key as 'TL' | 'TR' | 'BL' | 'BR';
      }
    });

    setIsHoveredCorner(foundNear);

    // If grabbing/clicking and hovered, lock on that corner for active carrying dragging
    const isInteracting = hand.isPinching || hand.isFist || hand.gesture === 'PINCH_CLICK' || hand.gesture === 'GRAB';
    if (isInteracting) {
      if (!activeCorner && foundNear) {
        setActiveCorner(foundNear);
        setSelectedCorner(foundNear); // Auto-select for nudging as well
        addLog(`Calibrator locked: Dragging ${foundNear} corner`, 'active');
      } else if (activeCorner) {
        // Track corner position bounded safely
        const updatedX = Math.round(Math.max(0, Math.min(1, rawX)) * 200) / 200;
        const updatedY = Math.round(Math.max(0, Math.min(1, rawY)) * 200) / 200;

        // Prevent crossing past each other
        if (activeCorner === 'TL') {
          updateSettings({ calibTL_x: Math.min(updatedX, settings.calibTR_x - 0.15), calibTL_y: Math.min(updatedY, settings.calibBL_y - 0.15) });
        } else if (activeCorner === 'TR') {
          updateSettings({ calibTR_x: Math.max(updatedX, settings.calibTL_x + 0.15), calibTR_y: Math.min(updatedY, settings.calibBR_y - 0.15) });
        } else if (activeCorner === 'BL') {
          updateSettings({ calibBL_x: Math.min(updatedX, settings.calibBR_x - 0.15), calibBL_y: Math.max(updatedY, settings.calibTL_y + 0.15) });
        } else if (activeCorner === 'BR') {
          updateSettings({ calibBR_x: Math.max(updatedX, settings.calibBL_x + 0.15), calibBR_y: Math.max(updatedY, settings.calibTR_y + 0.15) });
        }
      }
    } else {
      if (activeCorner) {
        addLog(`Calibrator saved: Released ${activeCorner} parameter`, 'success');
      }
      setActiveCorner(null);
    }
  }, [rawX, rawY, hand.isPinching, hand.isFist, hand.gesture, activeCorner]);

  // Handle manual coordinate mouse dragging for screen-level clicking fallback
  const handleAnchorMouseDown = (corner: 'TL' | 'TR' | 'BL' | 'BR', e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveCorner(corner);
    setSelectedCorner(corner);
  };

  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!activeCorner || !containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width;
    const y = (e.clientY - bounds.top) / bounds.height;
    
    // Snaps to 0.005 precision for high-quality snapping
    const nextX = Math.round(Math.max(0, Math.min(1, x)) * 200) / 200;
    const nextY = Math.round(Math.max(0, Math.min(1, y)) * 200) / 200;

    if (activeCorner === 'TL') {
      updateSettings({ calibTL_x: Math.min(nextX, settings.calibTR_x - 0.1), calibTL_y: Math.min(nextY, settings.calibBL_y - 0.1) });
    } else if (activeCorner === 'TR') {
      updateSettings({ calibTR_x: Math.max(nextX, settings.calibTL_x + 0.1), calibTR_y: Math.min(nextY, settings.calibBR_y - 0.1) });
    } else if (activeCorner === 'BL') {
      updateSettings({ calibBL_x: Math.min(nextX, settings.calibBR_x - 0.1), calibBL_y: Math.max(nextY, settings.calibTL_y + 0.1) });
    } else if (activeCorner === 'BR') {
      updateSettings({ calibBR_x: Math.max(nextX, settings.calibBL_x + 0.1), calibBR_y: Math.max(nextY, settings.calibTR_y + 0.1) });
    }
  };

  const handleContainerMouseUp = () => {
    setActiveCorner(null);
  };

  // Fine-tune Nudge action buttons handler
  const nudgeCorner = (direction: 'up' | 'down' | 'left' | 'right', amount: number = 0.01) => {
    const currentValX = corners[selectedCorner].x;
    const currentValY = corners[selectedCorner].y;

    let targetX = currentValX;
    let targetY = currentValY;

    if (direction === 'left') targetX = Math.max(0, currentValX - amount);
    if (direction === 'right') targetX = Math.min(1, currentValX + amount);
    if (direction === 'up') targetY = Math.max(0, currentValY - amount);
    if (direction === 'down') targetY = Math.min(1, currentValY + amount);

    // Round to prevent floating point inaccuracies
    targetX = Math.round(targetX * 200) / 200;
    targetY = Math.round(targetY * 200) / 200;

    // Apply safety crossing bounds
    if (selectedCorner === 'TL') {
      updateSettings({
        calibTL_x: Math.min(targetX, settings.calibTR_x - 0.1),
        calibTL_y: Math.min(targetY, settings.calibBL_y - 0.1)
      });
    } else if (selectedCorner === 'TR') {
      updateSettings({
        calibTR_x: Math.max(targetX, settings.calibTL_x + 0.1),
        calibTR_y: Math.min(targetY, settings.calibBR_y - 0.1)
      });
    } else if (selectedCorner === 'BL') {
      updateSettings({
        calibBL_x: Math.min(targetX, settings.calibBR_x - 0.1),
        calibBL_y: Math.max(targetY, settings.calibTL_y + 0.1)
      });
    } else if (selectedCorner === 'BR') {
      updateSettings({
        calibBR_x: Math.max(targetX, settings.calibBL_x + 0.1),
        calibBR_y: Math.max(targetY, settings.calibTR_y + 0.1)
      });
    }

    addLog(`Fine-tuned ${selectedCorner} offset manually`, 'info');
  };

  // Helper template config presets
  const applyPreset = (preset: 'wide' | 'narrow' | 'topHalf') => {
    if (preset === 'wide') {
      updateSettings({
        calibTL_x: 0.02, calibTL_y: 0.02,
        calibTR_x: 0.98, calibTR_y: 0.02,
        calibBL_x: 0.02, calibBL_y: 0.98,
        calibBR_x: 0.98, calibBR_y: 0.98
      });
      addLog('Applied Wide calibration: maps full camera perspective', 'success');
    } else if (preset === 'narrow') {
      updateSettings({
        calibTL_x: 0.22, calibTL_y: 0.22,
        calibTR_x: 0.78, calibTR_y: 0.22,
        calibBL_x: 0.22, calibBL_y: 0.78,
        calibBR_x: 0.78, calibBR_y: 0.78
      });
      addLog('Applied Narrow focus: mitigates corner background clutter', 'success');
    } else if (preset === 'topHalf') {
      updateSettings({
        calibTL_x: 0.10, calibTL_y: 0.05,
        calibTR_x: 0.90, calibTR_y: 0.05,
        calibBL_x: 0.10, calibBL_y: 0.65,
        calibBR_x: 0.90, calibBR_y: 0.65
      });
      addLog('Applied Elevated focus: optimized for hands raised in high fields', 'info');
    }
  };

  const resetAll = () => {
    updateSettings({
      calibTL_x: 0.1, calibTL_y: 0.1,
      calibTR_x: 0.9, calibTR_y: 0.1,
      calibBL_x: 0.1, calibBL_y: 0.9,
      calibBR_x: 0.9, calibBR_y: 0.9
    });
    addLog('Restored standard 10% default calibration offset boundary margins.', 'info');
  };

  // Calculate live transformation metrics
  const displayWidth = Math.abs((corners.TR.x + corners.BR.x)/2 - (corners.TL.x + corners.BL.x)/2);
  const displayHeight = Math.abs((corners.BL.y + corners.BR.y)/2 - (corners.TL.y + corners.TR.y)/2);
  const scalingFactorX = displayWidth > 0 ? (1 / displayWidth).toFixed(2) : '1.00';
  const scalingFactorY = displayHeight > 0 ? (1 / displayHeight).toFixed(2) : '1.00';
  const precisionScore = Math.min(100, Math.round((displayWidth * displayHeight) * 115));

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-slate-100 font-mono text-[11px] h-full overflow-y-auto">
      
      {/* 1. TOP HEADER SUMMARY HERO */}
      <div className="p-3 bg-[#0c1223] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Target size={14} className="rotate-45 animate-spin-slow text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-100 leading-none">AERO CALIBRATOR</h2>
            <span className="text-[9px] text-slate-500 uppercase mt-1 block">Virtual-Display Spatial Alignment Engine</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGridGuide(!showGridGuide)}
            className={`px-2 py-0.5 border ${showGridGuide ? 'bg-cyan-950/40 border-cyan-700/60 text-cyan-400' : 'bg-slate-900 border-slate-800 text-slate-500'} text-[9px] font-bold uppercase rounded cursor-pointer select-none`}
            title="Toggle Guide Grid"
          >
            Grid
          </button>
          <button
            onClick={resetAll}
            className="px-2 py-0.5 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-white rounded flex items-center gap-1.5 cursor-pointer select-none"
            id="click_pinch_reset_calib"
          >
            <RefreshCw size={10} />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* 2. BODY GRID CONTAINER */}
      <div className="flex-1 p-3 flex flex-col lg:flex-row gap-3 min-h-0">
        
        {/* Left Side: Virtual camera field screen */}
        <div className="flex-grow flex flex-col gap-2 min-h-[250px]">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
              <Eye size={12} className="text-cyan-400 animate-pulse" />
              CAMERA RESOLUTION BOUNDARY
            </span>
            <span className="text-slate-500 text-3xs font-mono uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-900">
              {activeCorner ? `Active Dragging: ${activeCorner}` : 'Drag Corner Handles or Click to Nudge'}
            </span>
          </div>

          <div 
            ref={containerRef}
            onMouseMove={handleContainerMouseMove}
            onMouseUp={handleContainerMouseUp}
            onMouseLeave={handleContainerMouseUp}
            className="flex-grow relative bg-[#060a13] rounded border border-slate-800 overflow-hidden cursor-crosshair min-h-[200px]"
          >
            {/* Background design coordinates grid lines */}
            {showGridGuide && (
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.015)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
            )}

            {/* Target Outer Display Quadrilateral Grid Lines overlaying on top */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <polygon
                points={`
                  ${corners.TL.x * 100},${corners.TL.y * 100} 
                  ${corners.TR.x * 100},${corners.TR.y * 100} 
                  ${corners.BR.x * 100},${corners.BR.y * 100} 
                  ${corners.BL.x * 100},${corners.BL.y * 100}
                `}
                style={{
                  fill: 'rgba(6, 182, 212, 0.045)',
                  stroke: 'rgba(6, 182, 212, 0.8)',
                  strokeWidth: '1.5',
                  strokeDasharray: '5 3'
                }}
              />
              {/* Central screen crosshairs */}
              <line 
                x1={`${((corners.TL.x + corners.TR.x) / 2) * 100}%`} 
                y1={`${((corners.TL.y + corners.BL.y) / 2) * 100}%`} 
                x2={`${((corners.BL.x + corners.BR.x) / 2) * 100}%`} 
                y2={`${((corners.TR.y + corners.BR.y) / 2) * 100}%`} 
                style={{ stroke: 'rgba(6,182,212,0.25)', strokeWidth: '1' }}
              />
              <circle
                cx="50%"
                cy="50%"
                r="30"
                style={{ fill: 'none', stroke: 'rgba(6,182,212,0.1)', strokeWidth: '1', strokeDasharray: '3 5' }}
              />
              <circle
                cx="50%"
                cy="50%"
                r="60"
                style={{ fill: 'none', stroke: 'rgba(6,182,212,0.05)', strokeWidth: '1' }}
              />
            </svg>

            {/* Drag handles (anchors) represent calibrated display corners */}
            {Object.entries(corners).map(([key, corner]) => {
              const isHovered = isHoveredCorner === key;
              const isActive = activeCorner === key;
              const isSelected = selectedCorner === key;

              return (
                <div
                  key={key}
                  onMouseDown={(e) => handleAnchorMouseDown(key as any, e)}
                  style={{
                    left: `${corner.x * 100}%`,
                    top: `${corner.y * 100}%`
                  }}
                  className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer transition-all z-20 ${
                    isActive 
                      ? 'bg-cyan-500/20 border-2 border-cyan-400 scale-115 shadow-[0_0_15px_rgba(6,182,212,0.9)]' 
                      : isSelected
                        ? 'bg-emerald-500/10 border-2 border-emerald-400 scale-110 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                        : isHovered 
                          ? 'bg-indigo-500/15 border border-indigo-400 scale-105 shadow-[0_0_8px_rgba(99,102,241,0.5)]' 
                          : 'bg-slate-900/90 border border-slate-600 hover:border-slate-400'
                  }`}
                  id={`calibrate_corner_${key.toLowerCase()}`}
                  title={`Click to select & nudge ${key}`}
                >
                  {/* Central glowing point dot */}
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : isSelected ? 'bg-emerald-400' : isHovered ? 'bg-indigo-400' : 'bg-slate-400'}`} />
                  
                  {/* Anchor visual tag labels */}
                  <span className={`absolute -top-4.5 text-[8px] tracking-widest font-bold uppercase ${isSelected ? 'text-emerald-400 border-emerald-800 bg-slate-950' : 'text-slate-400 border-slate-800 bg-slate-900'} px-1 py-0.2 rounded shadow-sm border select-none pointer-events-none`}>
                    {key}
                  </span>
                </div>
              );
            })}

            {/* Uncalibrated Hand position (Finger tracking feedback) as a green radar coordinate pointer */}
            <div
              className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 border border-emerald-400 bg-emerald-500/10 rounded-full z-30 transition-all duration-[40ms] pointer-events-none shadow-[0_0_10px_rgba(52,211,153,0.4)]`}
              style={{
                left: `${rawX * 100}%`,
                top: `${rawY * 100}%`
              }}
            >
              {/* Sight lines */}
              <div className="absolute top-1/2 left-12 w-4 h-[1px] bg-emerald-400/40 -translate-y-1/2" />
              <div className="absolute top-1/2 right-12 w-4 h-[1px] bg-emerald-400/40 -translate-y-1/2" />
              <div className="absolute top-12 left-1/2 w-[1px] h-4 bg-emerald-400/40 -translate-x-1/2" />
              <div className="absolute bottom-12 left-1/2 w-[1px] h-4 bg-emerald-400/40 -translate-x-1/2" />

              {/* Center point of target coordinate */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              
              {/* Target labels radar sight */}
              <div className="absolute whitespace-nowrap text-[8px] tracking-wider font-bold text-emerald-400 bg-slate-950/95 px-1 py-0.5 rounded border border-emerald-800/80 top-4 left-4 shadow-md">
                FINGER ({rawX.toFixed(3)}, {rawY.toFixed(3)})
              </div>
            </div>

            {/* Core calibrated boundary HUD watermark info inside camera screen */}
            <div className="absolute bottom-3 left-3 p-2 bg-slate-950/90 border border-slate-800 rounded font-mono text-[9px] text-slate-400 select-none pointer-events-none leading-relaxed">
              <p className="font-bold text-cyan-400 text-3xs tracking-widest uppercase">SPATIAL CHOP INDEX</p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1 text-[8px] text-slate-500">
                <span>TL-COORD:</span> <strong className="text-slate-350">{corners.TL.x.toFixed(2)}, {corners.TL.y.toFixed(2)}</strong>
                <span>TR-COORD:</span> <strong className="text-slate-350">{corners.TR.x.toFixed(2)}, {corners.TR.y.toFixed(2)}</strong>
                <span>BL-COORD:</span> <strong className="text-slate-350">{corners.BL.x.toFixed(2)}, {corners.BL.y.toFixed(2)}</strong>
                <span>BR-COORD:</span> <strong className="text-slate-350">{corners.BR.x.toFixed(2)}, {corners.BR.y.toFixed(2)}</strong>
              </div>
            </div>
            
            {/* Center target circle indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-slate-800 w-20 h-20 rounded-full flex items-center justify-center pointer-events-none">
              <div className="w-1 h-1 bg-cyan-500/20 rounded-full" />
            </div>
          </div>
        </div>

        {/* Right Side: Details Instructions Panel, presets list, feedback widgets */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
          
          {/* Section A: Selection & Precision Fine-Tuning */}
          <div className="p-3 bg-[#0c1223] rounded border border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Compass size={12} className="text-cyan-400" />
              PRECISION FINE-TUNE
            </span>

            {/* Quick selector buttons for corner */}
            <div className="grid grid-cols-4 gap-1">
              {(['TL', 'TR', 'BL', 'BR'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedCorner(key)}
                  className={`py-1 text-center text-[10px] font-bold rounded border transition-all cursor-pointer ${
                    selectedCorner === key 
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400 shadow-sm' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Visual Indicator of coordinates */}
            <div className="bg-slate-950/80 p-2 rounded border border-slate-850 flex items-center justify-between text-3xs font-bold uppercase">
              <span className="text-slate-500">Selected coordinate ({selectedCorner}):</span>
              <span className="text-emerald-400 font-mono">
                X: {corners[selectedCorner].x.toFixed(3)} | Y: {corners[selectedCorner].y.toFixed(3)}
              </span>
            </div>

            {/* Directional Pad */}
            <div className="flex flex-col items-center py-2 bg-slate-950/40 rounded border border-slate-850/60 relative">
              {/* Up Nudge */}
              <button
                onClick={() => nudgeCorner('up')}
                className="p-1 px-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-305 hover:text-white rounded cursor-pointer transition-colors"
                title="Slide up (Reduce Y)"
              >
                <ChevronUp size={16} />
              </button>

              {/* Horizontal Nudge row */}
              <div className="flex items-center gap-4 mt-1">
                <button
                  onClick={() => nudgeCorner('left')}
                  className="p-1 px-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-305 hover:text-white rounded cursor-pointer transition-colors"
                  title="Slide left (Reduce X)"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Reset Selected Single Corner */}
                <span className="text-[10px] font-bold text-slate-500 uppercase select-none px-1">
                  PAD
                </span>

                <button
                  onClick={() => nudgeCorner('right')}
                  className="p-1 px-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-305 hover:text-white rounded cursor-pointer transition-colors"
                  title="Slide right (Increase X)"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Down Nudge */}
              <button
                onClick={() => nudgeCorner('down')}
                className="p-1 px-2.5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-350 hover:text-white rounded mt-1 cursor-pointer transition-colors"
                title="Slide down (Increase Y)"
              >
                <ChevronDown size={16} />
              </button>
            </div>
            
            {/* Resolution indicator slider detail */}
            <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
              <span>NUDGE STEP RESOLUTION:</span>
              <strong className="text-cyan-400 font-normal">0.005 UNITS</strong>
            </div>
          </div>

          {/* Section B: Spatial Mapping Metrics Telemetry */}
          <div className="p-3 bg-[#0c1223] rounded border border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Activity size={12} className="text-cyan-400" />
              WORKSPACE RESOLVE RATIO
            </span>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-1.5 bg-slate-950/70 border border-slate-850 rounded leading-tight">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">X-Multipliers</span>
                <span className="text-emerald-400 font-bold block mt-0.5">{scalingFactorX}x scaling</span>
              </div>
              <div className="p-1.5 bg-slate-950/70 border border-slate-850 rounded leading-tight">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">Y-Multipliers</span>
                <span className="text-emerald-400 font-bold block mt-0.5">{scalingFactorY}x scaling</span>
              </div>
              <div className="p-1.5 bg-slate-950/70 border border-slate-850 rounded leading-tight">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">Safe Crop width</span>
                <span className="text-cyan-400 font-bold block mt-0.5">{(displayWidth * 100).toFixed(0)}% viewport</span>
              </div>
              <div className="p-1.5 bg-slate-950/70 border border-slate-850 rounded leading-tight">
                <span className="text-[8px] text-slate-500 uppercase tracking-widest block font-bold">Precision score</span>
                <span className="text-cyan-400 font-bold block mt-0.5">{precisionScore}% locks</span>
              </div>
            </div>
          </div>

          {/* Section C: Quick focus presets */}
          <div className="p-3 bg-[#0c1223] rounded border border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Sliders size={12} className="text-indigo-400 animate-pulse" />
              CALIBRATION PRESETS
            </span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => applyPreset('wide')}
                className="w-full px-2 py-1.5 text-left text-3xs font-bold uppercase rounded border border-slate-800 bg-[#12192b]/65 text-slate-300 hover:bg-[#18233e] hover:text-white transition-all cursor-pointer flex items-center justify-between"
                id="click_pinch_preset_wide"
              >
                <span>Wide camera field</span>
                <span className="text-[8px] bg-slate-800 text-slate-400 px-1 py-0.5 rounded">98% Crop</span>
              </button>
              <button
                onClick={() => applyPreset('narrow')}
                className="w-full px-2 py-1.5 text-left text-3xs font-bold uppercase rounded border border-slate-800 bg-[#12192b]/65 text-slate-300 hover:bg-[#18233e] hover:text-white transition-all cursor-pointer flex items-center justify-between"
                id="click_pinch_preset_narrow"
              >
                <span>Center box safety</span>
                <span className="text-[8px] bg-slate-850 text-slate-400 px-1 py-0.5 rounded">56% Crop</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

