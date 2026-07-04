import React, { useEffect, useState } from 'react';
import { HandData } from '../types';
import { GraduationCap, ArrowRight, CheckCircle2, Navigation, HeartHandshake, MousePointer, HandMetal } from 'lucide-react';

interface AppGuideProps {
  hand: HandData;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
}

export default function AppGuide({ hand, addLog }: AppGuideProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState<boolean[]>([false, false, false, false]);

  const steps = [
    {
      title: 'Initialize Hand Tracking',
      description: 'Position your hand inside the camera frame or simulate using the Mouse Pad. Extend only your target Index Finger straight up to map the mouse cursor.',
      icon: <MousePointer className="text-sky-400" size={32} />,
      expected: 'POINTER',
      successMessage: 'Pointer calibration lock verified!',
      validate: (h: HandData) => h.gesture === 'POINTER' || h.gesture === 'SCROLL_UP' || h.gesture === 'SCROLL_DOWN'
    },
    {
      title: 'Perfecting the Pinch TAP',
      description: 'Bring your Index Finger Tip and Thumb Tip together to PINCH. This registers a virtual double-click or tap. Hold it for 1.5 seconds to build charge.',
      icon: <GraduationCap className="text-emerald-450" size={32} />,
      expected: 'PINCH_CLICK',
      successMessage: 'Pinch Click action recognized perfectly!',
      validate: (h: HandData) => h.isPinching || h.gesture === 'PINCH_CLICK'
    },
    {
      title: 'Activating Fist GRAB & Hold',
      description: 'Fold all fingers into a closed fist (or grab in the simulator). This will let you grab and carry application windows or drag elements around the desktop.',
      icon: <HandMetal className="text-rose-400" size={32} />,
      expected: 'GRAB',
      successMessage: 'Fist Grab grip validated!',
      validate: (h: HandData) => h.isFist || h.gesture === 'GRAB'
    },
    {
      title: 'Natural Air Scrolling',
      description: 'Hold three fingers straight up together (Index, Middle, Ring). Swipe them up or down quickly. This triggers scroll states in large documents or the media library.',
      icon: <CheckCircle2 className="text-amber-400" size={32} />,
      expected: 'SCROLL',
      successMessage: 'Dynamic system scroll gesture active!',
      validate: (h: HandData) => h.gesture === 'SCROLL_UP' || h.gesture === 'SCROLL_DOWN'
    }
  ];

  // Hook 1: Process current gesture hold progress
  useEffect(() => {
    if (step >= steps.length) return;
    if (completed[step]) return; // pause updates when completed

    const currentStep = steps[step];
    const isMatching = currentStep.validate(hand);

    if (isMatching) {
      setProgress((p) => {
        const nextProgress = p + 2.5;
        return nextProgress >= 100 ? 100 : nextProgress;
      });
    } else {
      setProgress((p) => Math.max(0, p - 1.5));
    }
  }, [hand, step, completed]);

  // Hook 2: Handlers to trigger completion procedures once progress hits 100%
  useEffect(() => {
    if (step >= steps.length) return;
    
    if (progress >= 100 && !completed[step]) {
      const nextCompleted = [...completed];
      nextCompleted[step] = true;
      setCompleted(nextCompleted);

      const currentStep = steps[step];
      addLog(currentStep.successMessage, 'success');

      const timer = setTimeout(() => {
        setStep((s) => s + 1);
        setProgress(0);
      }, 600);

      return () => clearTimeout(timer);
    }
  }, [progress, step, completed, addLog]);

  const restartGuide = () => {
    setStep(0);
    setProgress(0);
    setCompleted([false, false, false, false]);
    addLog('Gesture tutor modules updated. Starting fresh.', 'info');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 p-5 font-sans justify-between overflow-y-auto">
      
      {/* Title block */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="text-sky-400" size={24} />
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-mono">
            Hand OS Training Academy
          </h2>
        </div>
        <p className="text-xs text-slate-400">Master the science of hand-gesture computer control inside our sandbox virtual OS.</p>
      </div>

      {step < steps.length ? (
        /* TRAINING ACTIVE STEP */
        <div className="flex-1 flex flex-col justify-center items-center py-6 px-4 bg-slate-950/60 rounded-xl border border-slate-800/80 my-2">
          
          {/* Badge indicator */}
          <div className="mb-4 flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 border border-slate-700 shadow-inner">
            {steps[step].icon}
          </div>

          <span className="text-3xs font-mono font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
            Calibration Step {step + 1} of {steps.length}
          </span>
          
          <h3 className="text-sm font-semibold text-slate-200 text-center mb-2">
            {steps[step].title}
          </h3>

          <p className="text-xs text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
            {steps[step].description}
          </p>

          {/* Practice tracker meter / visual indicator */}
          <div className="w-full max-w-xs flex flex-col items-center gap-1.5">
            <div className="flex justify-between w-full text-3xs font-mono text-slate-500">
              <span className="uppercase font-semibold text-sky-400">
                {steps[step].validate(hand) ? 'DETECTION HOLD MATCHED' : 'AWAITING CORRECT POSITION'}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Helpful diagnostics tips based on feedback state */}
          <div className="mt-6 text-center">
            <span className="text-3xs bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-slate-400 font-mono">
              Current Input: <strong className="text-slate-250 font-bold underline">{hand.gesture}</strong>
            </span>
          </div>

        </div>
      ) : (
        /* CONGRATS SCREEN */
        <div className="flex-1 flex flex-col justify-center items-center py-6 px-4 bg-slate-950/80 rounded-xl border border-emerald-500/20 my-2 shadow-lg">
          <div className="w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-400/50 flex items-center justify-center mb-4">
            <HeartHandshake size={32} className="text-emerald-400 animate-bounce" />
          </div>

          <h3 className="text-base font-bold text-center text-emerald-300 uppercase tracking-wide mb-1 font-mono">
            Academy Certified!
          </h3>

          <p className="text-xs text-slate-400 text-center max-w-xs mb-6 leading-relaxed">
            You have unlocked all system hand profiles. You can now use air paints, command volume panels, hover types, and slay laser deflection fields inside the games!
          </p>

          <button
            onClick={restartGuide}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono justify-center items-center text-xs font-semibold rounded-lg border border-slate-700 cursor-pointer shadow transition-all duration-150"
          >
            Practice Academy Again
          </button>
        </div>
      )}

      {/* Progress Trackers Drawer */}
      <div className="mt-3 border-t border-slate-850 pt-3">
        <h4 className="text-3xs font-mono uppercase text-slate-500 font-semibold tracking-wider mb-2">Academic Ledger</h4>
        <div className="grid grid-cols-2 gap-2">
          {steps.map((st, i) => (
            <div 
              key={i} 
              className={`p-2 rounded-lg border text-3xs font-mono flex items-center gap-1.5 transition-all ${
                completed[i] 
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' 
                  : i === step 
                    ? 'bg-sky-950/20 border-sky-500/30 text-sky-300 font-bold' 
                    : 'bg-slate-950/40 border-slate-900 text-slate-650'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${completed[i] ? 'bg-emerald-400' : i === step ? 'bg-sky-400 animate-ping' : 'bg-slate-800'}`}></div>
              <span className="truncate">{st.title}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
