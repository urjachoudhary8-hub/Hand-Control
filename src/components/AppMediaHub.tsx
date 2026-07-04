import React, { useEffect, useState } from 'react';
import { HandData } from '../types';
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, RotateCcw, Waves, Disc } from 'lucide-react';

interface AppMediaHubProps {
  hand: HandData;
  volume: number;
  setVolume: (v: number) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
}

interface Track {
  id: number;
  title: string;
  artist: string;
  duration: string;
  coverColor: string; // Tailwind class
}

const TRACKS_PLAYLIST: Track[] = [
  { id: 1, title: 'Hyperion Waves', artist: 'Neo-Tokyo Synth', duration: '3:45', coverColor: 'bg-indigo-600' },
  { id: 2, title: 'Solar Wind', artist: 'Cosmic Horizon', duration: '4:12', coverColor: 'bg-emerald-600' },
  { id: 3, title: 'Chroma Horizon', artist: 'Vapor Luster', duration: '2:58', coverColor: 'bg-rose-600' },
  { id: 4, title: 'Cyberpunk Odyssey', artist: 'Subgrid-88', duration: '5:24', coverColor: 'bg-amber-600' }
];

export default function AppMediaHub({ hand, volume, setVolume, addLog }: AppMediaHubProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTrackIdx, setActiveTrackIdx] = useState(0);
  const [trackProgress, setTrackProgress] = useState(30); // percentage (0-100)

  const activeTrack = TRACKS_PLAYLIST[activeTrackIdx];

  // Gestures Trigger: Wave left/right or scroll up/down
  useEffect(() => {
    // Media controls via gestures
    if (hand.gesture === 'SCROLL_UP') {
      setVolume(Math.min(100, volume + 4));
    } else if (hand.gesture === 'SCROLL_DOWN') {
      setVolume(Math.max(0, volume - 4));
    } else if (hand.gesture === 'WAVE_LEFT') {
      handlePrev();
      addLog(`Wave Left sweep: skipping back to previous track`, 'info');
    } else if (hand.gesture === 'WAVE_RIGHT') {
      handleNext();
      addLog(`Wave Right sweep: skipping forward to next track`, 'info');
    }
  }, [hand.gesture]);

  // Track progress simulations
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setTrackProgress((p) => {
        if (p >= 100) {
          handleNext();
          return 0;
        }
        return p + 0.5;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, activeTrackIdx]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    addLog(isPlaying ? 'Audio playback paused' : `Audio stream loaded: ${activeTrack.title}`, 'active');
  };

  const handleNext = () => {
    setActiveTrackIdx((idx) => (idx + 1) % TRACKS_PLAYLIST.length);
    setTrackProgress(0);
  };

  const handlePrev = () => {
    setActiveTrackIdx((idx) => (idx - 1 + TRACKS_PLAYLIST.length) % TRACKS_PLAYLIST.length);
    setTrackProgress(0);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans p-4 justify-between overflow-y-auto">
      
      {/* Title */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Music className="text-sky-400" size={18} />
          <h3 className="text-2xs font-bold uppercase tracking-widest text-slate-300 font-mono">
            Aero Media Deck
          </h3>
        </div>
        <div className="text-3xs font-mono text-slate-500 uppercase tracking-widest px-2 py-0.5 rounded border border-slate-800 bg-slate-950">
          Synthesizer Hub
        </div>
      </div>

      {/* Main player viewport wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center bg-slate-950/40 p-4 border border-slate-850 rounded-xl my-2">
        
        {/* Dynamic spinning Album Art column */}
        <div className="col-span-2 flex flex-col items-center justify-center relative">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center relative shadow-lg ${activeTrack.coverColor} transition-all duration-500`}>
            
            {/* Spinning groove details */}
            <div className={`absolute inset-3 border border-black/20 rounded-full flex items-center justify-center bg-black/45 shadow-inner ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }}>
              <div className="absolute inset-4 rounded-full border border-dashed border-white/10" />
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-black"></div>
              </div>
            </div>

            {/* Glowing disc core icons */}
            <Disc className={`text-white/45 absolute z-15 ${isPlaying ? 'animate-spin' : ''}`} size={24} />
          </div>

          <div className="text-center mt-3 leading-tight select-none">
            <h4 className="text-xs font-bold text-slate-200">{activeTrack.title}</h4>
            <span className="text-4xs font-mono uppercase text-sky-400">{activeTrack.artist}</span>
          </div>
        </div>

        {/* Playback spectrum levels & manual controllers slider */}
        <div className="col-span-3 flex flex-col justify-center h-full">
          
          {/* Animated Retro Equalizer spectrum bars */}
          <div className="flex items-end justify-between h-11 w-full px-2 gap-0.5 mb-4 select-none">
            {Array.from({ length: 24 }).map((_, i) => {
              // Simulated dynamic audio waves
              const height = isPlaying 
                ? `${12 + Math.sin(Date.now() / 250 + i * 0.7) * 30 + Math.random() * 20}%` 
                : '15%';
              return (
                <div 
                  key={i} 
                  className="flex-1 bg-gradient-to-t from-sky-500 to-cyan-400 rounded-xs transition-all duration-150"
                  style={{ height }}
                />
              );
            })}
          </div>

          {/* Progress Slider */}
          <div className="flex flex-col gap-1.5 w-full mb-3 font-mono">
            <div className="h-1 bg-slate-800 rounded-full w-full overflow-hidden">
              <div 
                className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${trackProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-4xs text-slate-500">
              <span>0:{(Math.floor(trackProgress * 0.03)).toString().padStart(2, '0')}</span>
              <span>{activeTrack.duration}</span>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={handlePrev}
              className="p-1 px-2.5 rounded hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer hover:text-white transition-colors"
              title="Prev Track"
            >
              <SkipBack size={14} />
            </button>
            <button 
              onClick={togglePlayback}
              className="p-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-full cursor-pointer hover:scale-105 transition-all shadow-md shadow-cyan-950 flex items-center justify-center"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            </button>
            <button 
              onClick={handleNext}
              className="p-1 px-2.5 rounded hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer hover:text-white transition-colors"
              title="Next Track"
            >
              <SkipForward size={14} />
            </button>
          </div>

        </div>

      </div>

      {/* Playlist selections scroll drawer */}
      <div className="border-t border-slate-800 pt-3 flex-1 flex flex-col h-[150px] overflow-hidden">
        <h4 className="text-3xs font-mono font-semibold uppercase text-slate-500 tracking-wide mb-1.5 flex items-center gap-1">
          <Waves size={11} className="text-slate-400" />
          Track Sequence Ledger (Scrolling enabled)
        </h4>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1" id="playlist_ledger">
          {TRACKS_PLAYLIST.map((track, idx) => (
            <button
              key={track.id}
              onClick={() => {
                setActiveTrackIdx(idx);
                setTrackProgress(0);
                setIsPlaying(true);
                addLog(`Track loaded: ${track.title}`, 'active');
              }}
              className={`w-full p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition-all ${
                idx === activeTrackIdx 
                  ? 'bg-sky-950/20 border-sky-500/35 text-sky-300 font-bold' 
                  : 'bg-slate-950/30 border-slate-900 md:hover:bg-slate-850 hover:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <div className={`w-1.5 h-1.5 rounded-full ${idx === activeTrackIdx ? 'bg-sky-400 animate-pulse' : 'bg-slate-800'}`}></div>
                <div className="truncate font-sans leading-tight">
                  <p className="text-2xs font-semibold">{track.title}</p>
                  <span className="text-4xs text-slate-500">{track.artist}</span>
                </div>
              </div>
              <span className="text-4xs font-mono">{track.duration}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Volume Indicators */}
      <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-850 mt-2 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <Volume2 size={13} className="text-slate-400" />
          <span className="text-3xs text-slate-500 uppercase font-semibold">Volume Grid:</span>
          <span className="text-2xs font-bold text-sky-400">{volume}%</span>
        </div>
        
        {/* Progress feedback line */}
        <div className="w-24 h-1.5 bg-slate-900 rounded p-0.5 border border-slate-800">
          <div className="h-full bg-sky-400 rounded-sm" style={{ width: `${volume}%` }}></div>
        </div>

        <div className="text-4xs text-slate-500 uppercase tracking-widest hidden sm:block">
          {hand.gesture === 'SCROLL_UP' ? 'Raising Volume' : hand.gesture === 'SCROLL_DOWN' ? 'Lowering Volume' : 'Calibrated'}
        </div>
      </div>

    </div>
  );
}
