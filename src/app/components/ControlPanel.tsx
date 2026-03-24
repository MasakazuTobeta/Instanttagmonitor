import { Camera, CameraOff, Info, LoaderCircle } from 'lucide-react';
import { CameraStatus } from '../types/detection';

interface ControlPanelProps {
  isDetecting: boolean;
  cameraStatus: CameraStatus;
  onToggleDetection: () => void;
}

export function ControlPanel({
  isDetecting,
  cameraStatus,
  onToggleDetection,
}: ControlPanelProps) {
  const isReady = cameraStatus === 'ready';

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent">
      <div className="p-6 space-y-4">
        <div className="flex justify-center">
          <button
            onClick={onToggleDetection}
            disabled={!isReady}
            className={`flex items-center gap-3 rounded-full px-8 py-4 text-lg font-bold transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
              isDetecting
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {cameraStatus === 'requesting' ? (
              <>
                <LoaderCircle className="h-6 w-6 animate-spin" />
                カメラ準備中
              </>
            ) : isDetecting ? (
              <>
                <CameraOff className="h-6 w-6" />
                停止
              </>
            ) : (
              <>
                <Camera className="h-6 w-6" />
                検出開始
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl bg-white/10 p-4 text-sm text-white backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="font-bold">使い方</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                <li>「検出開始」ボタンを押してスキャンを開始</li>
                <li>設定からパフォーマンスプロファイルを切り替えられます</li>
                <li>タグは緑色の枠と ID・タイプ表示でオーバーレイされます</li>
              </ul>
              <p className="mt-2 text-xs text-gray-400">
                ※現在はデモモードです。Worker ベースの検出間隔と解像度切替で、軽量端末でも試しやすい構成にしています。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
