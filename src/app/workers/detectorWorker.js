const SUPPORTED_FAMILY = 'tag36h11';
const DETECTOR_BASE_URL = new URL('../vendor/apriltag/', self.location.href);
const DETECTOR_SCRIPT_URL = new URL('apriltag_wasm.js', DETECTOR_BASE_URL).toString();
const textDecoder = new TextDecoder();

let detectorPromise = null;
let detectorUnavailable = false;
let currentProfile = '';

function selectionSupported(settings) {
  if (settings.tagType === 'ArUco') {
    return false;
  }

  return settings.family === 'auto' || settings.family === SUPPORTED_FAMILY;
}

function resolveTagType(settings) {
  if (settings.tagType === 'auto') {
    return 'AprilTag3';
  }

  return settings.tagType;
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
    8,
    0,
    0,
  );
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
    family: SUPPORTED_FAMILY,
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
