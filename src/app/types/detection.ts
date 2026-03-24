export type TagType = 'AprilTag' | 'AprilTag2' | 'AprilTag3' | 'ArUco';
export type CameraStatus = 'requesting' | 'ready' | 'error' | 'unsupported';
export type DetectionCorner = [number, number];
export type PerformanceProfile = 'battery' | 'balanced' | 'precision';
export type DetectorBackend = 'wasm' | 'unavailable';

export const REALTIME_DETECTOR_FAMILIES = [
  'tag36h11',
  'tag25h9',
  'tag16h5',
  'tagCircle21h7',
  'tagCircle49h12',
  'tagStandard41h12',
  'tagStandard52h13',
] as const;

export type RealtimeDetectorFamily = (typeof REALTIME_DETECTOR_FAMILIES)[number];

export const REALTIME_DETECTOR_FAMILY_MASKS: Record<RealtimeDetectorFamily, number> = {
  tag36h11: 1 << 0,
  tag25h9: 1 << 1,
  tag16h5: 1 << 2,
  tagCircle21h7: 1 << 3,
  tagCircle49h12: 1 << 4,
  tagStandard41h12: 1 << 5,
  tagStandard52h13: 1 << 6,
};

export const REALTIME_DETECTOR_ALL_FAMILY_MASK = REALTIME_DETECTOR_FAMILIES.reduce(
  (mask, family) => mask | REALTIME_DETECTOR_FAMILY_MASKS[family],
  0,
);

export interface DetectionResult {
  id: number;
  corners: [DetectionCorner, DetectionCorner, DetectionCorner, DetectionCorner];
  tagType?: TagType;
  family?: string;
}

export const TAG_FAMILIES: Record<TagType, string[]> = {
  AprilTag: [
    'tag36h11',
    'tag25h9',
    'tag16h5',
    'tagCircle21h7',
    'tagCircle49h12',
    'tagStandard41h12',
    'tagStandard52h13'
  ],
  AprilTag2: ['tag36h11', 'tag25h9', 'tag16h5'],
  AprilTag3: ['tag36h11', 'tag25h9', 'tag16h5'],
  ArUco: [
    'DICT_4X4_50',
    'DICT_4X4_100',
    'DICT_4X4_250',
    'DICT_4X4_1000',
    'DICT_5X5_50',
    'DICT_5X5_100',
    'DICT_5X5_250',
    'DICT_5X5_1000',
    'DICT_6X6_50',
    'DICT_6X6_100',
    'DICT_6X6_250',
    'DICT_6X6_1000',
    'DICT_7X7_50',
    'DICT_7X7_100',
    'DICT_7X7_250',
    'DICT_7X7_1000'
  ]
};

export interface PerformanceProfileConfig {
  label: string;
  description: string;
  width: number;
  height: number;
  frameSkip: number;
}

export const PERFORMANCE_PROFILES: Record<PerformanceProfile, PerformanceProfileConfig> = {
  battery: {
    label: 'Battery Saver',
    description: '640x480 / 5フレームごとに検出',
    width: 640,
    height: 480,
    frameSkip: 5,
  },
  balanced: {
    label: 'Balanced',
    description: '960x540 / 3フレームごとに検出',
    width: 960,
    height: 540,
    frameSkip: 3,
  },
  precision: {
    label: 'Precision',
    description: '1280x720 / 2フレームごとに検出',
    width: 1280,
    height: 720,
    frameSkip: 2,
  },
};

export interface DetectionSettings {
  tagType: TagType | 'auto';
  family: string | 'auto';
  performanceProfile: PerformanceProfile;
}

export function getRealtimeDetectorFamilies(settings: DetectionSettings): RealtimeDetectorFamily[] {
  if (settings.tagType === 'ArUco') {
    return [];
  }

  if (settings.family !== 'auto') {
    return settings.family in REALTIME_DETECTOR_FAMILY_MASKS
      ? [settings.family as RealtimeDetectorFamily]
      : [];
  }

  if (settings.tagType === 'AprilTag2' || settings.tagType === 'AprilTag3') {
    return ['tag36h11', 'tag25h9', 'tag16h5'];
  }

  return [...REALTIME_DETECTOR_FAMILIES];
}

export function getRealtimeDetectorFamilyMask(settings: DetectionSettings) {
  return getRealtimeDetectorFamilies(settings).reduce(
    (mask, family) => mask | REALTIME_DETECTOR_FAMILY_MASKS[family],
    0,
  );
}

export function isRealtimeDetectionSupported(settings: DetectionSettings) {
  return getRealtimeDetectorFamilies(settings).length > 0;
}

export function getRealtimeDetectorLabel(settings: DetectionSettings) {
  const families = getRealtimeDetectorFamilies(settings);

  if (families.length === 0) {
    return 'ArUco unavailable';
  }

  if (families.length === 1) {
    return `AprilTag ${families[0]}`;
  }

  return `AprilTag ${families.length} families`;
}

export interface DetectionJob {
  width: number;
  height: number;
  frame: number;
  settings: DetectionSettings;
}

export interface DetectionWorkerRequest extends DetectionJob {
  type: 'detect';
  grayscale: ArrayBuffer;
}

export interface DetectionWorkerResponse {
  type: 'result';
  frame: number;
  detections: DetectionResult[];
  backend: DetectorBackend;
}
