import { useState } from 'react';
import { CameraView } from './components/CameraView';
import { DetectionInfo } from './components/DetectionInfo';
import { ControlPanel } from './components/ControlPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { DetectionResult, DetectionSettings } from './types/detection';

export default function App() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [settings, setSettings] = useState<DetectionSettings>({
    tagType: 'auto',
    family: 'auto'
  });

  const handleToggleDetection = () => {
    setIsDetecting(prev => !prev);
  };

  const handleDetectionUpdate = (results: DetectionResult[]) => {
    setDetections(results);
  };

  const handleSettingsChange = (newSettings: DetectionSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="size-full flex items-center justify-center bg-gray-900 overflow-hidden">
      <div className="relative w-full h-full max-w-4xl">
        <CameraView 
          isDetecting={isDetecting}
          settings={settings}
          onDetectionUpdate={handleDetectionUpdate}
        />
        <DetectionInfo 
          detections={detections}
          isDetecting={isDetecting}
        />
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
        <ControlPanel 
          isDetecting={isDetecting}
          onToggleDetection={handleToggleDetection}
        />
      </div>
    </div>
  );
}