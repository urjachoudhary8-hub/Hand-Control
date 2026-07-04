import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Bot, 
  Image as ImageIcon, 
  Volume2, 
  Video as VideoIcon, 
  Mic, 
  MicOff, 
  Play, 
  Pause,
  Download,
  Check,
  RefreshCw,
  Tv,
  HelpCircle
} from 'lucide-react';
import { LaptopSettings } from '../types';

interface AppAiWorkspaceProps {
  settings: LaptopSettings;
  updateSettings: (s: Partial<LaptopSettings>) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
  launchApp: (id: any) => void;
  changeTheme: (theme: any) => void;
  changeVolume: (volume: number) => void;
  onTypeNote: (text: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  actions?: Array<{ name: string; args: any }>;
}

export default function AppAiWorkspace({
  settings,
  updateSettings,
  addLog,
  launchApp,
  changeTheme,
  changeVolume,
  onTypeNote
}: AppAiWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'copilot' | 'wallpaper' | 'voice' | 'videoloop'>('copilot');

  // ==========================================
  // STATE: 1. COPILOT
  // ==========================================
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Aero AI Terminal online. Ask me to launch applications, change themes, update volume level, type thoughts into Gesture Notepad, or ask questions! (e.g. 'Open Air Paint and turn volume to 80%')",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // ==========================================
  // STATE: 2. WALLPAPER
  // ==========================================
  const [imagePrompt, setImagePrompt] = useState('An astronaut painting space on a virtual canvas, synthwave aesthetic, 4k');
  const [imageRatio, setImageRatio] = useState<'1:1' | '16:9' | '9:16'>('16:9');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageProgressText, setImageProgressText] = useState('');

