import { generateMockDetections } from '../lib/mockDetection';
import { DetectionWorkerRequest, DetectionWorkerResponse } from '../types/detection';

self.onmessage = (event: MessageEvent<DetectionWorkerRequest>) => {
  if (event.data.type !== 'detect') {
    return;
  }

  const detections = generateMockDetections(event.data);
  const response: DetectionWorkerResponse = {
    type: 'result',
    frame: event.data.frame,
    detections,
  };

  self.postMessage(response);
};
