import { useState } from 'react';
import { CameraView } from './components/CameraView';
import { DetectionInfo } from './components/DetectionInfo';
import { ControlPanel } from './components/ControlPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { useInstallPrompt } from './lib/useInstallPrompt';
import {
  CameraStatus,
  DetectionResult,
  DetectionSettings,
  DetectorBackend,
} from './types/detection';

export default function App() {
  const installPrompt = useInstallPrompt();
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [detectorBackend, setDetectorBackend] = useState<DetectorBackend>('unavailable');
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [cameraMessage, setCameraMessage] = useState<string | undefined>();
  const [settings, setSettings] = useState<DetectionSettings>({
    families: 'all',
    performanceProfile: 'balanced',
  });

  const handleToggleDetection = () => {
    if (cameraStatus !== 'ready') {
      return;
    }

    setIsDetecting(prev => !prev);
  };

  const handleDetectionUpdate = (results: DetectionResult[], backend: DetectorBackend) => {
    setDetections(results);
    setDetectorBackend(backend);
  };

  const handleSettingsChange = (newSettings: DetectionSettings) => {
    setSettings(newSettings);
  };

  const handleCameraStateChange = (status: CameraStatus, message?: string) => {
    setCameraStatus(status);
    setCameraMessage(message);

    if (status === 'error' || status === 'unsupported') {
      setIsDetecting(false);
    }
  };

  return (
    <div className="size-full overflow-hidden bg-neutral-950">
      <div className="relative h-full w-full">
        <CameraView
          isDetecting={isDetecting}
          settings={settings}
          onDetectionUpdate={handleDetectionUpdate}
          onCameraStateChange={handleCameraStateChange}
        />
        <DetectionInfo
          detections={detections}
          isDetecting={isDetecting}
          cameraStatus={cameraStatus}
          cameraMessage={cameraMessage}
          detectorBackend={detectorBackend}
          settings={settings}
        />
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          installState={installPrompt}
        />
        <ControlPanel
          isDetecting={isDetecting}
          cameraStatus={cameraStatus}
          detections={detections}
          detectorBackend={detectorBackend}
          settings={settings}
          onToggleDetection={handleToggleDetection}
        />
      </div>
    </div>
  );
}
