import {
  CameraStatus,
  DetectionResult,
  DetectionSettings,
  DetectorBackend,
  getRealtimeDetectorLabel,
  PERFORMANCE_PROFILES,
} from '../types/detection';

interface DetectionInfoProps {
  detections: DetectionResult[];
  isDetecting: boolean;
  cameraStatus: CameraStatus;
  cameraMessage?: string;
  detectorBackend: DetectorBackend;
  settings: DetectionSettings;
}

const cameraLabels: Record<CameraStatus, string> = {
  requesting: 'カメラ準備中',
  ready: 'カメラ利用可能',
  error: 'カメラエラー',
  unsupported: 'HTTPS/対応ブラウザが必要',
};

export function DetectionInfo({
  detections,
  isDetecting,
  cameraStatus,
  cameraMessage,
  detectorBackend,
  settings,
}: DetectionInfoProps) {
  const performanceProfile = PERFORMANCE_PROFILES[settings.performanceProfile];
  const currentDetection = detections[0];
  const stateLabel = isDetecting ? 'LIVE' : 'STANDBY';

  return (
    <div className="pointer-events-none absolute left-4 right-20 top-[calc(env(safe-area-inset-top)+1rem)] z-10">
      <div className="w-fit max-w-full rounded-[28px] border border-white/[0.12] bg-neutral-950/60 px-4 py-3 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/[0.45]">Live Monitor</p>
            <h2 className="mt-1 truncate text-lg font-semibold tracking-tight">AprilTag Monitor</h2>
          </div>
          <div
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
              isDetecting
                ? 'bg-emerald-500/16 text-emerald-300 ring-1 ring-emerald-400/30'
                : 'bg-white/[0.08] text-white/[0.72] ring-1 ring-white/10'
            }`}
          >
            {stateLabel}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-white/[0.72]">
          <div className="rounded-full bg-white/[0.08] px-3 py-1.5">
            {cameraLabels[cameraStatus]}
          </div>
          <div className="rounded-full bg-white/[0.08] px-3 py-1.5">
            {performanceProfile.label}
          </div>
          <div className="rounded-full bg-white/[0.08] px-3 py-1.5">
            {detectorBackend === 'wasm' ? `WASM ${getRealtimeDetectorLabel(settings)}` : 'Detector unavailable'}
          </div>
          <div className="rounded-full bg-emerald-500/12 px-3 py-1.5 text-emerald-200">
            {detections.length} hit{detections.length === 1 ? '' : 's'}
          </div>
        </div>

        {cameraMessage && cameraStatus !== 'ready' && (
          <p className="mt-3 max-w-[18rem] text-xs leading-5 text-amber-200">{cameraMessage}</p>
        )}

        {currentDetection && (
          <div className="mt-3 rounded-2xl border border-emerald-400/[0.18] bg-emerald-500/10 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-sm text-emerald-300">ID {currentDetection.id}</span>
              <span className="text-[11px] text-white/[0.45]">primary lock</span>
            </div>
            <p className="mt-1 text-xs text-white/[0.72]">
              {currentDetection.family ?? 'Unknown family'}
            </p>
          </div>
        )}

        {!currentDetection && detectorBackend !== 'wasm' && (
          <p className="mt-3 text-xs leading-5 text-white/[0.58]">
            WASM 検出器を利用できませんでした。ページを再読み込みして、もう一度スキャンを試してください。
          </p>
        )}
      </div>
    </div>
  );
}
