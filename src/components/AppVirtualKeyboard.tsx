import React, { useEffect, useRef, useState } from 'react';
import { HandData } from '../types';
import { Keyboard, FileText, Trash2, Download, Delete, Sparkles } from 'lucide-react';

interface AppVirtualKeyboardProps {
  hand: HandData;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
}

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '?'],
];

export default function AppVirtualKeyboard({ hand, addLog }: AppVirtualKeyboardProps) {
  const [noteText, setNoteText] = useState('GREETINGS FROM HAND OS OPERATING RECEPTOR.');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  
  // Edge-triggered latch to ensure exactly one pinch triggers exactly one character
  const isPinchingRef = useRef(false);
  const keyRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Read saved note on mount
  useEffect(() => {
    const saved = localStorage.getItem('handos_gesture_note');
    if (saved) {
      setNoteText(saved);
    }
  }, []);

  // Listen to AI pilot autotyping broadcasts
  useEffect(() => {
    const handleAiTyping = (e: Event) => {
      const customEvent = e as CustomEvent;
      const textToType = customEvent.detail?.text || '';
      updateNoteText(noteText + '\n' + textToType);
    };

    window.addEventListener('aitype_note', handleAiTyping);
    return () => {
      window.removeEventListener('aitype_note', handleAiTyping);
    };
  }, [noteText]);

  // Update textbox in local storage
  const updateNoteText = (newVal: string) => {
    setNoteText(newVal);
    localStorage.setItem('handos_gesture_note', newVal);
  };

  // Coordinate check layout to classify which key the finger is hovering on
  useEffect(() => {
    if (!containerRef.current) return;

    // Get position of the keyboard container
    const keyboardEl = containerRef.current.querySelector('#virtual_keyboard_grid');
    if (!keyboardEl) {
      setHoveredKey(null);
      return;
    }

    const bounds = keyboardEl.getBoundingClientRect();
    const containerBounds = containerRef.current.getBoundingClientRect();

    // Map hand normalized coords to window space
    const handXInWindow = containerBounds.left + hand.x * containerBounds.width;
    const handYInWindow = containerBounds.top + hand.y * containerBounds.height;

    // Check if hand coordinate falls inside the virtual grid bounds
    if (
      handXInWindow >= bounds.left &&
      handXInWindow <= bounds.right &&
      handYInWindow >= bounds.top &&
      handYInWindow <= bounds.bottom
    ) {
      // Find which DOM key matches the coordinates
      let foundKey: string | null = null;
      for (const key of Object.keys(keyRefs.current)) {
        const btn = keyRefs.current[key];
        if (btn) {
          const btnBounds = btn.getBoundingClientRect();
          if (
            handXInWindow >= btnBounds.left &&
            handXInWindow <= btnBounds.right &&
            handYInWindow >= btnBounds.top &&
            handYInWindow <= btnBounds.bottom
          ) {
            foundKey = key;
            break;
          }
        }
      }
      setHoveredKey(foundKey);
    } else {
      setHoveredKey(null);
    }
  }, [hand.x, hand.y]);

  // Handle Pinch click inputs (detect edge transitions)
  useEffect(() => {
    const activePinch = hand.isPinching || hand.gesture === 'PINCH_CLICK';

    if (activePinch) {
      if (!isPinchingRef.current) {
        // Falling trigger moment: register key press
        isPinchingRef.current = true;
        if (hoveredKey) {
          executeKeyStroke(hoveredKey);
        }
      }
    } else {
      // Reset edge latch
      isPinchingRef.current = false;
    }
  }, [hand.isPinching, hand.gesture, hoveredKey]);

  const executeKeyStroke = (key: string) => {
    try {
      // Synthesize quick keyboard mechanical tap audio note
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch (_) {}

    if (key === 'SPACE') {
      updateNoteText(noteText + ' ');
      addLog('Key press: Space', 'info');
    } else if (key === 'BACK') {
      updateNoteText(noteText.slice(0, -1));
      addLog('Key press: Backspace', 'info');
    } else if (key === 'CLEAR') {
      updateNoteText('');
      addLog('Gesture Notepad document cleared.', 'warn');
    } else if (key === 'ENTER') {
      updateNoteText(noteText + '\n');
      addLog('Key press: Enter/Return', 'info');
    } else {
      updateNoteText(noteText + key);
      addLog(`Key typed: ${key}`, 'success');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([noteText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `handos-notepad-${Date.now()}.txt`;
      link.click();
      addLog('Notepad file downloaded.', 'success');
    } catch (e) {
      addLog('Download system isolated by Sandbox policy.', 'warn');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans p-4 justify-between overflow-y-auto" ref={containerRef}>
      
      {/* Title block */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Keyboard className="text-emerald-400" size={18} />
          <h3 className="text-2xs font-bold uppercase tracking-widest text-slate-300 font-mono">
            Aero Virtual Keyboard
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={handleDownload}
            className="p-1 px-2.5 bg-slate-950/40 hover:bg-slate-800 border border-slate-850 rounded-lg text-4xs font-mono font-medium tracking-wider flex items-center gap-1 transition-all"
            title="Download notes"
          >
            <Download size={10} className="text-emerald-400" />
            EXPORT
          </button>
          <button 
            onClick={() => executeKeyStroke('CLEAR')}
            className="p-1 px-2 bg-slate-950/40 hover:bg-rose-950/40 hover:border-rose-900 border border-slate-850 rounded-lg text-4xs font-mono text-rose-450 transition-all"
            title="Clear text note"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Notepad Textarea Viewport Box */}
      <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex-1 min-h-[90px] relative flex flex-col mb-3 font-mono shadow-inner select-none">
        <div className="absolute top-1 left-2 flex items-center gap-1 text-slate-700 pointer-events-none">
          <FileText size={10} />
          <span className="text-4xs uppercase tracking-wider font-semibold">Active Document (Autosaved)</span>
        </div>
        
        {/* Render note paragraph */}
        <div className="flex-1 overflow-y-auto text-xs text-sky-300 mt-4 leading-relaxed whitespace-pre-wrap select-all">
          {noteText || <em className="text-slate-650 italic">Gesture document is empty. Hover on keyboard and PINCH to type!</em>}
          <span className="w-1.5 h-3 bg-sky-400 inline-block animate-pulse ml-0.5" />
        </div>
      </div>

      {/* QWERTY Virtual Board Grid with coordinate coordinates detection wrapper */}
      <div id="virtual_keyboard_grid" className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-850 flex flex-col gap-1.5 select-none relative">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1">
            {row.map((char) => {
              const isHovered = hoveredKey === char;
              return (
                <button
                  key={char}
                  ref={(el) => { keyRefs.current[char] = el; }}
                  onClick={() => executeKeyStroke(char)} // Support mouse overlays
                  className={`flex-1 h-8 rounded-lg font-mono text-2xs font-semibold flex items-center justify-center border transition-all ${
                    isHovered 
                      ? 'bg-sky-500 border-white text-white scale-105 shadow-md ring-2 ring-sky-300/40 z-10' 
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-350'
                  }`}
                >
                  {char}
                </button>
              );
            })}
          </div>
        ))}

        {/* Action Controls Space, back row */}
        <div className="flex gap-1 justify-center mt-0.5">
          {/* Backspace Button */}
          <button
            ref={(el) => { keyRefs.current['BACK'] = el; }}
            onClick={() => executeKeyStroke('BACK')}
            className={`w-[22%] h-8 rounded-lg font-mono text-4xs font-bold uppercase flex items-center justify-center gap-1 border transition-all ${
              hoveredKey === 'BACK' 
                ? 'bg-amber-500 border-white text-white scale-105 z-10' 
                : 'bg-slate-900 border-slate-800 text-slate-350'
            }`}
          >
            <Delete size={11} />
            BACK
          </button>

          {/* Spacebar */}
          <button
            ref={(el) => { keyRefs.current['SPACE'] = el; }}
            onClick={() => executeKeyStroke('SPACE')}
            className={`flex-1 h-8 rounded-lg font-mono text-3xs font-semibold flex items-center justify-center border tracking-widest transition-all ${
              hoveredKey === 'SPACE' 
                ? 'bg-sky-500 border-white text-white scale-105 z-10' 
                : 'bg-slate-900 border-slate-800 text-slate-450'
            }`}
          >
            SPACEBAR
          </button>

          {/* Enter Key */}
          <button
            ref={(el) => { keyRefs.current['ENTER'] = el; }}
            onClick={() => executeKeyStroke('ENTER')}
            className={`w-[22%] h-8 rounded-lg font-mono text-4xs font-bold uppercase flex items-center justify-center border transition-all ${
              hoveredKey === 'ENTER' 
                ? 'bg-emerald-600 border-white text-white scale-105 z-10' 
                : 'bg-slate-900 border-slate-800 text-slate-350'
            }`}
          >
            RETURN ↵
          </button>
        </div>

        {/* Calibration tracking target highlight overlay indicator */}
        {hoveredKey && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-sky-950 border border-sky-600 text-[8px] rounded font-mono text-sky-400 capitalize flex items-center gap-1 select-none pointer-events-none animate-bounce">
            <Sparkles size={8} /> Hover targeting: <strong className="text-white font-bold">{hoveredKey}</strong> (Pinch to lock typings)
          </div>
        )}
      </div>

      <div className="mt-2 text-center pointer-events-none select-none">
        <span className="text-4xs text-slate-650 font-mono tracking-widest leading-none">
          Grid: Hover finger over keys, then PINCH to type!
        </span>
      </div>

    </div>
  );
}