  // ==========================================
  // STATE: 3. VOICE
  // ==========================================
  const [voiceText, setVoiceText] = useState('Welcome to Hand OS, the future of intuitive gesture command interfaces.');
  const [voiceActor, setVoiceActor] = useState<'Zephyr' | 'Kore' | 'Fenrir'>('Zephyr');
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ==========================================
  // STATE: 4. VIDEOLOOP
  // ==========================================
  const [videoPrompt, setVideoPrompt] = useState('A digital neon waterfall flowing through circuit boards, loop');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoProgressMessage, setVideoProgressMessage] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  // Scroll chats down
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Clean Audio Node
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // ==========================================
  // HANDLERS: 1. COPILOT CHAT + FUNCTIONS
  // ==========================================
  const handleSendChat = async (typedMsg?: string) => {
    const textToSend = typedMsg || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    if (!typedMsg) {
      setChatInput('');
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp
    };

    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, history: chatHistory })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Chat connection error.');
      }

      const data = await res.json();
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: data.actions
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Execute any invoked system actions!
      if (data.actions && data.actions.length > 0) {
        for (const action of data.actions) {
          executeOSAction(action.name, action.args);
        }
      }

    } catch (err: any) {
      addLog(`AI Copilot Error: ${err.message || err}`, 'warn');
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Connection sequence faulted: ${err.message || 'Gemini API not configured. Connect your key via Setting > Secrets Panel.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const executeOSAction = (name: string, args: any) => {
    addLog(`AI requested OS pilot action: ${name}`, 'active');
    
    switch (name) {
      case 'open_app':
        if (args.appId) {
          launchApp(args.appId);
          addLog(`OS piloted: Opened ${args.appId}`, 'success');
        }
        break;
      case 'change_theme':
        if (args.theme) {
          changeTheme(args.theme);
          addLog(`OS piloted: Changed theme to ${args.theme}`, 'success');
        }
        break;
      case 'change_volume':
        if (args.volume !== undefined) {
          changeVolume(args.volume);
          addLog(`OS piloted: Volume set to ${args.volume}%`, 'success');
        }
        break;
      case 'type_notes':
        if (args.text) {
          onTypeNote(args.text);
          addLog(`OS piloted: Typed notes automatically`, 'success');
        }
        break;
      case 'speak_phrase':
        if (args.phrase) {
          handleTriggerTTS(args.phrase);
          addLog(`OS piloted: Synthesis voice broadcast started`, 'success');
        }
        break;
      default:
        console.warn('Unknown tool invocation called by AI:', name, args);
    }
  };

  // ==========================================
  // HANDLERS: 2. IMAGE WALLPAPER SYNTHESIS
  // ==========================================
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || imageLoading) return;

    setImageLoading(true);
    setGeneratedImage(null);
    setImageProgressText('Generating neural seed vectors...');
    addLog('Synthesizing dream wallpaper via Imagen...', 'info');

    const progressPhases = [
      'Injecting sub-space latent vectors...',
      'Evolving noise matrices via Gemini Imagen standard core...',
      'Modulating quantum texture layers...',
      'Finalizing chromatic rendering layers...'
    ];

    let phaseIdx = 0;
    const interval = setInterval(() => {
      if (phaseIdx < progressPhases.length) {
        setImageProgressText(progressPhases[phaseIdx]);
        phaseIdx++;
      }
    }, 1800);

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, aspectRatio: imageRatio })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Synthesis failed.');
      }

      const data = await res.json();
      setGeneratedImage(data.imageUrl);
      addLog('Synthesized wallpaper successfully!', 'success');

    } catch (err: any) {
      addLog(`Aero Canvas Error: ${err.message || err}`, 'warn');
    } finally {
      clearInterval(interval);
      setImageLoading(false);
    }
  };

  const setAsDesktopWallpaper = () => {
    if (!generatedImage) return;
    updateSettings({ customWallpaper: generatedImage } as any);
    addLog('Custom synthesized wallpaper projected to background.', 'success');
  };

  // ==========================================
  // HANDLERS: 3. TTS VOICE BROADCAST
  // ==========================================
  const handleTriggerTTS = async (phraseToSend?: string) => {
    const textToSpeak = phraseToSend || voiceText;
    if (!textToSpeak.trim() || voiceLoading) return;

    setVoiceLoading(true);
    setGeneratedAudio(null);
    addLog(`Synthesizing speech via TTS utilizing ${voiceActor} vocals...`, 'info');

    try {
      const res = await fetch('/api/ai/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToSpeak, voice: voiceActor })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'TTS failure.');
      }

      const data = await res.json();
      setGeneratedAudio(data.audioUrl);

      // Play instantly
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play();
          addLog('Holographic vocal array speaking...', 'success');
        }
      }, 100);

    } catch (err: any) {
      addLog(`Speech synthesis error: ${err.message}`, 'warn');
    } finally {
      setVoiceLoading(false);
    }
  };

  // ==========================================
  // HANDLERS: 4. VIDEOLOOP (VEO 3.1)
  // ==========================================
  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim() || videoLoading) return;

    setVideoLoading(true);
    setGeneratedVideoUrl(null);
    setVideoProgress(5);
    setVideoProgressMessage('Sending prompt to GPU render cluster...');
    addLog(`Initializing Cinematic Videoloop: "${videoPrompt}"`, 'info');

    try {
      const res = await fetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: videoPrompt, aspectRatio: '16:9' })
      });

      if (!res.ok) {
        throw new Error(await res.text() || 'Video render initialization failed.');
      }

      const data = await res.json();
      const opName = data.operationName;

      setVideoProgress(15);
      setVideoProgressMessage('Operation registered. Polling status...');

      // Polling sequence
      let pollAttempts = 0;
      const maxPollAttempts = 20; // up to 120s
      
      const pollTimer = setInterval(async () => {
        pollAttempts++;
        const pState = Math.min(15 + pollAttempts * 4, 90);
        setVideoProgress(pState);
        setVideoProgressMessage(`Simulating frame layout... Pass ${pollAttempts}/20`);

        try {
          const sRes = await fetch('/api/ai/video-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ operationName: opName })
          });

          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.done) {
              clearInterval(pollTimer);
              setVideoProgress(95);
              setVideoProgressMessage('Rendering complete! Downloading raw stream...');
              
              // Proceed to download
              const dlRes = await fetch('/api/ai/video-download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationName: opName })
              });

              if (!dlRes.ok) {
                throw new Error('Streaming download failed.');
              }

              const blob = await dlRes.blob();
              const vUrl = URL.createObjectURL(blob);
              setGeneratedVideoUrl(vUrl);
              setVideoProgress(100);
              setVideoProgressMessage('Holographic loop successfully loaded!');
              addLog('Videoloop synthetic stream assembled successfully!', 'success');
              setVideoLoading(false);
            }
          }
        } catch (pollErr: any) {
          console.error('Polling error', pollErr);
        }

        if (pollAttempts >= maxPollAttempts) {
          clearInterval(pollTimer);
          addLog('Videoloop assembly timed out. Ensure high premium GPU nodes are allocated.', 'warn');
          setVideoLoading(false);
        }

      }, 5000);

    } catch (err: any) {
      addLog(`CineLoop Error: ${err.message || err}`, 'warn');
      setVideoLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0c1223] text-slate-100 font-sans" id="click_pinch_aiworkspace">
      
      {/* Dynamic Audio Node */}
      {generatedAudio && (
        <audio ref={audioRef} src={generatedAudio} className="hidden" controls />
      )}

      {/* Main Top Selector tabs bar */}
      <div className="flex border-b border-indigo-950 bg-slate-950/40 p-1 gap-1 flex-shrink-0">
        <button
          onClick={() => setActiveTab('copilot')}
          id="click_pinch_tab_copilot"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs rounded transition uppercase tracking-widest font-mono font-medium ${
            activeTab === 'copilot' 
              ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold' 
              : 'text-slate-450 hover:bg-slate-900/40 border border-transparent'
          }`}
        >
          <Bot size={13} />
          Copilot
        </button>
        <button
          onClick={() => setActiveTab('wallpaper')}
          id="click_pinch_tab_wallpaper"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs rounded transition uppercase tracking-widest font-mono font-medium ${
            activeTab === 'wallpaper' 
              ? 'bg-pink-500/10 border border-pink-500/30 text-pink-400 font-bold' 
              : 'text-slate-450 hover:bg-slate-900/40 border border-transparent'
          }`}
        >
          <ImageIcon size={13} />
          Canvas
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          id="click_pinch_tab_voice"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs rounded transition uppercase tracking-widest font-mono font-medium ${
            activeTab === 'voice' 
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold' 
              : 'text-slate-450 hover:bg-slate-900/40 border border-transparent'
          }`}
        >
          <Volume2 size={13} />
          TTS
        </button>
        <button
          onClick={() => setActiveTab('videoloop')}
          id="click_pinch_tab_videoloop"
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs rounded transition uppercase tracking-widest font-mono font-medium ${
            activeTab === 'videoloop' 
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold' 
              : 'text-slate-450 hover:bg-slate-900/40 border border-transparent'
          }`}
        >
          <VideoIcon size={13} />
          Veo-Loop
        </button>
      </div>

      {/* Tabs View content */}
      <div className="flex-grow overflow-y-auto p-3">
        
        {/* TAB 1: COPILOT PANEL */}
        {activeTab === 'copilot' && (
          <div className="flex flex-col h-full min-h-[220px]">
            {/* Scrollable messages container */}
            <div className="flex-grow space-y-3 p-1.5 overflow-y-auto max-h-[190px] min-h-[140px] bg-slate-950/20 rounded border border-indigo-950/40 mb-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded px-2.5 py-1.5 text-2xs leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-200' 
                      : 'bg-indigo-950/50 border border-indigo-900/30 text-slate-100'
                  }`}>
                    {/* Header meta */}
                    <div className="flex items-center gap-1.5 text-[8px] opacity-60 uppercase mb-0.5 tracking-wider font-mono">
                      <span>{m.role === 'user' ? 'Operator' : 'Aero Assistant'}</span>
                      <span className="text-[7px]">•</span>
                      <span>{m.timestamp}</span>
                    </div>
                    {/* Text content */}
                    <p className="whitespace-pre-line">{m.content}</p>

                    {/* Trigger actions badge list if available */}
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t border-indigo-900/45 flex flex-wrap gap-1">
                        {m.actions.map((act, idx) => (
                          <span key={idx} className="text-[7px] font-mono px-1 py-0.5 bg-cyan-950/60 border border-cyan-700/40 rounded text-cyan-300 flex items-center gap-0.5">
                            <Sparkles size={8} className="animate-pulse" />
                            {act.name}({JSON.stringify(act.args)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>Aero synapse processing...</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Instant suggested query shortcuts */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              <button 
                onClick={() => handleSendChat("Open Air Paint and turn volume to 80%")}
                id="click_pinch_suggest_paint"
                className="text-[9px] font-mono font-medium px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded transition text-slate-300"
              >
                Launch Canvas + Loud Volume
              </button>
              <button 
                onClick={() => handleSendChat("Type 'Greetings from Gemini AI!' in notepad")}
                id="click_pinch_suggest_notepad"
                className="text-[9px] font-mono font-medium px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded transition text-slate-300"
              >
                Autotype Greeting Note
              </button>
              <button 
                onClick={() => handleSendChat("Switch theme to cyberpunk")}
                id="click_pinch_suggest_cyber"
                className="text-[9px] font-mono font-medium px-2 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded transition text-slate-300"
              >
                Cosmetic Cyber Theme
              </button>
            </div>

            {/* Input message builder bar */}
            <div className="flex gap-2.5 items-center">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Ask Aero AI to control OS apps and settings..."
                className="flex-grow bg-slate-950/65 border border-indigo-950 text-2xs rounded px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
              <button
                onClick={() => handleSendChat()}
                id="click_pinch_send_chat"
                disabled={chatLoading || !chatInput.trim()}
                className="p-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded transition disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: WALLPAPER SYNTHESIZER */}
        {activeTab === 'wallpaper' && (
          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-mono tracking-widest text-pink-400">Prompt Canvas</label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe wallpaper..."
                rows={2}
                className="w-full bg-slate-950/60 border border-purple-950 text-2xs rounded p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pink-500/50 resize-none"
              />
            </div>

            {/* Ratios selector config */}
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Projection Grid:</span>
              <div className="flex gap-1">
                {(['1:1', '16:9', '9:16'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setImageRatio(r)}
                    id={`click_pinch_ratio_${r.replace(':', '_')}`}
                    className={`px-2 py-0.5 border text-[10px] rounded hover:border-pink-500/40 ${
                      imageRatio === r 
                        ? 'bg-pink-500/10 border-pink-500/45 text-pink-400 font-bold' 
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Launch synthesis button */}
            <button
              onClick={handleGenerateImage}
              id="click_pinch_btn_generate_image"
              disabled={imageLoading || !imagePrompt.trim()}
              className="w-full py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-mono font-bold tracking-widest uppercase rounded transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Sparkles size={13} className={imageLoading ? 'animate-spin' : ''} />
              {imageLoading ? 'Modulating Latent Field...' : 'Synthesize Wallpaper'}
            </button>

            {/* Output Display box */}
            <div className="aspect-[16/10] bg-slate-950/60 border border-purple-950/50 rounded flex flex-col items-center justify-center text-center p-2.5 overflow-hidden relative">
              {imageLoading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-10 h-10 border-2 border-dashed border-pink-500 rounded-full animate-spin flex items-center justify-center">
                    <div className="w-5 h-5 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-full animate-pulse" />
                  </div>
                  <span className="text-[10px] font-mono text-purple-300 animate-pulse">{imageProgressText}</span>
                </div>
              ) : generatedImage ? (
                <div className="w-full h-full flex flex-col items-center relative group">
                  <img 
                    src={generatedImage} 
                    alt="Synthesized core" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain rounded"
                  />
                  
                  {/* Overlay projecting button triggers */}
                  <div className="absolute inset-0 bg-slate-950/80 rounded opacity-0 group-hover:opacity-100 flex flex-col gap-2 items-center justify-center transition-all">
                    <button
                      onClick={setAsDesktopWallpaper}
                      id="click_pinch_set_wallpaper"
                      className="px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded font-mono text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 hover:brightness-110"
                    >
                      <Check size={11} />
                      Project to Wallpaper
                    </button>
                    <a
                      href={generatedImage}
                      download="holographic_wallpaper.png"
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-pink-400 rounded font-mono text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 hover:bg-slate-800"
                    >
                      <Download size={11} />
                      Download Raw PNG
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-500 gap-1 font-mono">
                  <Bot size={22} className="opacity-40 text-pink-400" />
                  <p className="text-[10px] uppercase">Aero Dream Canvas Empty</p>
                  <p className="text-[8px] max-w-[80%] leading-relaxed">Enter an artistic design prompt and launch the synthesizer to generate high-fidelity PNG wallpapers on the fly.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SPEECH READER (TTS STUDIO) */}
        {activeTab === 'voice' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">Synthesizer Script</label>
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Enter narrative scripts..."
                rows={3}
                className="w-full bg-slate-950/60 border border-emerald-950 text-2xs rounded p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
              />
            </div>

            {/* Vocal profiles */}
            <div className="grid grid-cols-3 gap-1.5">
              {(['Zephyr', 'Kore', 'Fenrir'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVoiceActor(v)}
                  id={`click_pinch_voice_${v}`}
                  className={`py-1.5 border font-mono text-[9px] rounded uppercase flex flex-col items-center justify-center transition ${
                    voiceActor === v 
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850'
                  }`}
                >
                  <span className="font-bold">{v}</span>
                  <span className="text-[7px] text-slate-500 italic">
                    {v === 'Zephyr' && 'Tech/Zephyr'}
                    {v === 'Kore' && 'Soft/Vocalist'}
                    {v === 'Fenrir' && 'Bass/Cinematic'}
                  </span>
                </button>
              ))}
            </div>

            {/* Speech synthesis execute button */}
            <button
              onClick={() => handleTriggerTTS()}
              id="click_pinch_btn_generate_speech"
              disabled={voiceLoading || !voiceText.trim()}
              className="w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold tracking-widest uppercase rounded transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Volume2 size={13} className={voiceLoading ? 'animate-bounce' : ''} />
              {voiceLoading ? 'Modulating Synthesizer Strings...' : 'Load Holographic Audio'}
            </button>

            {/* Waveform indicator / Control */}
            {generatedAudio && (
              <div className="p-3 bg-slate-950/80 border border-emerald-950/50 rounded flex items-center justify-between font-mono">
                <div className="flex items-center gap-2 text-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                  <span className="text-slate-300">VOCAL CORE: <strong className="text-emerald-400 uppercase">{voiceActor}</strong></span>
                </div>
                <button
                  onClick={() => {
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                      audioRef.current.play();
                    }
                  }}
                  id="click_pinch_replay_audio"
                  className="px-2 py-0.5 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-[9px] uppercase tracking-wider rounded flex items-center gap-1"
                >
                  <Play size={9} />
                  Re-synth
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VIDEOLOOP GENERATOR */}
        {activeTab === 'videoloop' && (
          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-mono tracking-widest text-amber-500">CineLoop Narrative Directives</label>
              <textarea
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder="Neon cyber world rendering loops..."
                rows={2}
                className="w-full bg-slate-950/60 border border-amber-950 text-2xs rounded p-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            {/* Launch render button */}
            <button
              onClick={handleGenerateVideo}
              id="click_pinch_btn_generate_video"
              disabled={videoLoading || !videoPrompt.trim()}
              className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-mono font-bold tracking-widest uppercase rounded transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <VideoIcon size={13} className={videoLoading ? 'animate-pulse' : ''} />
              {videoLoading ? 'Rendering Veo Cineloop...' : 'Render Cinematic Loop'}
            </button>

            {/* Output screen video display */}
            <div className="aspect-[16/9] bg-slate-950/80 border border-amber-950/45 rounded flex flex-col items-center justify-center text-center p-3 overflow-hidden relative">
              {videoLoading ? (
                <div className="flex flex-col items-center gap-3 w-[85%]">
                  <div className="relative w-full h-1.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between w-full text-[8px] font-mono text-slate-500">
                    <span className="animate-pulse">{videoProgressMessage}</span>
                    <span>{videoProgress}%</span>
                  </div>
                </div>
              ) : generatedVideoUrl ? (
                <div className="w-full h-full relative flex flex-col">
                  <video 
                    src={generatedVideoUrl} 
                    className="w-full h-full object-cover rounded"
                    autoPlay
                    loop
                    muted
                    controls
                  />
                  
                  {/* Floating download ribbon */}
                  <div className="absolute right-2 top-2">
                    <a
                      href={generatedVideoUrl}
                      download="holographic_cineloop.mp4"
                      className="p-1 px-1.5 bg-slate-905/85 text-amber-500 border border-amber-500/40 rounded text-[7px] font-mono uppercase font-bold flex items-center gap-1 hover:bg-slate-900"
                    >
                      <Download size={10} />
                      Export MP4
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-500 gap-1 font-mono">
                  <Tv size={22} className="opacity-40 text-amber-500" />
                  <p className="text-[10px] uppercase">Veo CineLoop Panel Blank</p>
                  <p className="text-[8px] max-w-[80%] leading-relaxed">Synthesize a short MP4 cinematic animation loop using modern Veo 3.1 ultra-low-latency video architecture models.</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Cyberpunk high density bar footer */}
      <div className="bg-slate-950/70 p-1.5 border-t border-indigo-950/45 text-[8px] font-mono opacity-50 uppercase flex justify-between tracking-wider flex-shrink-0">
        <span>GEMINI ACTIVE // HIGH SPEED APIS</span>
        <span>MAPPED_PILOT=1</span>
      </div>

    </div>
  );
}
