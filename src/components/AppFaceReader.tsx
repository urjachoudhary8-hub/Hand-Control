import React, { useState, useEffect, useRef } from 'react';
import { HandData, LaptopSettings } from '../types';
import { 
  Scan, 
  Activity, 
  Smile, 
  Eye, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  Zap, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  ShieldAlert,
  Play,
  Square,
  BarChart2,
  Clock,
  Camera,
  VideoOff
} from 'lucide-react';

interface AppFaceReaderProps {
  hand: HandData;
  settings: LaptopSettings;
  updateSettings: (s: Partial<LaptopSettings>) => void;
  addLog: (msg: string, type?: 'info' | 'success' | 'warn' | 'active') => void;
  onHandUpdate?: (data: HandData, isDirect?: boolean) => void;
}

type FaceExpressionType = 'NEUTRAL' | 'SMILING' | 'SURPRISED' | 'LEFT_WINK' | 'RIGHT_WINK' | 'ENGAGED' | 'TIRED';

interface ExpressionPreset {
  type: FaceExpressionType;
  smileLevel: number;
  surpriseLevel: number;
  blinkLeft: boolean;
  blinkRight: boolean;
  attentionScore: number;
  label: string;
}

export default function AppFaceReader({
  hand,
  settings,
  updateSettings,
  addLog,
  onHandUpdate
}: AppFaceReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Expression Tracker values
  const [currentExpr, setCurrentExpr] = useState<FaceExpressionType>('NEUTRAL');
  const [smileValue, setSmileValue] = useState<number>(12); // %
  const [surpriseValue, setSurpriseValue] = useState<number>(5); // %
  const [blinkLeft, setBlinkLeft] = useState<boolean>(false);
  const [blinkRight, setBlinkRight] = useState<boolean>(false);
  const [gazeX, setGazeX] = useState<number>(0.5);
  const [gazeY, setGazeY] = useState<number>(0.5);
  const [faceAngleX, setFaceAngleX] = useState<number>(0);  // head yaw/pitch
  const [faceAngleY, setFaceAngleY] = useState<number>(0);
  
  // Settings for Face Triggers
  const [smileToMute, setSmileToMute] = useState<boolean>(true);
  const [winkToLog, setWinkToLog] = useState<boolean>(true);
  const [raiseBrowToVolume, setRaiseBrowToVolume] = useState<boolean>(false);
  
  // Webcam Face Mesh tracking states
  const [webcamMode, setWebcamMode] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'off' | 'requesting' | 'active' | 'denied'>('off');
  const [libStatus, setLibStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  
  const activeTracker = useRef<any>(null);
  const activeCamera = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastClickTime = useRef<number>(0);
  const realFaceLandmarks = useRef<any>(null);

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

  const startWebcamTracker = async () => {
    if (!videoRef.current) return;
    try {
      setCameraStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 30 } },
        audio: false
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setCameraStatus('active');
      
      const FaceMeshLib = (window as any).FaceMesh;
      if (!FaceMeshLib) {
        throw new Error("FaceMesh library not available on window");
      }
      
      // Isolate global Module during instantiation to prevent conflict with other MediaPipe libraries (e.g. Hands)
      const savedModule = (window as any).Module;
      (window as any).Module = undefined;
      try {
        delete (window as any).Module;
      } catch (e) {}

      const faceMesh = new FaceMeshLib({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      if (savedModule) {
        (window as any).Module = savedModule;
      }
      
      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      faceMesh.onResults((results: any) => {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
          const landmarks = results.multiFaceLandmarks[0];
          realFaceLandmarks.current = landmarks;
          
          // Calculate values and update states
          const leftCheek = landmarks[234];
          const rightCheek = landmarks[454];
          const mouthLeft = landmarks[61];
          const mouthRight = landmarks[291];
          
          const faceW = Math.hypot(leftCheek.x - rightCheek.x, leftCheek.y - rightCheek.y);
          const mouthW = Math.hypot(mouthLeft.x - mouthRight.x, mouthLeft.y - mouthRight.y);
          const smileScore = mouthW / (faceW || 1);
          
          // Standard range mapping for smile (0.3 centered - 0.42 smile limit)
          const smilePct = Math.max(0, Math.min(100, Math.round((smileScore - 0.28) / 0.14 * 100)));
          setSmileValue(smilePct);
          
          // Smile threshold check to mute
          let resolvedExpr: FaceExpressionType = 'NEUTRAL';
          if (smilePct > 70) {
            resolvedExpr = 'SMILING';
          }

          // Surprise EyeBrow detection
          const leftEyeTop = landmarks[159];
          const leftBrow = landmarks[70];
          const rightEyeTop = landmarks[386];
          const rightBrow = landmarks[300];
          const leftBrowDist = Math.hypot(leftEyeTop.x - leftBrow.x, leftEyeTop.y - leftBrow.y);
          const rightBrowDist = Math.hypot(rightEyeTop.x - rightBrow.x, rightEyeTop.y - rightBrow.y);
          const avgBrowDist = (leftBrowDist + rightBrowDist) / 2;
          const browRatio = avgBrowDist / (faceW || 1);
          const browPct = Math.max(0, Math.min(100, Math.round((browRatio - 0.17) / 0.08 * 100)));
          setSurpriseValue(browPct);
          
          if (browPct > 65) {
            resolvedExpr = 'SURPRISED';
          }

          // Blinks/Winks EAR calculations
          const leftTop = landmarks[159];
          const leftBottom = landmarks[145];
          const leftL = landmarks[33];
          const leftR = landmarks[133];
          const dyL = Math.hypot(leftTop.x - leftBottom.x, leftTop.y - leftBottom.y);
          const dxL = Math.hypot(leftL.x - leftR.x, leftL.y - leftR.y);
          const earL = dyL / (dxL || 1);
          const isBlinkL = earL < 0.13;
          setBlinkLeft(isBlinkL);

          const rightTop = landmarks[386];
          const rightBottom = landmarks[374];
          const rightL = landmarks[362];
          const rightR = landmarks[263];
          const dyR = Math.hypot(rightTop.x - rightBottom.x, rightTop.y - rightBottom.y);
          const dxR = Math.hypot(rightL.x - rightR.x, rightL.y - rightR.y);
          const earR = dyR / (dxR || 1);
          const isBlinkR = earR < 0.13;
          setBlinkRight(isBlinkR);

          // Categorize and act on Eye clicks
          const eyeClosed = isBlinkL || isBlinkR;
          if (eyeClosed) {
            if (isBlinkL && !isBlinkR) {
              resolvedExpr = 'LEFT_WINK';
            } else if (!isBlinkL && isBlinkR) {
              resolvedExpr = 'RIGHT_WINK';
            } else {
              resolvedExpr = 'TIRED'; // double blink/closed
            }
            
            // Execute actual coordinate click (Blink to Click!)
            if (Date.now() - lastClickTime.current > 1200) {
              lastClickTime.current = Date.now();
              
              if (onHandUpdate) {
                onHandUpdate({
                  ...hand,
                  isPinching: true,
                  gesture: 'PINCH_CLICK',
                  lastUpdated: Date.now()
                }, true);
                
                setTimeout(() => {
                  onHandUpdate({
                    ...hand,
                    isPinching: false,
                    gesture: 'POINTER',
                    lastUpdated: Date.now()
                  }, true);
                }, 200);
                
                addLog(`[GAZE EYE CLICK] Human Iris Gaze blink registered click at coordinates (${(hand.x * 100).toFixed(0)}%, ${(hand.y * 100).toFixed(0)}%)`, 'success');
              }
            }
          }

          setCurrentExpr(resolvedExpr);

          // Yaw/Pitch estimation for movement tracking
          const nose = landmarks[1];
          const noseRelativeX = (nose.x - rightCheek.x) / (leftCheek.x - rightCheek.x || 1);
          const yaw = (noseRelativeX - 0.5) * 50;
          
          const noseRelativeY = (nose.y - landmarks[10].y) / (landmarks[152].y - landmarks[10].y || 1);
          const pitch = (noseRelativeY - 0.45) * 50;
          
          setFaceAngleX(yaw);
          setFaceAngleY(pitch);

          // Map to Gaze coords
          // NoseRelativeX centered is ~0.5. Use sensitivity to make it cover bounds
          const sens = 2.4;
          const targetX = Math.max(0, Math.min(1, 0.5 + (0.5 - noseRelativeX) * sens));
          const targetY = Math.max(0, Math.min(1, 0.5 + (noseRelativeY - 0.45) * sens * 1.5));
          
          setGazeX((prev) => prev * 0.70 + targetX * 0.30);
          setGazeY((prev) => prev * 0.70 + targetY * 0.30);

          // Real-time Eye Control cursor sync
          if (settings.eyeControlMode && onHandUpdate) {
            onHandUpdate({
              ...hand,
              x: gazeX,
              y: gazeY,
              rawX: gazeX,
              rawY: gazeY,
              confidence: 1.0,
              lastUpdated: Date.now()
            }, true);
          }
        }
      });
      
      activeTracker.current = faceMesh;
      
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
        addLog(`[FACE OS] Real webcam video stream connected. Gaze lock synced.`, 'success');
      }
    } catch (err) {
      console.error("Camera tracker startup failed:", err);
      setCameraStatus('denied');
      setWebcamMode(false);
      addLog(`[FACE OS] Real camera permission denied or unavailable.`, 'warn');
    }
  };

  const stopWebcamTracker = () => {
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
      realFaceLandmarks.current = null;
    } catch (e) {
      console.warn("Error tearing down camera: ", e);
    }
  };

  const handleToggleWebcamMode = async () => {
    const nextVal = !webcamMode;
    setWebcamMode(nextVal);
    
    if (nextVal) {
      addLog(`[FACE OS] Loading camera Face Mesh library...`, 'info');
      try {
        setLibStatus('loading');
        // Load official camera utils & face_mesh
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        
        // Backup hands/other Emscripten Module if exists and clear it so face_mesh has a clean environment during loading
        const savedModule = (window as any).Module;
        (window as any).Module = undefined;
        try {
          delete (window as any).Module;
        } catch (e) {}

        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');

        if (savedModule) {
          (window as any).Module = savedModule;
        }

        setLibStatus('loaded');
        addLog(`[FACE OS] Face Mesh algorithms loaded. Initializing camera...`, 'success');
        
        // Let state commit then run tracking
        setTimeout(() => {
          startWebcamTracker();
        }, 150);
      } catch (err) {
        console.error("Failed to load face mesh libraries:", err);
        setLibStatus('error');
        setWebcamMode(false);
        addLog(`[FACE OS] Failed to load library. Reverting to Simulation.`, 'warn');
      }
    } else {
      stopWebcamTracker();
      addLog(`[FACE OS] Decoupled webcam scanner. Returned to Simulation.`, 'warn');
    }
  };

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      stopWebcamTracker();
    };
  }, []);

  // System State Logs
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [statsHistory, setStatsHistory] = useState<number[]>(Array(24).fill(40));
  
  // Auto simulation loop parameters
  const [simNoise, setSimNoise] = useState<number>(0);
  const frameId = useRef<number | null>(null);

  // Constants for expression levels
  const EXPRESSIONS: ExpressionPreset[] = [
    { type: 'NEUTRAL', smileLevel: 8, surpriseLevel: 4, blinkLeft: false, blinkRight: false, attentionScore: 88, label: 'Neutral/Idle State' },
    { type: 'SMILING', smileLevel: 94, surpriseLevel: 15, blinkLeft: false, blinkRight: false, attentionScore: 92, label: 'Pleased Joyous' },
    { type: 'SURPRISED', smileLevel: 40, surpriseLevel: 98, blinkLeft: false, blinkRight: false, attentionScore: 96, label: 'Raised Brows Astonishment' },
    { type: 'LEFT_WINK', smileLevel: 25, surpriseLevel: 8, blinkLeft: true, blinkRight: false, attentionScore: 82, label: 'Wink Left Trigger' },
    { type: 'RIGHT_WINK', smileLevel: 25, surpriseLevel: 8, blinkLeft: false, blinkRight: true, attentionScore: 82, label: 'Wink Right Trigger' },
    { type: 'ENGAGED', smileLevel: 5, surpriseLevel: 2, blinkLeft: false, blinkRight: false, attentionScore: 99, label: 'Deep Gaze Locked focus' },
    { type: 'TIRED', smileLevel: 2, surpriseLevel: 1, blinkLeft: true, blinkRight: true, attentionScore: 35, label: 'Sleepy Blinks' }
  ];

  // Apply explicit face preset simulator
  const applyFacePreset = (type: FaceExpressionType) => {
    if (webcamMode) {
      addLog(`[FACE OS] Please toggle Webcam OFF to use Simulated Presets.`, 'warn');
      return;
    }
    const p = EXPRESSIONS.find((x) => x.type === type) || EXPRESSIONS[0];
    setCurrentExpr(p.type);
    setSmileValue(p.smileLevel);
    setSurpriseValue(p.surpriseLevel);
    setBlinkLeft(p.blinkLeft);
    setBlinkRight(p.blinkRight);
    
    // Execute dynamic actions based on settings
    if (type === 'SMILING' && smileToMute) {
      const prevVol = settings.volume;
      const targetVol = prevVol === 0 ? 60 : 0;
      updateSettings({ volume: targetVol });
      addLog(`[FACE OS] Smile gesture toggled sound volume to ${targetVol}%`, 'success');
    }
    
    if ((type === 'LEFT_WINK' || type === 'RIGHT_WINK') && winkToLog) {
      addLog(`[FACE OS] Wink detected! Snapshotting calibration baseline`, 'active');
    }

    if (type === 'SURPRISED' && raiseBrowToVolume) {
      const nextVol = Math.min(100, settings.volume + 20);
      updateSettings({ volume: nextVol });
      addLog(`[FACE OS] Raised eyebrows amplified sound volume to ${nextVol}%`, 'info');
    }

    // Execute programmatic Eye-Click if onHandUpdate is available and a blink or wink is activated
    if (onHandUpdate && (p.blinkLeft || p.blinkRight || type === 'LEFT_WINK' || type === 'RIGHT_WINK' || type === 'TIRED')) {
      onHandUpdate({
        ...hand,
        isPinching: true,
        gesture: 'PINCH_CLICK',
        lastUpdated: Date.now()
      });
      setTimeout(() => {
        onHandUpdate({
          ...hand,
          isPinching: false,
          gesture: 'POINTER',
          lastUpdated: Date.now()
        });
      }, 200);
      addLog(`[GAZE EVENT] Simulated wink/blink executed click under coordinates (${(hand.x * 100).toFixed(0)}%, ${(hand.y * 100).toFixed(0)}%)`, 'success');
    }

    addLog(`Diagnostic State parsed: ${p.label}`, 'info');
  };

  // Canvas facial mesh rendering simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localAngleX = 0;
    let localAngleY = 0;
    let time = 0;

    const drawPath = (indices: number[], color: string, fill: boolean = false) => {
      if (!realFaceLandmarks.current) return;
      ctx.beginPath();
      indices.forEach((index, i) => {
        const landmark = realFaceLandmarks.current[index];
        if (landmark) {
          const rx = (1 - landmark.x) * canvas.width;
          const ry = landmark.y * canvas.height;
          if (i === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
      });
      if (fill) {
        ctx.fillStyle = 'rgba(0, 223, 193, 0.15)';
        ctx.fill();
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };

    const render = () => {
      if (!isScanning) {
        // Render offline screen
        ctx.fillStyle = '#060a13';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(20, 20); ctx.lineTo(canvas.width - 20, canvas.height - 20);
        ctx.moveTo(canvas.width - 20, 20); ctx.lineTo(20, canvas.height - 20);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText("DIAGNOSTICS OFFLINE - PRESS START SCAN", canvas.width / 2, canvas.height / 2);
        return;
      }

      time += 0.04;

      if (webcamMode) {
        if (cameraStatus === 'active' && videoRef.current && realFaceLandmarks.current) {
          // Draw horizontal mirror mirrored webcam image to fill canvas
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          ctx.restore();

          // Horizontal Laser Scan bar overlay
          const scanY = (Math.sin(time * 0.8) + 1) * 0.5 * canvas.height;
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, scanY);
          ctx.lineTo(canvas.width, scanY);
          ctx.stroke();

          // Green/Cyan target crosshairs over pupils
          const leftTarget = realFaceLandmarks.current[159];
          const rightTarget = realFaceLandmarks.current[386];

          if (leftTarget) {
            const leftX = (1 - leftTarget.x) * canvas.width;
            const leftY = leftTarget.y * canvas.height;
            ctx.strokeStyle = blinkLeft ? '#ef4444' : '#22d3ee';
            ctx.beginPath();
            ctx.arc(leftX, leftY, 15, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(leftX - 6, leftY); ctx.lineTo(leftX + 6, leftY);
            ctx.moveTo(leftX, leftY - 6); ctx.lineTo(leftX, leftY + 6);
            ctx.stroke();
          }

          if (rightTarget) {
            const rightX = (1 - rightTarget.x) * canvas.width;
            const rightY = rightTarget.y * canvas.height;
            ctx.strokeStyle = blinkRight ? '#ef4444' : '#22d3ee';
            ctx.beginPath();
            ctx.arc(rightX, rightY, 15, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(rightX - 6, rightY); ctx.lineTo(rightX + 6, rightY);
            ctx.moveTo(rightX, rightY - 6); ctx.lineTo(rightX, rightY + 6);
            ctx.stroke();
          }

          // Draw outline contours
          drawPath([10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10], 'rgba(0, 223, 193, 0.55)');
          
          // Draw Eyebrows
          drawPath([70, 63, 105, 66, 107], '#06b6d4');
          drawPath([300, 293, 334, 296, 336], '#06b6d4');

          // Draw Eyes Closed Indicator / outline
          drawPath([33, 160, 158, 133, 153, 144, 33], blinkLeft ? 'rgba(239, 68, 68, 0.6)' : 'rgba(52, 211, 153, 0.5)', !blinkLeft);
          drawPath([362, 385, 387, 263, 373, 380, 362], blinkRight ? 'rgba(239, 68, 68, 0.6)' : 'rgba(52, 211, 153, 0.5)', !blinkRight);

          // Draw Mouth
          drawPath([61, 185, 40, 37, 0, 267, 270, 291, 321, 314, 17, 84, 91, 61], 'rgba(244, 63, 94, 0.65)', true);

          // Nose Outline
          drawPath([168, 6, 197, 195, 5, 4, 1, 2, 98, 97, 326, 327, 294, 278, 344], 'rgba(245, 158, 11, 0.5)');

        } else {
          // Camera Loading/Calibrating screen
          ctx.fillStyle = '#040711';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.font = 'bold 10px monospace';
          ctx.fillStyle = '#22d3ee';
          ctx.textAlign = 'center';
          ctx.fillText("FACIAL SCAN RESYNC ACTIVE", canvas.width / 2, canvas.height / 2 - 12);
          ctx.font = '8px monospace';
          ctx.fillStyle = '#64748b';
          ctx.fillText("LOADING CAMERA ENVIRONMENT & FACE MESH...", canvas.width / 2, canvas.height / 2 + 8);
          
          ctx.strokeStyle = '#00dfc1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2 + 28, 8, time * 3, time * 3 + Math.PI);
          ctx.stroke();
        }
      } else {
        // Run Simulated preset wireframe
        ctx.fillStyle = '#050912';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render futuristic network data target circles
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 75, 0, Math.PI * 2);
        ctx.arc(canvas.width / 2, canvas.height / 2, 110, 0, Math.PI * 2);
        ctx.stroke();

        // Corner technical guidelines
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 1.5;
        
        // Top Left corner
        ctx.beginPath(); ctx.moveTo(15, 30); ctx.lineTo(15, 15); ctx.lineTo(30, 15); ctx.stroke();
        // Top Right corner
        ctx.beginPath(); ctx.moveTo(canvas.width - 15, 30); ctx.lineTo(canvas.width - 15, 15); ctx.lineTo(canvas.width - 30, 15); ctx.stroke();
        // Bottom Left
        ctx.beginPath(); ctx.moveTo(15, canvas.height - 30); ctx.lineTo(15, canvas.height - 15); ctx.lineTo(30, canvas.height - 15); ctx.stroke();
        // Bottom Right
        ctx.beginPath(); ctx.moveTo(canvas.width - 15, canvas.height - 30); ctx.lineTo(canvas.width - 15, canvas.height - 15); ctx.lineTo(canvas.width - 30, canvas.height - 15); ctx.stroke();

        // Horizontal Laser Scan bar
        const scanY = (Math.sin(time * 0.8) + 1) * 0.5 * canvas.height;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, scanY);
        ctx.lineTo(canvas.width - 10, scanY);
        ctx.stroke();

        // Glowing scan glow bar edge
        ctx.fillStyle = 'rgba(34, 211, 238, 0.05)';
        ctx.fillRect(10, scanY - 3, canvas.width - 20, 6);

        // Gaze/pointer coordinate updates - if using hand tracker, bind head angles somewhat
        const pX = (hand.rawX ?? hand.x - 0.5);
        const pY = (hand.rawY ?? hand.y - 0.5);
        
        // Update gaze calculations slowly towards targets
        localAngleX = localAngleX * 0.85 + pX * 45 * 0.15;
        localAngleY = localAngleY * 0.85 + pY * 40 * 0.15;
        
        // Face Mesh Node Mapping base offsets
        const cx = canvas.width / 2 + localAngleX * 1.5;
        const cy = canvas.height / 2 + localAngleY * 1.2;

        // Draw the main wireframe Face Mesh structure
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
        ctx.lineWidth = 1.2;

        // Jaw/Chin line outer boundary
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy - 35);
        ctx.bezierCurveTo(cx - 55, cy + 30, cx - 35, cy + 65, cx, cy + 65);
        ctx.bezierCurveTo(cx + 35, cy + 65, cx + 55, cy + 30, cx + 50, cy - 35);
        ctx.stroke();

        // Forehead top shape
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy - 35);
        ctx.bezierCurveTo(cx - 45, cy - 75, cx + 45, cy - 75, cx + 50, cy - 35);
        ctx.stroke();

        // Eyes setup
        const eyeHeightLeft = blinkLeft ? 1 : (6 + surpriseValue * 0.05);
        const eyeHeightRight = blinkRight ? 1 : (6 + surpriseValue * 0.05);

        // Left Eye outer wireframe
        ctx.beginPath();
        ctx.ellipse(cx - 18, cy - 12, 10, eyeHeightLeft, 0, 0, Math.PI * 2);
        ctx.fillStyle = blinkLeft ? 'rgba(34, 211, 238, 0.05)' : 'rgba(34, 211, 238, 0.2)';
        ctx.fill();
        ctx.stroke();

        // Right Eye outer wireframe
        ctx.beginPath();
        ctx.ellipse(cx + 18, cy - 12, 10, eyeHeightRight, 0, 0, Math.PI * 2);
        ctx.fillStyle = blinkRight ? 'rgba(34, 211, 238, 0.05)' : 'rgba(34, 211, 238, 0.2)';
        ctx.fill();
        ctx.stroke();

        // Eyebrows setup
        const browLiftY = surpriseValue * 0.15;
        
        // Left Brow curve
        ctx.beginPath();
        ctx.moveTo(cx - 28, cy - 22 - browLiftY);
        ctx.quadraticCurveTo(cx - 18, cy - 25 - browLiftY, cx - 8, cy - 21 - browLiftY);
        ctx.stroke();

        // Right Brow curve
        ctx.beginPath();
        ctx.moveTo(cx + 8, cy - 21 - browLiftY);
        ctx.quadraticCurveTo(cx + 18, cy - 25 - browLiftY, cx + 28, cy - 22 - browLiftY);
        ctx.stroke();

        // Nose bridges structure
        ctx.beginPath();
        ctx.moveTo(cx, cy - 16);
        ctx.lineTo(cx - 4, cy + 12);
        ctx.lineTo(cx + 4, cy + 12);
        ctx.closePath();
        ctx.stroke();

        // Mouth Setup based on Smile Index level
        const smileWidth = 24 + smileValue * 0.15;
        const smileIncline = smileValue * 0.22;
        const openMouthHeight = (surpriseValue * 0.2) + 2;

        ctx.beginPath();
        // Left edge
        ctx.moveTo(cx - smileWidth / 2, cy + 28);
        // Top lip curve
        ctx.bezierCurveTo(
          cx - smileWidth / 4, cy + 28 + smileIncline - openMouthHeight, 
          cx + smileWidth / 4, cy + 28 + smileIncline - openMouthHeight, 
          cx + smileWidth / 2, cy + 28
        );
        // Bottom lip curve
        ctx.bezierCurveTo(
          cx + smileWidth / 4, cy + 28 + smileIncline + openMouthHeight + (smileValue * 0.05), 
          cx - smileWidth / 4, cy + 28 + smileIncline + openMouthHeight + (smileValue * 0.05), 
          cx - smileWidth / 2, cy + 28
        );
        ctx.closePath();
        ctx.fillStyle = 'rgba(52, 211, 153, 0.15)';
        ctx.fill();
        ctx.stroke();

        // Cheek bone scanning coordinate grids
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
        ctx.beginPath();
        ctx.moveTo(cx - 38, cy + 8); ctx.lineTo(cx - 24, cy + 18);
        ctx.moveTo(cx + 38, cy + 8); ctx.lineTo(cx + 24, cy + 18);
        ctx.stroke();
      }

      // Futuristic wireframe vertical/horizontal alignment ticks
      ctx.fillStyle = '#22d3ee';
      ctx.font = '7px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`YAW:  ${(webcamMode ? faceAngleX : localAngleX).toFixed(1)}°`, 20, canvas.height - 35);
      ctx.fillText(`PITCH: ${(webcamMode ? faceAngleY : localAngleY).toFixed(1)}°`, 20, canvas.height - 25);
      ctx.fillText(`EXPR:  ${currentExpr}`, 20, canvas.height - 15);

      // System Telemetry watermark stats overlay inside the diagnostic box
      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`ATTENTION: ${(92 + Math.sin(time) * 3).toFixed(1)}%`, canvas.width - 20, canvas.height - 35);
      ctx.fillText(`SMILE_MOD: ${(smileValue).toFixed(0)} u`, canvas.width - 20, canvas.height - 25);
      ctx.fillText(`DIAG_FPS:  ${(29.8 + Math.cos(time)*0.4).toFixed(1)}hz`, canvas.width - 20, canvas.height - 15);

      frameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (frameId.current) cancelAnimationFrame(frameId.current);
    };
  }, [isScanning, smileValue, surpriseValue, blinkLeft, blinkRight, currentExpr, hand, webcamMode, cameraStatus, faceAngleX, faceAngleY]);

  // Simulate stat history fluctuation
  useEffect(() => {
    const handler = setInterval(() => {
      if (!isScanning) return;
      setStatsHistory((prev) => {
        const next = [...prev.slice(1)];
        // Fluctuating metric based on current expression
        const base = currentExpr === 'ENGAGED' ? 95 : currentExpr === 'SMILING' ? 78 : currentExpr === 'TIRED' ? 30 : 60;
        const noisy = Math.max(10, Math.min(100, Math.round(base + (Math.random() * 12 - 6))));
        next.push(noisy);
        return next;
      });
    }, 1500);

    return () => clearInterval(handler);
  }, [isScanning, currentExpr]);

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] text-slate-100 font-mono text-[11px] h-full overflow-y-auto">
      
      {/* 1. APP HERO HEADER BAR */}
      <div className="p-3 bg-[#0c1223] border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#00dfc1]/10 border border-[#00dfc1]/30 flex items-center justify-center text-[#00dfc1]">
            <Scan size={14} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#00dfc1] leading-none">AERO FACE SCANNER</h2>
            <span className="text-[9px] text-slate-500 uppercase mt-1 block">Bio-Facial Action-Units Diagnostics & triggers</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Simulated vs Real Webcam Toggle */}
          <button
            onClick={handleToggleWebcamMode}
            className={`px-3 py-1 flex items-center gap-1.5 text-[10px] uppercase font-bold rounded cursor-pointer select-none transition-colors border ${
              webcamMode 
                ? 'bg-cyan-950/70 border-cyan-600/80 text-cyan-400 hover:bg-cyan-900/50' 
                : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-slate-300 hover:bg-slate-800'
            }`}
          >
            {webcamMode ? (
              <>
                <Camera size={10} className="text-cyan-400 animate-pulse" /> Camera: Webcam On
              </>
            ) : (
              <>
                <VideoOff size={10} className="text-slate-500" /> Camera: Simulation
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsScanning(!isScanning);
              addLog(`[FACE OS] ${!isScanning ? 'Initialized facial diagnostic node' : 'Deactivated spatial face grid scanner'}`, !isScanning ? 'success' : 'warn');
            }}
            className={`px-3 py-1 flex items-center gap-1 text-[10px] uppercase font-bold rounded cursor-pointer select-none transition-colors border ${
              isScanning 
                ? 'bg-[#1a111a] border-[#b45309] text-[#f59e0b] hover:bg-amber-950/40' 
                : 'bg-emerald-950/50 border-emerald-700 text-emerald-400 hover:bg-emerald-900/60'
            }`}
          >
            {isScanning ? (
              <>
                <Square size={10} className="fill-[#f59e0b]" /> Stop Scanner
              </>
            ) : (
              <>
                <Play size={10} className="fill-emerald-400" /> Boot Scanner
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. CORE INTERFACE GRID */}
      <div className="flex-1 p-3 flex flex-col lg:flex-row gap-3 min-h-0">
        
        {/* Left Interactive Scan Column */}
        <div className="flex-grow flex flex-col gap-2 min-h-[290px]">
          <div className="flex items-center justify-between text-[10px] text-slate-450 uppercase font-bold tracking-wider">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Eye size={12} className="animate-pulse" />
              Grid Mapping feed
            </span>
            <span className="text-[9px] text-slate-500 bg-slate-950 py-0.5 px-2 rounded border border-slate-900 font-mono">
              Matrix Coordinates Engine
            </span>
          </div>

          {/* Interactive HTML5 Canvas Render box */}
          <div className="flex-1 relative bg-[#060a13] rounded border border-slate-800 flex items-center justify-center overflow-hidden min-h-[220px]">
            <canvas
              ref={canvasRef}
              width={340}
              height={225}
              className="w-full max-w-sm aspect-[4/3] rounded select-none pointer-events-none"
            />
            
            {/* Real-time Overlay HUD labels */}
            {isScanning && (
              <div className="absolute top-2 left-2 bg-slate-950/80 p-2 rounded border border-slate-850/60 text-[8px] font-mono text-slate-400 max-w-[130px] select-none leading-relaxed pointer-events-none">
                <p className="font-bold text-cyan-400 mb-0.5 tracking-wider">SENSORS ONLINE</p>
                <p>BIOMETRIC: PASS</p>
                <p>FACIAL MESH: OK</p>
                <p className="text-emerald-400">LOCK: SYMMETRICAL</p>
              </div>
            )}
            
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 select-none">
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${isScanning ? 'bg-emerald-950 border border-emerald-700/60 text-emerald-400' : 'bg-red-950 border border-red-800 text-red-400'}`}>
                ● {isScanning ? 'STREAMING ACTIVE' : 'DIAG OFFLINE'}
              </span>
              {isScanning && (
                <span className="text-[8px] text-slate-500 bg-slate-950/90 py-0.5 px-1 rounded border border-slate-850/60 block mt-0.5">
                  Hz: {(29.4 + Math.sin(Date.now() / 1000) * 0.5).toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Futuristic Iris Gaze Interactive Tracker Pad */}
          <div className="bg-[#080d19] rounded border border-slate-800 p-2.5 flex flex-col gap-1.5 mt-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider flex items-center gap-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Live Iris Gaze Controller Pad
              </span>
              <button 
                onClick={() => {
                  const nextVal = !settings.eyeControlMode;
                  updateSettings({ eyeControlMode: nextVal });
                  addLog(nextVal ? 'Gaze Control override enabled via Face Scanner' : 'Gaze Control override disabled', nextVal ? 'success' : 'warn');
                }}
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase transition-colors pointer-events-auto cursor-pointer ${
                  settings.eyeControlMode
                    ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-400'
                    : 'bg-slate-900 border-slate-805 text-slate-500 hover:text-slate-350'
                }`}
              >
                Gaze Override: {settings.eyeControlMode ? 'ACTIVE' : 'OFF'}
              </button>
            </div>
            
            <p className="text-[8px] text-slate-500 uppercase leading-snug">
              {settings.eyeControlMode 
                ? '🟢 ACTIVE: Hover or drag inside radar to aim Iris sights, CLICK to blink-click!' 
                : '⚪ Turn Gaze Override ON, then hover inside to drive the desktop cursor via virtual sight!'}
            </p>

            <div className="flex gap-2.5 items-center mt-1">
              {/* Concentric radar coordinates board */}
              <div 
                className="relative w-28 h-28 bg-[#040710] rounded-full border border-slate-800 flex items-center justify-center overflow-hidden cursor-crosshair group active:border-cyan-500"
                onMouseMove={(e) => {
                  const bounds = e.currentTarget.getBoundingClientRect();
                  const x = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
                  const y = Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height));
                  setGazeX(x);
                  setGazeY(y);

                  if (settings.eyeControlMode && onHandUpdate) {
                    onHandUpdate({
                      ...hand,
                      x,
                      y,
                      rawX: x,
                      rawY: y,
                      confidence: 1.0,
                      lastUpdated: Date.now()
                    }, true);
                  }
                }}
                onMouseDown={() => {
                  if (settings.eyeControlMode && onHandUpdate) {
                    onHandUpdate({
                      ...hand,
                      isPinching: true,
                      gesture: 'PINCH_CLICK',
                      lastUpdated: Date.now()
                    }, true);
                    addLog(`[EYE CONTROL] Concentrice radar blink triggered click at (${(gazeX * 100).toFixed(0)}%, ${(gazeY * 100).toFixed(0)}%)`, 'success');
                  }
                }}
                onMouseUp={() => {
                  if (settings.eyeControlMode && onHandUpdate) {
                    onHandUpdate({
                      ...hand,
                      isPinching: false,
                      gesture: 'POINTER',
                      lastUpdated: Date.now()
                    }, true);
                  }
                }}
              >
                {/* Concentric Radar Circles */}
                <div className="absolute w-20 h-20 rounded-full border border-slate-900/60 pointer-events-none" />
                <div className="absolute w-12 h-12 rounded-full border border-slate-900/40 pointer-events-none" />
                {/* Axes lines */}
                <div className="absolute w-full h-[1px] bg-slate-900/30 pointer-events-none" />
                <div className="absolute h-full w-[1px] bg-slate-900/30 pointer-events-none" />

                {/* Radar Sweep Ray */}
                <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-cyan-500/20 origin-left animate-[spin_4s_linear_infinite] pointer-events-none" />

                {/* Tracking Target Sight cross */}
                <div 
                  className="absolute w-3.5 h-3.5 border border-cyan-400 rounded-full flex items-center justify-center transition-all duration-75 pointer-events-none"
                  style={{
                    left: `${gazeX * 100}%`,
                    top: `${gazeY * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                </div>
              </div>

              {/* Readouts & Calibration status */}
              <div className="flex-1 flex flex-col gap-1 text-[8px] text-slate-400 font-mono tracking-wider">
                <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded border border-slate-900">
                  <div className="flex flex-col">
                    <span className="text-slate-600">SACCADE X</span>
                    <span className="font-bold text-cyan-400">{(gazeX * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-600">SACCADE Y</span>
                    <span className="font-bold text-cyan-400">{(gazeY * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 bg-slate-950/40 p-1 rounded border border-slate-900 mt-0.5 text-[8px] leading-tight">
                  <p className="text-slate-600 uppercase">System Status:</p>
                  <p className="text-[#00dfc1] font-bold">● IRIS_LOCK_SYNC</p>
                  <p className="text-[7px] text-slate-500 leading-normal">Blink, Wink or Press Preset triggers click below reticle.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Parameters Dashboard */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
          
          {/* Section A: Simulator Presets triggers */}
          <div className="p-2.5 bg-[#0c1223] rounded border border-slate-800 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase font-bold text-[#22d3ee] tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Sparkles size={12} className="text-cyan-400" />
              SIMULATE FACIAL ACTION
            </span>
            <span className="text-[8px] text-slate-500 mb-1 leading-normal uppercase">
              Click preset state to force face expression read inside Aero OS:
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {EXPRESSIONS.map((preset) => {
                const isCurrent = currentExpr === preset.type;
                return (
                  <button
                    key={preset.type}
                    onClick={() => applyFacePreset(preset.type)}
                    className={`px-1.5 py-1.5 text-left rounded text-3xs font-bold uppercase border transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-400 font-bold shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Smile size={10} className={isCurrent ? 'text-cyan-400' : 'text-slate-550'} />
                      <span className="truncate">{preset.type.replace('_', ' ')}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section B: Action Triggers bindings settings */}
          <div className="p-3 bg-[#0c1223] rounded border border-slate-800 flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-[#00dfc1] tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <Zap size={12} className="text-[#00dfc1]" />
              FACIAL GESTURE TRIGGER MAPS
            </span>
            <div className="space-y-2.5">
              {/* Trigger 1: Smile to Mute */}
              <div className="flex items-center justify-between gap-2">
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-200 flex items-center gap-1 uppercase">
                    Smile Detector Control
                  </p>
                  <span className="text-[8px] text-slate-500 block leading-tight mt-0.5 font-normal">
                    Toggles sound volume 0% / 60% on Smile detection
                  </span>
                </div>
                <button
                  onClick={() => setSmileToMute(!smileToMute)}
                  className="rounded text-slate-400 hover:text-white transition-colors cursor-pointer select-none shrink-0"
                >
                  {smileToMute ? <ToggleRight size={22} className="text-[#00dfc1]" /> : <ToggleLeft size={22} className="text-slate-600" />}
                </button>
              </div>

              {/* Trigger 2: Wink action helper */}
              <div className="flex items-center justify-between gap-2">
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-200 flex items-center gap-1 uppercase">
                    Wink Baseline Syncer
                  </p>
                  <span className="text-[8px] text-slate-500 block leading-tight mt-0.5 font-normal">
                    Triggers calibration offset markers save action on Wink
                  </span>
                </div>
                <button
                  onClick={() => setWinkToLog(!winkToLog)}
                  className="rounded text-slate-400 hover:text-white transition-colors cursor-pointer select-none shrink-0"
                >
                  {winkToLog ? <ToggleRight size={22} className="text-[#00dfc1]" /> : <ToggleLeft size={22} className="text-slate-600" />}
                </button>
              </div>

              {/* Trigger 3: Raised brows */}
              <div className="flex items-center justify-between gap-2">
                <div className="leading-tight">
                  <p className="text-[10px] font-bold text-slate-200 flex items-center gap-1 uppercase">
                    Astonishment Amp
                  </p>
                  <span className="text-[8px] text-slate-500 block leading-tight mt-0.5 font-normal">
                    Raises volume by +20% on raised eyebrows (Surprise)
                  </span>
                </div>
                <button
                  onClick={() => setRaiseBrowToVolume(!raiseBrowToVolume)}
                  className="rounded text-slate-400 hover:text-white transition-colors cursor-pointer select-none shrink-0"
                >
                  {raiseBrowToVolume ? <ToggleRight size={22} className="text-[#00dfc1]" /> : <ToggleLeft size={22} className="text-slate-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section C: Live spark tension timeline */}
          <div className="p-2.5 bg-[#0a0f1d] rounded border border-slate-850/80 flex flex-col gap-1.5">
            <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity size={11} className="text-indigo-400" />
                Attention Score Timeline
              </span>
              <span className="text-[8px] bg-indigo-950 text-indigo-400 px-1 rounded">24 Cycles</span>
            </span>
            <div className="h-9 flex items-end gap-0.5 bg-slate-950/80 p-1.5 rounded border border-slate-900">
              {statsHistory.map((val, idx) => (
                <div
                  key={idx}
                  className="flex-1 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${val}%`,
                    backgroundColor: val > 80 ? '#10b981' : val > 50 ? '#06b6d4' : val > 30 ? '#f59e0b' : '#ef4444'
                  }}
                  title={`Cycle ${idx}: ${val}% Lock`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-[8px] text-slate-500 mt-1 uppercase">
              <span>Stable track Lock: PASS</span>
              <span className="text-[#00dfc1] font-bold">Focus: {statsHistory[statsHistory.length - 1]}%</span>
            </div>
          </div>

        </div>

      </div>

      {/* Hidden webcam video stream element for MediaPipe Face Mesh */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        width={640}
        height={480}
      />

    </div>
  );
}
