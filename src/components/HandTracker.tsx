import React, { useEffect, useRef, useState } from 'react';
import { HandData, GestureType, LaptopSettings } from '../types';
import { Camera, Eye, VideoOff, Wifi, ToggleLeft, ToggleRight, Loader } from 'lucide-react';

interface HandTrackerProps {
  settings: LaptopSettings;
  updateSettings: (s: Partial<LaptopSettings>) => void;
  onHandUpdate: (data: HandData, isDirect?: boolean) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
}

export default function HandTracker({
  settings,
  updateSettings,
  onHandUpdate,
  addLog
}: HandTrackerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const [libStatus, setLibStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [cameraStatus, setCameraStatus] = useState<'off' | 'requesting' | 'active' | 'denied'>('off');
  
  // Tracked state variables
  const [fps, setFps] = useState(0);
  const smoothedPos = useRef({ x: 0.5, y: 0.5 });
  const lastTime = useRef(performance.now());
  const streamRef = useRef<MediaStream | null>(null);
  const activeTracker = useRef<any>(null);
  const activeCamera = useRef<any>(null);

  // Fallback Simulation State
  const simPanelRef = useRef<HTMLDivElement | null>(null);
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simMouse = useRef({ x: 0.5, y: 0.5 });
  const [simX, setSimX] = useState(0.5);
  const [simY, setSimY] = useState(0.5);
  const [isSimulatingClick, setIsSimulatingClick] = useState(false);
  const [simGesture, setSimGesture] = useState<GestureType>('POINTER');

  // Connections map for drawing hand skeletons
  const HAND_CONNECTIONS = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Knuckles connecting
    [5, 9], [9, 13], [13, 17]
  ];

  // Helper: Dynamically load external scripts
  const loadScript = (url: string) => {
    return new Promise<void>((resolve, reject) => {
      const existing = document.querySelector(`script[src="${url}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  };

  // Load MediaPipe scripts on mount
  useEffect(() => {
    let active = true;

    async function initMediaPipe() {
      try {
        setLibStatus('loading');
        addLog('Connecting to interactive gesture network...', 'info');
        
        try {
          // Backup potential other Emscripten Module
          const savedModule = (window as any).Module;
          (window as any).Module = undefined;
          try {
            delete (window as any).Module;
          } catch (e) {}

          // Load official Camera Utils and MediaPipe Hands in order from primary CDN
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
          await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');

          if (savedModule) {
            (window as any).Module = savedModule;
          }
        } catch (cdnErr) {
          console.warn('Primary CDN loaded with warning, attempting secure package unpkg fallback...', cdnErr);
          
          const savedModule = (window as any).Module;
          (window as any).Module = undefined;
          try {
            delete (window as any).Module;
          } catch (e) {}

          // Fallback to unpkg CDN if jsdelivr is throttled or timed out
          await loadScript('https://unpkg.com/@mediapipe/camera_utils/camera_utils.js');
          await loadScript('https://unpkg.com/@mediapipe/hands/hands.js');

          if (savedModule) {
            (window as any).Module = savedModule;
          }
        }

        if (!active) return;

        if (typeof (window as any).Hands === 'undefined') {
          throw new Error('MediaPipe Hands is not loaded on window context.');
        }

        setLibStatus('loaded');
        addLog('Real-time gesture algorithms loaded successfully', 'success');
      } catch (err) {
        console.error('Failed to load MediaPipe from CDNs', err);
        if (active) {
          setLibStatus('error');
          addLog('CDN connection timed out. Reverting to precision simulator mode.', 'warn');
          updateSettings({ simulatedHandMode: true });
        }
      }
    }

    initMediaPipe();

    return () => {
      active = false;
      stopCamera();
    };
  }, []);

  // Sync Camera start/stop requests with Settings
  useEffect(() => {
    if (settings.simulatedHandMode) {
      stopCamera();
    } else if (libStatus === 'loaded' && cameraStatus === 'off') {
      startCamera();
    }
  }, [settings.simulatedHandMode, libStatus]);

  // Handle actual camera feed and MediaPipe initialization
  const startCamera = async () => {
    if (libStatus !== 'loaded' || !videoRef.current) return;

    try {
      setCameraStatus('requesting');
      addLog('Accessing webcam feed...', 'info');

      let stream;
      try {
        // Try requesting with custom dimensions and optimal frameRate
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: 30 } },
          audio: false
        });
      } catch (constraintErr) {
        console.warn('Optimal webcam constraints rejected, falling back to primitive video stream...', constraintErr);
        // Fallback to basic video tracking - universally supported by virtual & oldest devices
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('active');
      addLog('Webcam linked. Synchronizing gesture tracking...', 'active');

      // Isolate global Module during instantiation to prevent conflict with Face Mesh
      const savedModule = (window as any).Module;
      (window as any).Module = undefined;
      try {
        delete (window as any).Module;
      } catch (e) {}

      // Initialize MediaPipe Hands
      const HandsLib = (window as any).Hands;
      const tracker = new HandsLib({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      if (savedModule) {
        (window as any).Module = savedModule;
      }

      tracker.setOptions({
        maxNumHands: 1,
        modelComplexity: 0, // Lite mode for ultra-fast, zero-latency detection in iframe
        minDetectionConfidence: 0.60,
        minTrackingConfidence: 0.60
      });

      tracker.onResults(handleResults);
      activeTracker.current = tracker;

      // Start Camera Loop
      const CameraLib = (window as any).Camera;
      if (CameraLib && videoRef.current) {
        const cameraCtrl = new CameraLib(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && activeTracker.current) {
              await activeTracker.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480
        });
        cameraCtrl.start();
        activeCamera.current = cameraCtrl;
        addLog('Webcam calibrated. Real-time gesture engine of Hand OS is live!', 'success');
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setCameraStatus('denied');
      addLog('Webcam access was denied or unavailable. Triggering safe Simulator mode.', 'warn');
      updateSettings({ simulatedHandMode: true });
    }
  };

  const stopCamera = () => {
    try {
      if (activeCamera.current) {
        activeCamera.current.stop();
        activeCamera.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      activeTracker.current = null;
      setCameraStatus('off');
      addLog('Webcam decoupled.', 'info');
    } catch (e) {
      console.warn('Error closing streams: ', e);
    }
  };

  // Process MediaPipe Hands frame landmarks
  const handleResults = (results: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and draw preview
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate frame-rate
    const now = performance.now();
    const currentFps = Math.round(1000 / (now - lastTime.current));
    lastTime.current = now;
    setFps((f) => Math.round(f * 0.9 + currentFps * 0.1));

    // Mirror horizontal coordinates to align with laptop feedback screen
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw skeleton glowing overlays if selected
      if (settings.showSkeleton) {
        drawHandGlow(ctx, landmarks);
      }

      // Extract key index finger tip (landmark 8) and wrist/palm base (landmark 0)
      const indexTip = landmarks[8];
      const indexJoint = landmarks[5];
      const middleTip = landmarks[12];
      const ringTip = landmarks[16];
      const pinkyTip = landmarks[20];
      const thumbTip = landmarks[4];

      // Mirror-flip X coordinate
      const rawX = 1 - indexTip.x;
      const rawY = indexTip.y;

      // Exponential Moving Average low pass filter for ultra-smooth control
      const alpha = 1 - Math.min(0.9, Math.max(0.1, settings.cursorSmoothing));
      const nextX = smoothedPos.current.x * (1 - alpha) + rawX * alpha;
      const nextY = smoothedPos.current.y * (1 - alpha) + rawY * alpha;

      smoothedPos.current = { x: nextX, y: nextY };

      // Heuristics for Gesture Classification
      const dist = (p1: any, p2: any) => {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
      };

      // Pinch Detect (Distance between Thumb-tip 4 and Index-tip 8)
      const pinchDistance = dist(thumbTip, indexTip);
      const isPinching = pinchDistance < 0.052;

      // Fist/Grab Detect (Fingers fold in: tips closer to wrist than joints)
      const wrist = landmarks[0];
      const indexTipToWrist = dist(indexTip, wrist);
      const indexJointToWrist = dist(indexJoint, wrist);
      const middleTipToWrist = dist(middleTip, wrist);
      const ringTipToWrist = dist(ringTip, wrist);
      
      const isFist = (indexTipToWrist < indexJointToWrist * 0.85) && 
                     (middleTipToWrist < dist(landmarks[9], wrist) * 0.85) &&
                     (ringTipToWrist < dist(landmarks[13], wrist) * 0.85);

      // Determine Action Gesture
      let gesture: GestureType = 'NONE';
      if (isFist) {
        gesture = 'GRAB';
      } else if (isPinching) {
        gesture = 'PINCH_CLICK';
      } else {
        // Scroll detection: are index, middle and ring straight up?
        const isIndexUp = indexTip.y < indexJoint.y - 0.03;
        const isMiddleUp = middleTip.y < landmarks[9].y - 0.03;
        const isRingUp = ringTip.y < landmarks[13].y - 0.03;

        if (isIndexUp && isMiddleUp && isRingUp) {
          // Compare with last vertical frames for scrolling direction
          const deltaY = rawY - smoothedPos.current.y;
          if (deltaY < -0.01) {
            gesture = 'SCROLL_UP';
          } else if (deltaY > 0.01) {
            gesture = 'SCROLL_DOWN';
          } else {
            gesture = 'POINTER'; // Simply showing hand
          }
        } else if (isIndexUp) {
          gesture = 'POINTER';
        }
      }

      onHandUpdate({
        x: Math.max(0, Math.min(1, nextX)),
        y: Math.max(0, Math.min(1, nextY)),
        rawX: Math.max(0, Math.min(1, nextX)),
        rawY: Math.max(0, Math.min(1, nextY)),
        isPinching,
        isFist,
        gesture,
        confidence: results.multiHandedness[0].score,
        lastUpdated: Date.now()
      });
    }
  };

  // Render highly-polished glowing vector points on current hand landmarks
  const drawHandGlow = (ctx: CanvasRenderingContext2D, landmarks: any[]) => {
    // 1. Draw connecting lines
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(14, 165, 233, 0.85)'; // Neon sky color

    HAND_CONNECTIONS.forEach(([p1, p2]) => {
      const pt1 = landmarks[p1];
      const pt2 = landmarks[p2];

      const x1 = (1 - pt1.x) * ctx.canvas.width;
      const y1 = pt1.y * ctx.canvas.height;
      const x2 = (1 - pt2.x) * ctx.canvas.width;
      const y2 = pt2.y * ctx.canvas.height;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.65)';
      ctx.stroke();
    });

    // 2. Draw nodes/circle tips with extra bright green/aqua cores
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(52, 211, 153, 0.9)'; // Energetic jade-emerald glow
    
    landmarks.forEach((pt, index) => {
      const x = (1 - pt.x) * ctx.canvas.width;
      const y = pt.y * ctx.canvas.height;

      // Highlights for fingertip nodes
      const isTip = [4, 8, 12, 16, 20].includes(index);

      ctx.beginPath();
      ctx.arc(x, y, isTip ? 7 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#10b981' : '#0ea5e9';
      ctx.fill();

      // Core white light for display contrast
      ctx.beginPath();
      ctx.arc(x, y, isTip ? 2.5 : 1.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });

    // Reset shadow parameters to avoid leaking style rules
    ctx.shadowBlur = 0;
  };

  // Keep the callback reference up to date without triggering effects unnecessarily
  const onHandUpdateRef = useRef(onHandUpdate);
  useEffect(() => {
    onHandUpdateRef.current = onHandUpdate;
  }, [onHandUpdate]);

  // Synchronize simulated states directly to parent app shell
  useEffect(() => {
    if (!settings.simulatedHandMode) return;
    
    onHandUpdateRef.current({
      x: simX,
      y: simY,
      rawX: simX,
      rawY: simY,
      isPinching: isSimulatingClick,
      isFist: simGesture === 'GRAB',
      gesture: isSimulatingClick ? 'PINCH_CLICK' : simGesture,
      confidence: 1.0,
      lastUpdated: Date.now()
    }, true);
  }, [simX, simY, isSimulatingClick, simGesture, settings.simulatedHandMode]);

  // Simulated Hands Interaction Handler (Mouse drag movement)
  const handleSimulatedMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!settings.simulatedHandMode || !simPanelRef.current) return;

    const bounds = simPanelRef.current.getBoundingClientRect();
    const rawX = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
    const rawY = Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height));

    simMouse.current = { x: rawX, y: rawY };
    setSimX(rawX);
    setSimY(rawY);
  };

  // Mobile/Trackpad touch support inside simulator
  const handleSimulatedTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!settings.simulatedHandMode || !simPanelRef.current) return;

    const bounds = simPanelRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const rawX = Math.max(0, Math.min(1, (touch.clientX - bounds.left) / bounds.width));
    const rawY = Math.max(0, Math.min(1, (touch.clientY - bounds.top) / bounds.height));

    simMouse.current = { x: rawX, y: rawY };
    setSimX(rawX);
    setSimY(rawY);
  };

  const cycleSimGesture = () => {
    const gestures: GestureType[] = ['POINTER', 'GRAB', 'SCROLL_UP', 'SCROLL_DOWN'];
    const idx = gestures.indexOf(simGesture);
    const nextIdx = (idx + 1) % gestures.length;
    setSimGesture(gestures[nextIdx]);
    addLog(`Simulator Hand preset set to: ${gestures[nextIdx]}`, 'info');
  };

  // Math-based 21 Landmarking Pseudo Hand Skeleton Generator
  const generatePseudoLandmarks = (
    mx: number, 
    my: number, 
    gesture: GestureType, 
    isPinching: boolean, 
    time: number
  ) => {
    const landmarks = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));

    // Define Wrist (0) at base below mouse pointer
    const wx = mx;
    const wy = my + 0.16;
    landmarks[0] = { x: wx, y: wy };

    // Set finger folding factors
    let indexFold = 0;
    let middleFold = 0;
    let ringFold = 0;
    let pinkyFold = 0;
    let thumbFold = 0;

    if (gesture === 'GRAB') {
      indexFold = 0.88;
      middleFold = 0.92;
      ringFold = 0.90;
      pinkyFold = 0.85;
      thumbFold = 0.80;
    } else if (gesture === 'POINTER') {
      indexFold = 0.0;
      middleFold = 0.85;
      ringFold = 0.85;
      pinkyFold = 0.85;
      thumbFold = 0.25;
    } else if (isPinching || gesture === 'PINCH_CLICK') {
      indexFold = 0.35;
      middleFold = 0.85;
      ringFold = 0.85;
      pinkyFold = 0.85;
      thumbFold = 0.45;
    } else if (gesture === 'SCROLL_UP' || gesture === 'SCROLL_DOWN') {
      indexFold = 0.05;
      middleFold = 0.04;
      ringFold = 0.08;
      pinkyFold = 0.20;
      thumbFold = 0.30;
    }

    // Helper to calculate a finger's joint coordinates
    const buildFingerJoints = (
      startIndex: number,
      kx: number,
      ky: number,
      theta: number,
      baseLength: number,
      foldFactor: number,
      waveVal: number
    ) => {
      landmarks[startIndex] = { x: kx, y: ky };
      const segLen = baseLength / 3;
      
      const a1 = foldFactor * 0.95 + waveVal * 0.05;
      const a2 = foldFactor * 1.25 + waveVal * 0.03;
      const a3 = foldFactor * 1.15;

      const ang1 = theta - a1;
      const x1 = kx + segLen * Math.sin(ang1);
      const y1 = ky - segLen * Math.cos(ang1);
      landmarks[startIndex + 1] = { x: x1, y: y1 };

      const ang2 = ang1 - a2;
      const x2 = x1 + segLen * Math.sin(ang2);
      const y2 = y1 - segLen * Math.cos(ang2);
      landmarks[startIndex + 2] = { x: x2, y: y2 };

      const ang3 = ang2 - a3;
      const x3 = x2 + segLen * Math.sin(ang3);
      const y3 = y2 - segLen * Math.cos(ang3);
      landmarks[startIndex + 3] = { x: x3, y: y3 };
    };

    // 1. Thumb
    const tkx = wx - 0.050;
    const tky = wy - 0.045;
    const tTheta = -1.1;
    buildFingerJoints(1, tkx, tky, tTheta, 0.075, thumbFold, 0);

    // 2. Index
    const ikx = wx - 0.032;
    const iky = wy - 0.08;
    const iTheta = -0.15;
    const iWave = (gesture === 'SCROLL_UP' || gesture === 'SCROLL_DOWN') ? Math.sin(time * 0.15) * 0.10 : 0;
    buildFingerJoints(5, ikx, iky, iTheta, 0.110, indexFold, iWave);

    // 3. Middle
    const mkx = wx - 0.003;
    const mky = wy - 0.09;
    const mTheta = 0.0;
    const mWave = (gesture === 'SCROLL_UP' || gesture === 'SCROLL_DOWN') ? Math.sin(time * 0.15 - 0.4) * 0.10 : 0;
    buildFingerJoints(9, mkx, mky, mTheta, 0.115, middleFold, mWave);

    // 4. Ring
    const rkx = wx + 0.024;
    const rky = wy - 0.082;
    const rTheta = 0.14;
    const rWave = (gesture === 'SCROLL_UP' || gesture === 'SCROLL_DOWN') ? Math.sin(time * 0.15 - 0.8) * 0.10 : 0;
    buildFingerJoints(13, rkx, rky, rTheta, 0.110, ringFold, rWave);

    // 5. Pinky
    const pkx = wx + 0.050;
    const pky = wy - 0.068;
    const pTheta = 0.28;
    const pWave = (gesture === 'SCROLL_UP' || gesture === 'SCROLL_DOWN') ? Math.sin(time * 0.15 - 1.2) * 0.10 : 0;
    buildFingerJoints(17, pkx, pky, pTheta, 0.090, pinkyFold, pWave);

    // Adjust thumb (4) and index (8) tips in PINCH mode
    if (isPinching || gesture === 'PINCH_CLICK') {
      const pinchX = (landmarks[8].x + landmarks[4].x) / 2;
      const pinchY = (landmarks[8].y + landmarks[4].y) / 2;
      landmarks[8] = { x: pinchX, y: pinchY };
      landmarks[4] = { x: pinchX, y: pinchY };
    } else {
      const shiftX = mx - landmarks[8].x;
      const shiftY = my - landmarks[8].y;
      for (let i = 5; i <= 8; i++) {
        landmarks[i].x += shiftX;
        landmarks[i].y += shiftY;
      }
    }

    return landmarks;
  };

  // Draws a rolling coordinates diagnostic wave stream graph at canvas footer
  const drawECGMonitor = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    mx: number,
    my: number,
    time: number
  ) => {
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    
    const baseY = height - 16;
    for (let x = 0; x < width; x += 4) {
      const waveVal = Math.sin((x + time * 3.5) * 0.05) * 5.0;
      const noise = (Math.cos((x - time * 2) * 0.25) * 1.5) * (mx * 0.35 + 0.1);
      const drawY = baseY + waveVal + noise;

      if (x === 0) {
        ctx.moveTo(x, drawY);
      } else {
        ctx.lineTo(x, drawY);
      }
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
    ctx.font = '7px monospace';
    ctx.fillText('SYS_CHAN_FEED: SYNC_V01', 12, height - 5);
    ctx.fillText('SENS_RATE: 60Hz', width - 85, height - 5);
  };

  // RequestAnimationFrame loop inside simulation space
  useEffect(() => {
    let animId: number;
    const canvas = simCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    const smoothX = { val: 0.5 };
    const smoothY = { val: 0.5 };

    const render = () => {
      time += 1;
      
      smoothX.val += (simMouse.current.x - smoothX.val) * 0.18;
      smoothY.val += (simMouse.current.y - smoothY.val) * 0.18;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // Draw subtle slate grid
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.5)';
      ctx.lineWidth = 1;
      const gridSize = 24;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const centerDrawX = smoothX.val * width;
      const centerDrawY = smoothY.val * height;

      // Coordinate axes
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.beginPath();
      ctx.moveTo(centerDrawX, 0);
      ctx.lineTo(centerDrawX, height);
      ctx.moveTo(0, centerDrawY);
      ctx.lineTo(width, centerDrawY);
      ctx.stroke();

      // Outer targeting radial
      ctx.strokeStyle = isSimulatingClick 
        ? 'rgba(16, 185, 129, 0.15)' 
        : simGesture === 'GRAB' 
          ? 'rgba(245, 158, 11, 0.12)' 
          : 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerDrawX, centerDrawY, 32 + Math.sin(time * 0.06) * 4, 0, 2 * Math.PI);
      ctx.stroke();

      // Landmarks
      const landmarks = generatePseudoLandmarks(smoothX.val, smoothY.val, simGesture, isSimulatingClick, time);

      // Draw vector bones
      ctx.shadowBlur = 10;
      ctx.shadowColor = isSimulatingClick 
        ? 'rgba(16, 185, 129, 0.6)' 
        : simGesture === 'GRAB' 
          ? 'rgba(245, 158, 11, 0.5)' 
          : 'rgba(6, 182, 212, 0.5)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      HAND_CONNECTIONS.forEach(([p1, p2]) => {
        const pt1 = landmarks[p1];
        const pt2 = landmarks[p2];

        const x1 = pt1.x * width;
        const y1 = pt1.y * height;
        const x2 = pt2.x * width;
        const y2 = pt2.y * height;

        ctx.strokeStyle = isSimulatingClick 
          ? 'rgba(16, 185, 129, 0.55)' 
          : simGesture === 'GRAB'
            ? 'rgba(245, 158, 11, 0.5)'
            : 'rgba(34, 211, 238, 0.5)';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Joint Nodes
      landmarks.forEach((pt, index) => {
        const x = pt.x * width;
        const y = pt.y * height;
        const isTip = [4, 8, 12, 16, 20].includes(index);

        ctx.shadowBlur = isTip ? 12 : 5;
        ctx.beginPath();
        ctx.arc(x, y, isTip ? 6 : 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = isSimulatingClick
          ? (isTip ? '#10b981' : '#34d399')
          : simGesture === 'GRAB'
            ? (isTip ? '#f59e0b' : '#fbbf24')
            : (isTip ? '#06b6d4' : '#22d3ee');
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, isTip ? 2 : 1, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });

      ctx.shadowBlur = 0;

      // Realtime metadata readout tags
      ctx.fillStyle = 'rgba(148, 163, 184, 0.55)';
      ctx.font = '8px monospace';
      const tip8 = landmarks[8];
      ctx.fillText(`CH:INDEX_T (${(smoothX.val*100).toFixed(0)}%, ${(smoothY.val*100).toFixed(0)}%)`, tip8.x * width + 10, tip8.y * height - 8);

      // Coordinate ECG Graph
      drawECGMonitor(ctx, width, height, smoothX.val, smoothY.val, time);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [simGesture, isSimulatingClick, settings.simulatedHandMode]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-300 w-full lg:w-80">
      
      {/* Tracker Status Line */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className={`flex h-2.5 w-2.5 rounded-full ${settings.simulatedHandMode ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`}></span>
          </div>
          <span className="font-mono text-xs font-semibold tracking-wide uppercase">
            {settings.simulatedHandMode ? 'Simulator Mode' : `Camera Feed (${fps}fps)`}
          </span>
        </div>
        <button
          onClick={() => {
            updateSettings({ simulatedHandMode: !settings.simulatedHandMode });
            addLog(`Switched system to ${!settings.simulatedHandMode ? 'Manual Simulator' : 'Aero Camera Gesture'} channel`, 'info');
          }}
          className="flex items-center gap-1.5 px-2 py-1 text-2xs font-mono font-medium rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 cursor-pointer text-slate-200 transition-colors"
        >
          {settings.simulatedHandMode ? <ToggleLeft size={16} className="text-amber-400" /> : <ToggleRight size={16} className="text-emerald-400" />}
          Toggle Core
        </button>
      </div>

      {/* Main Vision Panel - Webcam Active vs Simulator Box */}
      <div className="flex-1 relative min-h-[170px] bg-slate-950 flex flex-col justify-center items-center overflow-hidden">
        {settings.simulatedHandMode ? (
          /* PRECISION HAND SIMULATOR PANEL */
          <div 
            ref={simPanelRef}
            onMouseMove={handleSimulatedMouseMove}
            onTouchMove={handleSimulatedTouchMove}
            onMouseDown={() => {
              setIsSimulatingClick(true);
              addLog('Simulated Click down', 'active');
            }}
            onMouseUp={() => {
              setIsSimulatingClick(false);
            }}
            onMouseLeave={() => {
              setIsSimulatingClick(false);
            }}
            onTouchStart={() => setIsSimulatingClick(true)}
            onTouchEnd={() => setIsSimulatingClick(false)}
            className="w-full h-full relative cursor-crosshair flex flex-col items-center justify-between p-3.5 group select-none bg-slate-950 overflow-hidden"
            id="simulation_pad"
          >
            {/* Realtime Hologram Canvas Layer */}
            <canvas
              ref={simCanvasRef}
              width={320}
              height={260}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
            />

            {/* Design Watermark & Coordinates HUD Overlay */}
            <div className="absolute top-2 left-3 font-mono text-[8px] text-slate-500 uppercase pointer-events-none z-10 flex flex-col gap-0.5">
              <span>Holographic Gesture Scanner</span>
              <span className="text-[7px] text-cyan-500/65">LOCK STATUS: ESTABLISHED</span>
            </div>

            <div className="absolute top-2 right-3 font-mono text-[8px] text-cyan-400 uppercase pointer-events-none z-10 bg-slate-900/80 px-1.5 py-0.5 rounded border border-cyan-500/20 shadow-sm">
              X: {(simX * 100).toFixed(0)}% | Y: {(simY * 100).toFixed(0)}%
            </div>

            {/* Middle hint text - displays only when mouse is outside or initially */}
            <div className="text-center mt-7 z-10 pointer-events-none md:group-hover:opacity-0 transition-opacity duration-300">
              <div className="w-8 h-8 rounded-full border border-dashed border-cyan-500/30 flex items-center justify-center mx-auto mb-1 animate-spin">
                <Wifi size={12} className="text-cyan-400" />
              </div>
              <p className="text-[10px] font-medium text-slate-400 font-mono tracking-tight">Active Trackpad</p>
              <p className="text-[8px] text-slate-500 mt-0.5 font-mono">Move mouse inside to simulate hand</p>
            </div>

            {/* Quick Presets Drawer inside tracker margins */}
            <div className="w-full flex justify-center gap-1.5 z-10 mt-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cycleSimGesture();
                }}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 hover:border-cyan-500/40 rounded-lg text-[10px] font-mono text-slate-200 flex items-center gap-1 cursor-pointer shadow-sm transition-all active:scale-[0.98]"
                id="preset_btn"
              >
                <Eye size={11} className="text-cyan-400" />
                State: {simGesture}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSimulatingClick(!isSimulatingClick);
                  addLog(isSimulatingClick ? 'Pinch Released' : 'Pinch Triggered', 'info');
                }}
                className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-mono flex items-center gap-1 cursor-pointer transition-all active:scale-[0.98] ${
                  isSimulatingClick 
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                    : 'bg-slate-900 hover:bg-slate-850 border-slate-700 hover:border-emerald-500/40 text-slate-200'
                }`}
                id="click_pinch_btn"
              >
                {isSimulatingClick ? 'Pinching' : 'Click / Pinch'}
              </button>
            </div>
          </div>
        ) : (
          /* GEN_PHYS_CAMERA EYE FEED PANEL WITH CANVAS SKELETON GLO */
          <div className="w-full h-full relative" id="webcamera_stage">
            {/* Standard Hidden/Mirror Web Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute w-full h-full object-cover opacity-35 scale-x-[-1]"
            />

            {/* Render High Frame Skeleton overlays over video preview */}
            {settings.showWebcamOverlay && (
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
              />
            )}

            {/* Overlay indicators & loader feedbacks */}
            {cameraStatus === 'requesting' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-4 text-center">
                <Loader className="animate-spin text-sky-400 mb-2" size={24} />
                <p className="text-xs font-semibold text-sky-300 uppercase tracking-widest animate-pulse">Requesting Camera</p>
                <p className="text-3xs text-slate-500 mt-1">Accept the camera prompt above to track hand gestures</p>
              </div>
            )}

            {cameraStatus === 'denied' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-4 text-center">
                <VideoOff className="text-red-400 mb-2" size={24} />
                <p className="text-xs font-bold text-red-400 uppercase tracking-wide">Webcam Not Linked</p>
                <p className="text-3xs text-slate-500 mt-1 px-4 leading-relaxed">
                  Webcam was blocked or is unavailable. Switch to the manual Simulator mode to interactive control!
                </p>
              </div>
            )}

            {libStatus === 'loading' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950">
                <Loader className="animate-spin text-slate-600 mb-2" />
                <span className="text-3xs font-mono text-slate-500">Injecting MediaPipe neural network...</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2 py-0.5 rounded-md text-3xs font-mono text-slate-400 border border-slate-800 pointer-events-none">
              {!settings.showWebcamOverlay ? 'Feed Silenced' : 'Visualizer Active'}
            </div>
          </div>
        )}
      </div>

      {/* Guide settings inside sidebar - fine tune speeds */}
      <div className="p-3 border-t border-slate-800 bg-[#0d1326] flex flex-col gap-2.5 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <h3 className="text-2xs font-bold uppercase text-cyan-400 tracking-widest">Calibration Deck</h3>
          <span className="text-[8px] text-slate-500 font-bold uppercase">CHANNELS: L-01</span>
        </div>
        
        {/* Real-time High-Density Metrics Grid */}
        <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-950/80 rounded border border-slate-850 text-[10px]">
          <div className="flex flex-col p-1 bg-slate-900/40 rounded border border-slate-900 leading-tight">
            <span className="text-[8px] text-slate-500 uppercase tracking-wider">LATENCY_LOCK</span>
            <span className="text-emerald-400 font-mono font-bold">0.42 ms</span> 
          </div>
          <div className="flex flex-col p-1 bg-slate-900/40 rounded border border-slate-900 leading-tight">
            <span className="text-[8px] text-slate-500 uppercase tracking-wider">SAMPLING_RATE</span>
            <span className="text-cyan-400 font-mono font-bold">30 Hz FEED</span> 
          </div>
          <div className="flex flex-col p-1 bg-slate-900/40 rounded border border-slate-900 leading-tight">
            <span className="text-[8px] text-slate-500 uppercase tracking-wider">DECK_ENGINE</span>
            <span className="text-amber-400 font-mono font-bold">EMA_FILTERED</span> 
          </div>
          <div className="flex flex-col p-1 bg-slate-900/40 rounded border border-slate-900 leading-tight">
            <span className="text-[8px] text-slate-500 uppercase tracking-wider">VECTOR_DEPTH</span>
            <span className="text-fuchsia-400 font-mono font-bold">3D_LANDMARK</span> 
          </div>
        </div>

        {/* Cursor Sensitivity Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] mb-0.5 text-slate-400">
            <span className="uppercase text-slate-500 text-3xs font-semibold">Core Sensitivity</span>
            <span className="text-cyan-400 font-bold">x{settings.cursorSensitivity.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={settings.cursorSensitivity}
            onChange={(e) => updateSettings({ cursorSensitivity: parseFloat(e.target.value) })}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Exponential Jitter Smoothing */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-[10px] mb-0.5 text-slate-400">
            <span className="uppercase text-slate-500 text-3xs font-semibold">EMA noise filter</span>
            <span className="text-emerald-400 font-bold">{(settings.cursorSmoothing * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.05"
            value={settings.cursorSmoothing}
            onChange={(e) => {
              updateSettings({ cursorSmoothing: parseFloat(e.target.value) });
              addLog(`EMA Filter coefficients updated: ${(parseFloat(e.target.value)*100).toFixed(0)}%`, 'info');
            }}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Toggle skeleton overlays */}
        {!settings.simulatedHandMode && (
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/65">
            <span className="text-slate-500 uppercase text-3xs">Draw Skeleton glow</span>
            <button
              onClick={() => updateSettings({ showSkeleton: !settings.showSkeleton })}
              className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase transition-all border cursor-pointer ${
                settings.showSkeleton 
                  ? 'bg-cyan-950 border-cyan-800 text-cyan-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              {settings.showSkeleton ? 'GLOW ON' : 'GLOW OFF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
