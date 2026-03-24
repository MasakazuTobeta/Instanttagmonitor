import {
  DetectionCorner,
  DetectionJob,
  DetectionResult,
  TAG_FAMILIES,
  TagType,
} from '../types/detection';

const TAG_TYPES: TagType[] = ['AprilTag', 'AprilTag2', 'AprilTag3', 'ArUco'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function selectTagType(settings: DetectionJob['settings'], index: number, frame: number) {
  if (settings.tagType !== 'auto') {
    return settings.tagType;
  }

  return TAG_TYPES[(Math.floor(frame / 18) + index) % TAG_TYPES.length];
}

function selectFamily(
  tagType: TagType,
  settings: DetectionJob['settings'],
  index: number,
  frame: number,
) {
  if (settings.tagType !== 'auto' && settings.family !== 'auto') {
    return settings.family;
  }

  const families = TAG_FAMILIES[tagType];
  return families[(Math.floor(frame / 12) + index * 3) % families.length];
}

function createCorners(
  centerX: number,
  centerY: number,
  size: number,
  rotation: number,
): DetectionResult['corners'] {
  const half = size / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const offsets: DetectionCorner[] = [
    [-half, -half],
    [half, -half],
    [half, half],
    [-half, half],
  ];

  return offsets.map(([x, y]) => [
    centerX + x * cos - y * sin,
    centerY + x * sin + y * cos,
  ]) as DetectionResult['corners'];
}

function createId(tagType: TagType, family: string, index: number) {
  const seed = `${tagType}:${family}:${index}`;
  return seed.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 1000;
}

export function generateMockDetections({
  width,
  height,
  frame,
  settings,
}: DetectionJob): DetectionResult[] {
  const time = frame / 16;
  const count = frame % 90 < 56 ? 1 : 2;
  const minSize = Math.min(width, height);

  return Array.from({ length: count }, (_, index) => {
    const tagType = selectTagType(settings, index, frame);
    const family = selectFamily(tagType, settings, index, frame);
    const centerX = clamp(
      width * (0.5 + 0.18 * Math.sin(time + index * 1.4)),
      width * 0.22,
      width * 0.78,
    );
    const centerY = clamp(
      height * (0.48 + 0.16 * Math.cos(time * 0.82 + index * 1.15)),
      height * 0.24,
      height * 0.76,
    );
    const size = clamp(
      minSize * (0.18 + 0.03 * Math.sin(time * 1.35 + index)),
      72,
      132,
    );
    const rotation = Math.sin(time * 0.7 + index * 0.5) * 0.32;

    return {
      id: createId(tagType, family, index),
      tagType,
      family,
      corners: createCorners(centerX, centerY, size, rotation),
    };
  });
}
