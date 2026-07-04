import React, { useEffect, useRef, useState } from 'react';
import { HandData } from '../types';
import { Palette, Trash, Download, Eraser, Circle, Lock, Unlock } from 'lucide-react';

interface AppAirPaintProps {
  hand: HandData;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
}

const PAINT_COLORS = [
  { name: 'Neon Aqua', value: '#38bdf8' },
  { name: 'Cyber Pink', value: '#f43f5e' },
  { name: 'Laser Lime', value: '#10b981' },
  { name: 'Volt Yellow', value: '#f59e0b' },
  { name: 'Eraser', value: '#0f172a' } // Clears/Erases with background slate hex
];

export default function AppAirPaint({ hand, addLog }: AppAirPaintProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [brushColor, setBrushColor] = useState('#38bdf8');
  const [brushSize, setBrushSize] = useState(6);
  const [isLocked, setIsLocked] = useState(false); // Enable manual drawing if tracking is busy

  const lastCoords = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas on initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const bounds = canvas.parentElement?.getBoundingClientRect();
    canvas.width = bounds?.width || 500;
    canvas.height = bounds?.height || 350;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a'; // Deep background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Main draw update engine linked to frame rate hand changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check if drawing is active
    const shouldDraw = (hand.gesture === 'PINCH_CLICK' || hand.isPinching) && !isLocked;

    if (shouldDraw) {
      // Map hand relative coordinate (0-1) to pixel canvas size
      const pixelX = hand.x * canvas.width;
      const pixelY = hand.y * canvas.height;

      ctx.shadowBlur = brushColor === '#0f172a' ? 0 : 6;
      ctx.shadowColor = brushColor;
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushColor === '#0f172a' ? brushSize * 3 : brushSize; // Make eraser wider
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (lastCoords.current) {
        ctx.moveTo(lastCoords.current.x, lastCoords.current.y);
      } else {
        ctx.moveTo(pixelX, pixelY);
      }
      ctx.lineTo(pixelX, pixelY);
      ctx.stroke();

      lastCoords.current = { x: pixelX, y: pixelY };
    } else {
      // Release drawing node to allow lines spacing
      lastCoords.current = null;
    }
  }, [hand.x, hand.y, hand.gesture, hand.isPinching, brushColor, brushSize, isLocked]);

  // Fist gesture triggers canvas clearing (excellent interaction)
  useEffect(() => {
    if ((hand.gesture === 'GRAB' || hand.isFist) && !isLocked) {
      clearCanvas();
      addLog('Closed-fist sweep triggered. Drawing field sterilized.', 'warn');
    }
  }, [hand.gesture, hand.isFist]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lastCoords.current = null;
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `handos-airart-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      addLog('Hand art file exported successfully!', 'success');
    } catch (err) {
      addLog('Export module failed. Check sandbox security.', 'warn');
    }
  };

  // Alternative fallback manual click-drawing support inside paint window
  const handleManualDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isLocked) return; // Only process if mouse drawing overrides hand tracking
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bounds = canvas.getBoundingClientRect();
    const pixelX = e.clientX - bounds.left;
    const pixelY = e.clientY - bounds.top;

    ctx.shadowBlur = brushColor === '#0f172a' ? 0 : 6;
    ctx.shadowColor = brushColor;
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';

    if (e.buttons === 1) {
      ctx.beginPath();
      if (lastCoords.current) {
        ctx.moveTo(lastCoords.current.x, lastCoords.current.y);
      } else {
        ctx.moveTo(pixelX, pixelY);
      }
      ctx.lineTo(pixelX, pixelY);
      ctx.stroke();
      lastCoords.current = { x: pixelX, y: pixelY };
    } else {
      lastCoords.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-slate-800 text-slate-100 font-sans" ref={containerRef}>
      
      {/* Tool header bar */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        
        {/* Colors selector */}
        <div className="flex items-center gap-1.5" id="paint_colors">
          <span className="text-3xs text-slate-500 uppercase font-mono font-semibold tracking-wide mr-1 select-none">Palette:</span>
          {PAINT_COLORS.map((col) => (
            <button
              key={col.name}
              onClick={() => {
                setBrushColor(col.value);
                addLog(`Ink changed to: ${col.name}`, 'info');
              }}
              title={col.name}
              className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer transition-all ${
                brushColor === col.value 
                  ? 'border-white scale-110 shadow-md ring-1 ring-sky-500/50' 
                  : 'border-slate-800 hover:scale-105 hover:border-slate-550'
              }`}
              style={{ backgroundColor: col.value === '#0f172a' ? '#1e293b' : col.value }}
            >
              {col.name === 'Eraser' && <Eraser size={10} className="text-slate-300" />}
            </button>
          ))}
        </div>

        {/* Thickness controls & system locks */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 min-w-[70px]">
            <Circle size={8} className="text-slate-500" />
            <input
              type="range"
              min="2"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-14 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              title="Weight"
            />
            <span className="text-3xs font-mono text-slate-400">{brushSize}px</span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            
            {/* Draw mode override lock (useful for precise checks) */}
            <button
              onClick={() => {
                setIsLocked(!isLocked);
                addLog(isLocked ? 'Aero tracking active' : 'Tracking decoupled. Drag mouse to draw.', 'info');
              }}
              className={`p-1 rounded md:hover:bg-slate-800 text-slate-400 flex items-center gap-1 transition-all ${
                isLocked ? 'text-amber-400 bg-amber-955' : ''
              }`}
              title={isLocked ? 'Click to re-enable hand control' : 'Click to lock cursor & draw with mouse'}
            >
              {isLocked ? <Lock size={13} /> : <Unlock size={13} />}
              <span className="text-3xs font-mono font-semibold uppercase">{isLocked ? 'Mouse Locked' : 'Aero Active'}</span>
            </button>

            <button
              onClick={clearCanvas}
              className="p-1 rounded md:hover:bg-slate-800 text-rose-400 hover:text-rose-300 cursor-pointer"
              title="Flush Drawing Pad"
            >
              <Trash size={13} />
            </button>

            <button
              onClick={handleDownload}
              className="p-1 rounded md:hover:bg-slate-800 text-sky-400 hover:text-sky-300 cursor-pointer"
              title="Export Masterpiece (.png)"
            >
              <Download size={13} />
            </button>
          </div>
        </div>

      </div>

      {/* Art Stage canvas viewports */}
      <div className="flex-1 relative bg-slate-950 overflow-hidden" id="canvas_viewport">
        <canvas
          ref={canvasRef}
          onMouseDown={(e) => {
            if (isLocked) {
              lastCoords.current = null;
            }
          }}
          onMouseMove={handleManualDraw}
          onMouseUp={() => { lastCoords.current = null; }}
          className="w-full h-full cursor-crosshair select-none block"
        />

        {/* Dynamic Canvas Guide overlays during aero draws */}
        {!isLocked && (hand.gesture === 'PINCH_CLICK' || hand.isPinching) && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-3xs font-mono text-emerald-300 animate-pulse uppercase pointer-events-none">
            Aero Ink Drawing Active
          </div>
        )}

        <div className="absolute bottom-2 left-3 text-3xs font-mono text-slate-500 bg-slate-950/80 px-1.5 py-0.5 rounded pointer-events-none leading-none select-none">
          {!isLocked ? 'Tip: Pinch to paint, make a FIST to wipe clear' : 'Mouse Overwrite engaged'}
        </div>
      </div>

    </div>
  );
}
