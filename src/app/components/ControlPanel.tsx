import { Camera, CameraOff, Info } from 'lucide-react';

interface ControlPanelProps {
  isDetecting: boolean;
  onToggleDetection: () => void;
}

export function ControlPanel({ isDetecting, onToggleDetection }: ControlPanelProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 to-transparent">
      <div className="p-6 space-y-4">
        {/* Main control button */}
        <div className="flex justify-center">
          <button
            onClick={onToggleDetection}
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-bold text-lg transition-all transform active:scale-95 ${
              isDetecting
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isDetecting ? (
              <>
                <CameraOff className="w-6 h-6" />
                停止
              </>
            ) : (
              <>
                <Camera className="w-6 h-6" />
                検出開始
              </>
            )}
          </button>
        </div>

        {/* Info section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">使い方</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-gray-300">
                <li>「検出開始」ボタンを押してスキャンを開始</li>
                <li>AprilTagにカメラを向けてください</li>
                <li>検出されたタグは緑色の枠で表示されます</li>
              </ul>
              <p className="text-xs text-gray-400 mt-2">
                ※現在はデモモードで動作しています。実際のAprilTag検出にはWASMモジュールが必要です。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
