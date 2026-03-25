const DETECTOR_BASE_URL = new URL('../vendor/apriltag/', self.location.href);
const DETECTOR_SCRIPT_URL = new URL('apriltag_wasm.js', DETECTOR_BASE_URL).toString();
const textDecoder = new TextDecoder();
const REALTIME_DETECTOR_FAMILIES = [
  'tag36h11',
  'tag25h9',
  'tag16h5',
  'tagCircle21h7',
  'tagCircle49h12',
  'tagStandard41h12',
  'tagStandard52h13',
];
const REALTIME_DETECTOR_FAMILY_MASKS = {
  tag36h11: 1 << 0,
  tag25h9: 1 << 1,
  tag16h5: 1 << 2,
  tagCircle21h7: 1 << 3,
  tagCircle49h12: 1 << 4,
  tagStandard41h12: 1 << 5,
  tagStandard52h13: 1 << 6,
};
const APRILTAG_V2_FAMILIES = ['tag36h11', 'tag25h9', 'tag16h5'];

let detectorPromise = null;
let detectorUnavailable = false;
let currentProfile = '';
let currentFamilyMask = 0;

function getSelectedFamilies(settings) {
  if (settings.tagType === 'ArUco') {
    return [];
  }

  if (settings.family !== 'auto') {
    return settings.family in REALTIME_DETECTOR_FAMILY_MASKS ? [settings.family] : [];
  }

  if (settings.tagType === 'AprilTag2' || settings.tagType === 'AprilTag3') {
    return APRILTAG_V2_FAMILIES;
  }

  return REALTIME_DETECTOR_FAMILIES;
}

function getFamilyMask(settings) {
  return getSelectedFamilies(settings).reduce(
    (mask, family) => mask | REALTIME_DETECTOR_FAMILY_MASKS[family],
    0,
  );
}

function selectionSupported(settings) {
  return getFamilyMask(settings) !== 0;
}

function resolveTagType(settings) {
  return settings.tagType === 'auto' ? 'AprilTag' : settings.tagType;
}

function getDetectorOptions(settings) {
  switch (settings.performanceProfile) {
    case 'battery':
      return {
        quad_decimate: 2.5,
        quad_sigma: 0.0,
      };
    case 'precision':
      return {
        quad_decimate: 1.0,
        quad_sigma: 0.0,
      };
    case 'balanced':
    default:
      return {
        quad_decimate: 2.0,
        quad_sigma: 0.0,
      };
  }
}

async function loadDetector() {
  if (detectorUnavailable) {
    return null;
  }

  if (!detectorPromise) {
    detectorPromise = (async () => {
      importScripts(DETECTOR_SCRIPT_URL);

      if (typeof AprilTagWasm !== 'function') {
        throw new Error('AprilTagWasm global was not loaded');
      }

      const module = await AprilTagWasm({
        locateFile(path) {
          return new URL(path, DETECTOR_BASE_URL).toString();
        },
      });

      const detector = {
        module,
        init: module.cwrap('atagjs_init', 'number', []),
        setDetectorOptions: module.cwrap(
          'atagjs_set_detector_options',
          'number',
          ['number', 'number', 'number', 'number', 'number', 'number', 'number'],
        ),
        setDetectorFamilies: module.cwrap('atagjs_set_detector_families', 'number', ['number']),
        setImageBuffer: module.cwrap('atagjs_set_img_buffer', 'number', ['number', 'number', 'number']),
        detectRaw: module.cwrap('atagjs_detect', 'number', []),
      };

      detector.init();
      return detector;
    })().catch(error => {
      detectorUnavailable = true;
      console.error('AprilTag detector initialization failed.', error);
      return null;
    });
  }

  return detectorPromise;
}

function applyDetectorOptions(detector, settings) {
  const profile = settings.performanceProfile;
  if (profile === currentProfile) {
    return;
  }

  currentProfile = profile;
  const options = getDetectorOptions(settings);
  detector.setDetectorOptions(
    options.quad_decimate,
    options.quad_sigma,
    1,
    1,
    0,
    0,
    0,
  );
}

function applyFamilySelection(detector, settings) {
  const familyMask = getFamilyMask(settings);
  if (familyMask === currentFamilyMask) {
    return;
  }

  currentFamilyMask = familyMask;
  detector.setDetectorFamilies(familyMask);
}

function parseDetections(detector, grayscale, width, height, settings) {
  const bufferPointer = detector.setImageBuffer(width, height, width);
  detector.module.HEAPU8.set(grayscale, bufferPointer);

  const resultPointer = detector.detectRaw();
  const jsonLength = detector.module.getValue(resultPointer, 'i32');

  if (!jsonLength) {
    return [];
  }

  const jsonPointer = detector.module.getValue(resultPointer + 4, 'i32');
  const jsonView = new Uint8Array(detector.module.HEAPU8.buffer, jsonPointer, jsonLength);
  const detections = JSON.parse(textDecoder.decode(jsonView));

  return detections.map(detection => ({
    id: detection.id,
    tagType: resolveTagType(settings),
    family: detection.family,
    corners: detection.corners.map(corner => [corner.x, corner.y]),
  }));
}

self.onmessage = async event => {
  if (event.data.type !== 'detect') {
    return;
  }

  if (!selectionSupported(event.data.settings)) {
    self.postMessage({
      type: 'result',
      frame: event.data.frame,
      detections: [],
      backend: 'unavailable',
    });
    return;
  }

  try {
    const detector = await loadDetector();

    if (!detector) {
      self.postMessage({
        type: 'result',
        frame: event.data.frame,
        detections: [],
        backend: 'unavailable',
      });
      return;
    }

    applyDetectorOptions(detector, event.data.settings);
    applyFamilySelection(detector, event.data.settings);
    const grayscale = new Uint8Array(event.data.grayscale);
    const detections = parseDetections(
      detector,
      grayscale,
      event.data.width,
      event.data.height,
      event.data.settings,
    );

    self.postMessage({
      type: 'result',
      frame: event.data.frame,
      detections,
      backend: 'wasm',
    });
  } catch (error) {
    console.error('AprilTag detection failed.', error);
    self.postMessage({
      type: 'result',
      frame: event.data.frame,
      detections: [],
      backend: 'unavailable',
    });
  }
};
