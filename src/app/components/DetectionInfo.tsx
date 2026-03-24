import { DetectionResult } from '../types/detection';

interface DetectionInfoProps {
  detections: DetectionResult[];
  isDetecting: boolean;
}

export function DetectionInfo({ detections, isDetecting }: DetectionInfoProps) {
  return (
    <div className="absolute top-4 left-4 right-20 z-10">
      <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">AprilTag Detection</h2>
          <div className="flex items-center gap-2">
            {isDetecting && (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-400">検出中</span>
              </>
            )}
            {!isDetecting && (
              <span className="text-sm text-gray-400">停止中</span>
            )}
          </div>
        </div>
        
        {detections.length > 0 ? (
          <div className="space-y-2 mt-3">
            <p className="text-sm text-gray-300">検出数: {detections.length}</p>
            {detections.map((detection, index) => (
              <div key={index} className="bg-white/10 rounded p-2 text-sm space-y-1">
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
          <p className="text-sm text-gray-400 mt-2">タグをスキャン中...</p>
        ) : (
          <p className="text-sm text-gray-400 mt-2">検出を開始してください</p>
        )}
      </div>
    </div>
  );
}