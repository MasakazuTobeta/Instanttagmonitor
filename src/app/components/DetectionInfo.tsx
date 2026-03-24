import {
  CameraStatus,
  DetectionResult,
  DetectionSettings,
  DetectorBackend,
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
  const selectionLabel =
    settings.tagType === 'auto'
      ? '自動判定 / すべてのタグ'
      : `${settings.tagType} / ${settings.family === 'auto' ? 'family auto' : settings.family}`;

  return (
    <div className="absolute top-4 left-4 right-20 z-10">
      <div className="rounded-2xl border border-white/10 bg-black/65 p-4 text-white shadow-xl backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold tracking-wide">AprilTag Monitor</h2>
            <p className="text-xs text-gray-400">WASM-ready detector pipeline / camera overlay demo</p>
          </div>
          <div className="flex items-center gap-2">
            {isDetecting && (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-400">検出中</span>
              </>
            )}
            {!isDetecting && (
              <span className="text-sm text-gray-400">停止中</span>
            )}
          </div>
        </div>

        <div className="grid gap-2 text-xs text-gray-200 sm:grid-cols-4">
          <div className="rounded-xl bg-white/8 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Camera</p>
            <p className="mt-1 font-medium text-white">{cameraLabels[cameraStatus]}</p>
          </div>
          <div className="rounded-xl bg-white/8 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Mode</p>
            <p className="mt-1 font-medium text-white">{selectionLabel}</p>
          </div>
          <div className="rounded-xl bg-white/8 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Perf</p>
            <p className="mt-1 font-medium text-white">{performanceProfile.label}</p>
            <p className="mt-1 text-[11px] text-gray-400">{performanceProfile.description}</p>
          </div>
          <div className="rounded-xl bg-white/8 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Backend</p>
            <p className="mt-1 font-medium text-white">{detectorBackend === 'wasm' ? 'WASM' : 'Mock JS'}</p>
            <p className="mt-1 text-[11px] text-gray-400">
              {detectorBackend === 'wasm' ? 'AssemblyScript contrast detector' : 'JS mock fallback detector'}
            </p>
          </div>
        </div>

        {cameraMessage && cameraStatus !== 'ready' && (
          <p className="mt-3 text-xs leading-5 text-amber-200">{cameraMessage}</p>
        )}

        {detections.length > 0 ? (
          <div className="space-y-2 mt-3">
            <p className="text-sm text-gray-300">検出数: {detections.length}</p>
            {detections.map((detection, index) => (
              <div key={`${detection.id}-${index}`} className="space-y-1 rounded-xl bg-white/10 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-green-400">Tag ID: {detection.id}</span>
                  <span className="text-xs text-gray-400">#{index + 1}</span>
                </div>
                {detection.tagType && (
                  <div className="text-xs text-gray-300">
                    <span className="text-gray-400">Type:</span> {detection.tagType}
                  </div>
                )}
                {detection.family && (
                  <div className="text-xs text-gray-300">
                    <span className="text-gray-400">Family:</span> {detection.family}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : isDetecting ? (
          <p className="mt-3 text-sm text-gray-400">タグをスキャン中...</p>
        ) : cameraStatus === 'ready' ? (
          <p className="text-sm text-gray-400 mt-2">検出を開始してください</p>
        ) : (
          <p className="mt-3 text-sm text-gray-400">カメラの準備が完了すると検出を開始できます</p>
        )}
      </div>
    </div>
  );
}
