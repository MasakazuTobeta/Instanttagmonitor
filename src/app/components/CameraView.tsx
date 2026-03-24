import { useEffect, useRef, useState } from 'react';
import { generateMockDetections } from '../lib/mockDetection';
import {
  CameraStatus,
  DetectionResult,
  DetectionSettings,
  DetectionWorkerRequest,
  DetectionWorkerResponse,
} from '../types/detection';

interface CameraViewProps {
  isDetecting: boolean;
  settings: DetectionSettings;
  onDetectionUpdate: (results: DetectionResult[]) => void;
  onCameraStateChange: (status: CameraStatus, message?: string) => void;
}

const DETECTION_FRAME_SKIP = 3;

export function CameraView({
  isDetecting,
  settings,
  onDetectionUpdate,
  onCameraStateChange,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const workerBusyRef = useRef(false);
  const frameRef = useRef(0);
  const isDetectingRef = useRef(isDetecting);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isDetectingRef.current = isDetecting;
  }, [isDetecting]);

  useEffect(() => {
    setupWorker();
    startCamera();

    return () => {
      stopDetection();
      stopCamera();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isDetecting && cameraStatus === 'ready') {
      startDetection();
      return;
    }

    stopDetection();
  }, [cameraStatus, isDetecting, settings]);

  const updateCameraState = (status: CameraStatus, message?: string) => {
    setCameraStatus(status);
    setError(status === 'ready' ? null : message ?? null);
    onCameraStateChange(status, message);
  };

  const setupWorker = () => {
    if (typeof Worker === 'undefined') {
      return;
    }

    try {
      const worker = new Worker(new URL('../workers/mockDetectorWorker.ts', import.meta.url), {
        type: 'module',
      });

      worker.onmessage = (event: MessageEvent<DetectionWorkerResponse>) => {
        workerBusyRef.current = false;

        if (!isDetectingRef.current) {
          return;
        }

        drawDetections(event.data.detections);
        onDetectionUpdate(event.data.detections);
      };

      worker.onerror = () => {
        workerBusyRef.current = false;
        workerRef.current?.terminate();
        workerRef.current = null;
      };

      workerRef.current = worker;
    } catch (workerError) {
      console.warn('Mock detector worker could not be initialized.', workerError);
      workerRef.current = null;
    }
  };

  const ensureVideoMetadata = async (video: HTMLVideoElement) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      return;
    }

    await new Promise<void>(resolve => {
      const handleLoadedMetadata = () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        resolve();
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    });
  };

  const startCamera = async () => {
    stopCamera();
    updateCameraState('requesting');

    if (!window.isSecureContext) {
      updateCameraState('unsupported', 'カメラは HTTPS または localhost でのみ利用できます。');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      updateCameraState('unsupported', 'このブラウザではカメラ API が利用できません。');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        streamRef.current = stream;
        await video.play();
        await ensureVideoMetadata(video);
        resizeCanvas();
      }

      updateCameraState('ready');
    } catch (err) {
      console.error('Camera access error:', err);
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'カメラへのアクセスが拒否されました。ブラウザ設定で許可してください。'
          : 'カメラを起動できませんでした。ページを再読み込みして再試行してください。';
      updateCameraState('error', message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startDetection = () => {
    stopDetection();
    frameRef.current = 0;

    const detectFrame = () => {
      if (!videoRef.current || !isDetectingRef.current) {
        return;
      }

      const video = videoRef.current;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      resizeCanvas();
      frameRef.current += 1;

      if (!workerBusyRef.current && frameRef.current % DETECTION_FRAME_SKIP === 0) {
        const request: DetectionWorkerRequest = {
          type: 'detect',
          width: video.videoWidth || 640,
          height: video.videoHeight || 480,
          frame: frameRef.current,
          settings,
        };

        workerBusyRef.current = true;

        if (workerRef.current) {
          workerRef.current.postMessage(request);
        } else {
          const detections = generateMockDetections(request);
          drawDetections(detections);
          onDetectionUpdate(detections);
          workerBusyRef.current = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const stopDetection = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    workerBusyRef.current = false;
    clearCanvas();
    onDetectionUpdate([]);
  };

  const resizeCanvas = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const width = videoRef.current.videoWidth || 640;
    const height = videoRef.current.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  const clearCanvas = () => {
    if (!canvasRef.current) {
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const drawDetections = (detections: DetectionResult[]) => {
    if (!canvasRef.current) {
      return;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) {
      return;
    }

    clearCanvas();

    detections.forEach(detection => {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      detection.corners.forEach((corner, index) => {
        if (index === 0) {
          ctx.moveTo(corner[0], corner[1]);
        } else {
          ctx.lineTo(corner[0], corner[1]);
        }
      });
      ctx.closePath();
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      detection.corners.forEach(corner => {
        ctx.beginPath();
        ctx.arc(corner[0], corner[1], 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      const anchorX = detection.corners[0][0];
      const anchorY = detection.corners[0][1] - 52;

      ctx.fillStyle = 'rgba(3, 7, 18, 0.82)';
      ctx.fillRect(anchorX - 4, anchorY, 156, 48);

      ctx.fillStyle = '#00ff00';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`ID ${detection.id}`, anchorX + 8, anchorY + 8);

      ctx.fillStyle = '#bbf7d0';
      ctx.font = '12px sans-serif';
      ctx.fillText(
        `${detection.tagType ?? 'Unknown'} / ${detection.family ?? 'auto'}`,
        anchorX + 8,
        anchorY + 26,
      );
    });
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute bottom-36 left-4 z-10 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur">
        Demo detector / Worker-ready pipeline
      </div>
      {cameraStatus === 'requesting' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-white/10 bg-black/60 px-5 py-4 text-sm text-white">
            カメラを初期化しています...
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-2xl border border-red-400/30 bg-red-950/60 p-6 text-center text-white shadow-2xl">
            <p className="text-base font-semibold">カメラを利用できません</p>
            <p className="mt-3 text-sm leading-6 text-red-100">{error}</p>
            <button
              onClick={startCamera}
              className="mt-5 rounded-full bg-white px-5 py-2 text-sm font-semibold text-red-950 transition hover:bg-red-100"
            >
              再試行
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
