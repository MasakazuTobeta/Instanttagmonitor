import { useState } from 'react';
import {
  Camera,
  CameraOff,
  Info,
  LoaderCircle,
  X,
} from 'lucide-react';
import {
  CameraStatus,
  DetectionResult,
  DetectionSettings,
  DetectorBackend,
  getRealtimeDetectorFamilies,
  getRealtimeDetectorLabel,
  PERFORMANCE_PROFILES,
} from '../types/detection';

interface ControlPanelProps {
  isDetecting: boolean;
  cameraStatus: CameraStatus;
  detections: DetectionResult[];
  detectorBackend: DetectorBackend;
  settings: DetectionSettings;
  onToggleDetection: () => void;
}

const cameraLabels: Record<CameraStatus, string> = {
  requesting: 'カメラ準備中',
  ready: 'カメラ利用可能',
  error: 'カメラエラー',
  unsupported: 'HTTPS/対応ブラウザが必要',
};

export function ControlPanel({
  isDetecting,
  cameraStatus,
  detections,
  detectorBackend,
  settings,
  onToggleDetection,
}: ControlPanelProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const isReady = cameraStatus === 'ready';
  const performanceProfile = PERFORMANCE_PROFILES[settings.performanceProfile];
  const realtimeFamilies = getRealtimeDetectorFamilies(settings);
  const selectionLabel =
    settings.tagType === 'auto'
      ? '自動判定 / AprilTag families'
      : `${settings.tagType} / ${settings.family === 'auto' ? 'family auto' : settings.family}`;

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[32px] border border-white/[0.12] bg-neutral-950/[0.58] p-3 text-white shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <button
            onClick={() => setIsSheetOpen(true)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.07] text-white transition-colors hover:bg-white/[0.12]"
            aria-label="詳細を開く"
          >
            <Info className="h-5 w-5" />
          </button>

          <button
            onClick={onToggleDetection}
            disabled={!isReady}
            className={`flex min-w-0 flex-1 items-center justify-center gap-3 rounded-[24px] px-6 py-4 text-base font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
              isDetecting
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-emerald-500 text-white hover:bg-emerald-600'
            }`}
          >
            {cameraStatus === 'requesting' ? (
              <>
                <LoaderCircle className="h-5 w-5 animate-spin" />
                カメラ準備中
              </>
            ) : isDetecting ? (
              <>
                <CameraOff className="h-5 w-5" />
                停止
              </>
            ) : (
              <>
                <Camera className="h-5 w-5" />
                検出開始
              </>
            )}
          </button>

          <div className="w-16 shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/[0.42]">Hits</p>
            <p className="mt-1 text-lg font-semibold leading-none">{detections.length}</p>
            <p
              className={`mt-1 text-[11px] ${
                detectorBackend === 'wasm' ? 'text-emerald-300' : 'text-white/55'
              }`}
            >
              {detectorBackend === 'wasm' ? 'WASM' : 'Off'}
            </p>
          </div>
        </div>
      </div>

      {isSheetOpen && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsSheetOpen(false)}
            aria-label="詳細を閉じる"
          />
          <div className="absolute inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <div className="mx-auto max-w-md overflow-hidden rounded-[32px] border border-white/[0.12] bg-neutral-950/[0.92] text-white shadow-[0_28px_90px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
              <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/[0.4]">Session</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">検出ダッシュボード</h3>
                </div>
                <button
                  onClick={() => setIsSheetOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.08] text-white transition-colors hover:bg-white/[0.12]"
                  aria-label="閉じる"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[62vh] space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/[0.4]">Camera</p>
                    <p className="mt-2 font-medium">{cameraLabels[cameraStatus]}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/[0.4]">Backend</p>
                    <p className="mt-2 font-medium">
                      {detectorBackend === 'wasm' ? getRealtimeDetectorLabel(settings) : 'Detector unavailable'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/[0.4]">Mode</p>
                    <p className="mt-2 font-medium">{selectionLabel}</p>
                  </div>
                  <div className="rounded-2xl bg-white/[0.06] p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/[0.4]">Perf</p>
                    <p className="mt-2 font-medium">{performanceProfile.label}</p>
                    <p className="mt-1 text-xs text-white/[0.45]">{performanceProfile.description}</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-emerald-400/[0.18] bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/60">Live Summary</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{detections.length}</p>
                    </div>
                    <div className="rounded-full bg-emerald-500/12 px-3 py-1 text-sm font-medium text-emerald-200">
                      {isDetecting ? 'スキャン中' : '待機中'}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-emerald-50/[0.78]">
                    {detections.length > 0
                      ? '検出結果はカメラ上の枠線とここに表示されます。'
                      : 'タグが見つかるとここに ID とタイプが並びます。'}
                  </p>
                </div>

                <div className="rounded-[28px] bg-white/[0.05] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold">検出結果</h4>
                    <span className="text-xs text-white/[0.45]">{detections.length} 件</span>
                  </div>
                  {detections.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {detections.map((detection, index) => (
                        <div
                          key={`${detection.id}-${index}`}
                          className="rounded-2xl border border-white/[0.08] bg-white/[0.06] p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-sm text-emerald-300">ID {detection.id}</span>
                            <span className="text-[11px] text-white/[0.38]">#{index + 1}</span>
                          </div>
                          <p className="mt-1 text-sm text-white/[0.75]">
                            {detection.tagType ?? 'Unknown'} / {detection.family ?? 'auto'}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-white/[0.55]">
                      {realtimeFamilies.length === 1
                        ? <>いまは結果なしです。<span className="font-mono">{realtimeFamilies[0]}</span> を正面から映して、緑の枠が出るまで少し待ってください。</>
                        : 'いまは結果なしです。選択中の AprilTag を正面から映して、緑の枠が出るまで少し待ってください。'}
                    </p>
                  )}
                </div>

                <div className="rounded-[28px] bg-white/[0.05] p-4 text-sm text-white/[0.74]">
                  <h4 className="font-semibold text-white">使い方</h4>
                  <p className="mt-3">「検出開始」を押すとスキャンを開始します。</p>
                  <p className="mt-2">設定からパフォーマンスプロファイルとタグ種類を切り替えられます。</p>
                  <p className="mt-2">
                    AprilTag は複数 family を実検出できます。ArUco はまだ未対応なので、AprilTag 側を選んで利用してください。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
