import { generateMockDetections } from '../lib/mockDetection';
import { createWasmDetector } from '../lib/wasmDetector';
import { DetectionWorkerRequest, DetectionWorkerResponse } from '../types/detection';

let detectorPromise: ReturnType<typeof createWasmDetector> | null = null;
let wasmUnavailable = false;

function getDetector() {
  if (wasmUnavailable) {
    return null;
  }

  if (!detectorPromise) {
    detectorPromise = createWasmDetector().catch(error => {
      wasmUnavailable = true;
      console.warn('Falling back to JS detector because WASM initialization failed.', error);
      throw error;
    });
  }

  return detectorPromise;
}

self.onmessage = async (event: MessageEvent<DetectionWorkerRequest>) => {
  if (event.data.type !== 'detect') {
    return;
  }

  const grayscale = new Uint8Array(event.data.grayscale);

  try {
    const detector = getDetector();

    if (!detector) {
      throw new Error('WASM detector unavailable');
    }

    const instance = await detector;
    const detections = instance.detect(
      grayscale,
      event.data.width,
      event.data.height,
      event.data.frame,
      event.data.settings,
    );
    const response: DetectionWorkerResponse = {
      type: 'result',
      frame: event.data.frame,
      detections,
      backend: 'wasm',
    };

    self.postMessage(response);
  } catch (error) {
    console.warn('Using mock detector fallback.', error);

    const detections = generateMockDetections({
      width: event.data.width,
      height: event.data.height,
      frame: event.data.frame,
      settings: event.data.settings,
    });
    const response: DetectionWorkerResponse = {
      type: 'result',
      frame: event.data.frame,
      detections,
      backend: 'mock',
    };

    self.postMessage(response);
  }
};
