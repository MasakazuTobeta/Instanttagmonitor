import { useRef, useEffect, useState } from 'react';
import { DetectionResult, DetectionSettings, TagType, TAG_FAMILIES } from '../types/detection';

interface CameraViewProps {
  isDetecting: boolean;
  settings: DetectionSettings;
  onDetectionUpdate: (results: DetectionResult[]) => void;
}

export function CameraView({ isDetecting, settings, onDetectionUpdate }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isDetecting) {
      startDetection();
    } else {
      stopDetection();
    }
  }, [isDetecting]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }
      setError(null);
    } catch (err) {
      console.error('Camera access error:', err);
      setError('カメラへのアクセスが拒否されました。設定を確認してください。');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startDetection = () => {
    const detectFrame = () => {
      if (!videoRef.current || !canvasRef.current || !isDetecting) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Mock detection - simulate AprilTag detection
      // In production, this would call WASM detector
      const mockDetections = generateMockDetections(canvas.width, canvas.height);
      
      // Draw detection overlays
      drawDetections(ctx, mockDetections);
      
      // Update parent component
      onDetectionUpdate(mockDetections);

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    onDetectionUpdate([]);
  };

  const generateMockDetections = (width: number, height: number): DetectionResult[] => {
    // Simulate 1-2 random AprilTag detections
    const numTags = Math.random() > 0.3 ? 1 : 2;
    const results: DetectionResult[] = [];

    for (let i = 0; i < numTags; i++) {
      const centerX = width * (0.3 + Math.random() * 0.4);
      const centerY = height * (0.3 + Math.random() * 0.4);
      const size = 80 + Math.random() * 60;

      // Generate random tag type and family based on settings
      let tagType: string;
      let family: string;

      if (settings.tagType === 'auto') {
        // Random tag type
        const types: TagType[] = ['AprilTag', 'AprilTag2', 'AprilTag3', 'ArUco'];
        tagType = types[Math.floor(Math.random() * types.length)];
        const families = TAG_FAMILIES[tagType as TagType];
        family = families[Math.floor(Math.random() * families.length)];
      } else {
        tagType = settings.tagType;
        if (settings.family === 'auto') {
          const families = TAG_FAMILIES[settings.tagType as TagType];
          family = families[Math.floor(Math.random() * families.length)];
        } else {
          family = settings.family;
        }
      }

      results.push({
        id: Math.floor(Math.random() * 100),
        tagType,
        family,
        corners: [
          [centerX - size / 2, centerY - size / 2],
          [centerX + size / 2, centerY - size / 2],
          [centerX + size / 2, centerY + size / 2],
          [centerX - size / 2, centerY + size / 2]
        ]
      });
    }

    return results;
  };

  const drawDetections = (ctx: CanvasRenderingContext2D, detections: DetectionResult[]) => {
    detections.forEach(detection => {
      // Draw corners
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      detection.corners.forEach((corner, i) => {
        if (i === 0) {
          ctx.moveTo(corner[0], corner[1]);
        } else {
          ctx.lineTo(corner[0], corner[1]);
        }
      });
      ctx.closePath();
      ctx.stroke();

      // Draw corner dots
      ctx.fillStyle = '#00ff00';
      detection.corners.forEach(corner => {
        ctx.beginPath();
        ctx.arc(corner[0], corner[1], 5, 0, 2 * Math.PI);
        ctx.fill();
      });

      // Draw ID and type label
      const centerX = detection.corners.reduce((sum, c) => sum + c[0], 0) / 4;
      const centerY = detection.corners.reduce((sum, c) => sum + c[1], 0) / 4;
      
      // Background box
      const labelHeight = detection.tagType ? 50 : 30;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(centerX - 60, centerY - labelHeight / 2, 120, labelHeight);
      
      ctx.fillStyle = '#00ff00';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (detection.tagType) {
        ctx.fillText(`ID: ${detection.id}`, centerX, centerY - 10);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#88ff88';
        ctx.fillText(`${detection.tagType}`, centerX, centerY + 10);
      } else {
        ctx.fillText(`ID: ${detection.id}`, centerX, centerY);
      }
    });
  };

  if (error) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <div className="text-center p-6 bg-red-500/20 rounded-lg max-w-sm">
          <p className="text-white">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  );
}