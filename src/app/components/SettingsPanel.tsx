import { Settings, X } from 'lucide-react';
import { useState } from 'react';
import { DetectionSettings, TagType, TAG_FAMILIES } from '../types/detection';

interface SettingsPanelProps {
  settings: DetectionSettings;
  onSettingsChange: (settings: DetectionSettings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTagTypeChange = (tagType: TagType | 'auto') => {
    onSettingsChange({
      tagType,
      family: 'auto' // Reset family when tag type changes
    });
  };

  const handleFamilyChange = (family: string) => {
    onSettingsChange({
      ...settings,
      family
    });
  };

  const availableFamilies =
    settings.tagType === 'auto'
      ? []
      : TAG_FAMILIES[settings.tagType as TagType];

  return (
    <>
      {/* Settings Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute top-4 right-4 z-20 p-3 bg-black/70 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-colors"
        aria-label="設定"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Settings Modal */}
      {isOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">検出設定</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                aria-label="閉じる"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {/* Tag Type Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white">
                  タグの種類
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                    <input
                      type="radio"
                      name="tagType"
                      value="auto"
                      checked={settings.tagType === 'auto'}
                      onChange={() => handleTagTypeChange('auto')}
                      className="w-4 h-4 text-green-500"
                    />
                    <div>
                      <div className="text-white font-medium">自動判定</div>
                      <div className="text-xs text-gray-400">すべてのタグを自動的に検出</div>
                    </div>
                  </label>

                  {(['AprilTag', 'AprilTag2', 'AprilTag3', 'ArUco'] as const).map(
                    (type) => (
                      <label
                        key={type}
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors"
                      >
                        <input
                          type="radio"
                          name="tagType"
                          value={type}
                          checked={settings.tagType === type}
                          onChange={() => handleTagTypeChange(type)}
                          className="w-4 h-4 text-green-500"
                        />
                        <div className="text-white font-medium">{type}</div>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Family Selection */}
              {settings.tagType !== 'auto' && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white">
                    ファミリー
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                      <input
                        type="radio"
                        name="family"
                        value="auto"
                        checked={settings.family === 'auto'}
                        onChange={() => handleFamilyChange('auto')}
                        className="w-4 h-4 text-green-500"
                      />
                      <div>
                        <div className="text-white font-medium">自動判定</div>
                        <div className="text-xs text-gray-400">
                          すべてのファミリーを検出
                        </div>
                      </div>
                    </label>

                    {availableFamilies.map((family) => (
                      <label
                        key={family}
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors"
                      >
                        <input
                          type="radio"
                          name="family"
                          value={family}
                          checked={settings.family === family}
                          onChange={() => handleFamilyChange(family)}
                          className="w-4 h-4 text-green-500"
                        />
                        <div className="text-white font-mono text-sm">
                          {family}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>自動判定モード:</strong> すべての種類のタグを同時に検出します。特定のタグのみを検出したい場合は、種類とファミリーを指定してください。
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
