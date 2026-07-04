export type GestureType = 'NONE' | 'POINTER' | 'PINCH_CLICK' | 'GRAB' | 'SCROLL_UP' | 'SCROLL_DOWN' | 'WAVE_LEFT' | 'WAVE_RIGHT';

export interface HandData {
  x: number;
  y: number;
  rawX?: number;
  rawY?: number;
  isPinching: boolean;
  isFist: boolean;
  gesture: GestureType;
  confidence: number;
  lastUpdated: number;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'active';
}

export type AppId = 'guide' | 'airpaint' | 'game' | 'media' | 'keyboard' | 'settings' | 'calibration' | 'faceread' | 'aiworkspace';

export interface OSWindow {
  id: AppId;
  title: string;
  icon: string; // Lucide icon key
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface LaptopSettings {
  cursorSensitivity: number;
  cursorSmoothing: number; // For low-pass filtering
  showWebcamOverlay: boolean;
  showSkeleton: boolean;
  simulatedHandMode: boolean; // Fallback mouse/touch controller
  theme: 'slate' | 'cyberpunk' | 'warm-oak' | 'polar';
  accentColor?: 'cyan' | 'pink' | 'emerald' | 'amber' | 'velvet' | 'rose';
  lensInvertMode?: boolean;
  volume: number;
  calibTL_x: number;
  calibTL_y: number;
  calibTR_x: number;
  calibTR_y: number;
  calibBL_x: number;
  calibBL_y: number;
  calibBR_x: number;
  calibBR_y: number;
  eyeControlMode?: boolean;
  blinkClickSensitivity?: number;
  customWallpaper?: string;
}
