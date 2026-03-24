import { useState } from 'react';
import { CameraView } from './components/CameraView';
import { DetectionInfo } from './components/DetectionInfo';
import { ControlPanel } from './components/ControlPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { CameraStatus, DetectionResult, DetectionSettings } from './types/detection';

export default function App() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('requesting');
  const [cameraMessage, setCameraMessage] = useState<string | undefined>();
  const [settings, setSettings] = useState<DetectionSettings>({
    tagType: 'auto',
    family: 'auto',
  });

  const handleToggleDetection = () => {
    if (cameraStatus !== 'ready') {
      return;
    }

    setIsDetecting(prev => !prev);
  };

  const handleDetectionUpdate = (results: DetectionResult[]) => {
    setDetections(results);
  };

  const handleSettingsChange = (newSettings: DetectionSettings) => {
    setSettings(newSettings);
  };

  const handleCameraStateChange = (status: CameraStatus, message?: string) => {
    setCameraStatus(status);
    setCameraMessage(message);

    if (status !== 'ready') {
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
          settings={settings}
        />
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
        <ControlPanel
          isDetecting={isDetecting}
          cameraStatus={cameraStatus}
          onToggleDetection={handleToggleDetection}
        />
      </div>
    </div>
  );
}
