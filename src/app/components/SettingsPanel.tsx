import { Settings, X } from 'lucide-react';
import { useState } from 'react';
import {
  DetectionSettings,
  PERFORMANCE_PROFILES,
  PerformanceProfile,
  REALTIME_DETECTOR_FAMILY,
  TAG_FAMILIES,
  TagType,
} from '../types/detection';

interface SettingsPanelProps {
  settings: DetectionSettings;
  onSettingsChange: (settings: DetectionSettings) => void;
}

export function SettingsPanel({ settings, onSettingsChange }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTagTypeChange = (tagType: TagType | 'auto') => {
    onSettingsChange({
      tagType,
      family: 'auto',
      performanceProfile: settings.performanceProfile,
    });
  };

  const handleFamilyChange = (family: string) => {
    onSettingsChange({
      ...settings,
      family,
    });
  };

  const handlePerformanceProfileChange = (performanceProfile: PerformanceProfile) => {
    onSettingsChange({
      ...settings,
      performanceProfile,
    });
  };

  const availableFamilies =
    settings.tagType === 'auto'
      ? []
      : TAG_FAMILIES[settings.tagType as TagType];

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-20 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/[0.68] text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        aria-label="設定"
      >
        <Settings className="w-6 h-6" />
      </button>

      {isOpen && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-lg bg-gray-900 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
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

            <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                現在の実検出は Worker 上の AprilTag WASM を使っています。いま実際に動くファミリーは <span className="font-mono">{REALTIME_DETECTOR_FAMILY}</span> のみで、ArUco と他ファミリーは未対応です。
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white">
                  タグの種類
                </label>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700">
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
                        className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700"
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

              {settings.tagType !== 'auto' && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white">
                    ファミリー
                  </label>
                  <div className="space-y-2">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700">
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
                        className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700"
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

              <div className="space-y-2">
                <label className="block text-sm font-bold text-white">
                  パフォーマンス
                </label>
                <div className="space-y-2">
                  {(Object.entries(PERFORMANCE_PROFILES) as [PerformanceProfile, typeof PERFORMANCE_PROFILES[PerformanceProfile]][]).map(
                    ([profile, config]) => (
                      <label
                        key={profile}
                        className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-800 p-3 transition-colors hover:bg-gray-700"
                      >
                        <input
                          type="radio"
                          name="performanceProfile"
                          value={profile}
                          checked={settings.performanceProfile === profile}
                          onChange={() => handlePerformanceProfileChange(profile)}
                          className="h-4 w-4 text-green-500"
                        />
                        <div>
                          <div className="text-white font-medium">{config.label}</div>
                          <div className="text-xs text-gray-400">{config.description}</div>
                        </div>
                      </label>
                    ),
                  )}
                </div>
              </div>

              <div className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <p className="text-sm text-blue-200">
                  <strong>自動判定モード:</strong> すべての種類のタグを同時に検出します。特定のタグのみを検出したい場合は、種類とファミリーを指定してください。
                </p>
              </div>
            </div>

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
