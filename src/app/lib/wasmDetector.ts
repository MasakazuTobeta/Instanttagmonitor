import {
  DetectionResult,
  DetectionSettings,
  DetectorBackend,
  TAG_FAMILIES,
  TagType,
} from '../types/detection';
import wasmUrl from '../wasm/contrastDetector.wasm?url';

interface WasmDetectorExports {
  memory: WebAssembly.Memory;
  getInputPointer(): number;
  getOutputPointer(): number;
  getOutputStride(): number;
  getMaxDetections(): number;
  detect(width: number, height: number, frame: number): number;
}

interface WasmDetector {
  backend: DetectorBackend;
  detect(
    grayscale: Uint8Array,
    width: number,
    height: number,
    frame: number,
    settings: DetectionSettings,
  ): DetectionResult[];
}

const TAG_TYPES: TagType[] = ['AprilTag', 'AprilTag2', 'AprilTag3', 'ArUco'];

function resolveTagType(settings: DetectionSettings, index: number, frame: number, seed: number): TagType {
  if (settings.tagType !== 'auto') {
    return settings.tagType;
  }

  return TAG_TYPES[(Math.floor(frame / 18) + index + seed) % TAG_TYPES.length];
}

function resolveFamily(
  settings: DetectionSettings,
  tagType: TagType,
  index: number,
  frame: number,
  seed: number,
) {
  if (settings.tagType !== 'auto' && settings.family !== 'auto') {
    return settings.family;
  }

  const families = TAG_FAMILIES[tagType];
  return families[(Math.floor(frame / 12) + seed + index * 3) % families.length];
}

async function instantiateWasm() {
  const response = await fetch(wasmUrl);

  if ('instantiateStreaming' in WebAssembly) {
    return WebAssembly.instantiateStreaming(response, {});
  }

  const bytes = await response.arrayBuffer();
  return WebAssembly.instantiate(bytes, {});
}

export async function createWasmDetector(): Promise<WasmDetector> {
  const result = await instantiateWasm();
  const wasm = result.instance.exports as unknown as WasmDetectorExports;
  const inputPointer = wasm.getInputPointer();
  const outputPointer = wasm.getOutputPointer();
  const outputStride = wasm.getOutputStride();
  const maxDetections = wasm.getMaxDetections();

  return {
    backend: 'wasm',
    detect(grayscale, width, height, frame, settings) {
      const inputView = new Uint8Array(wasm.memory.buffer, inputPointer, grayscale.length);
      inputView.set(grayscale);

      const count = Math.min(wasm.detect(width, height, frame), maxDetections);
      const outputView = new Int32Array(
        wasm.memory.buffer,
        outputPointer,
        outputStride * maxDetections,
      );

      const detections: DetectionResult[] = [];

      for (let index = 0; index < count; index += 1) {
        const offset = index * outputStride;
        const id = outputView[offset];
        const centerX = outputView[offset + 1];
        const centerY = outputView[offset + 2];
        const size = outputView[offset + 3];
        const seed = Math.abs(id) % 7;
        const tagType = resolveTagType(settings, index, frame, seed);
        const family = resolveFamily(settings, tagType, index, frame, seed);

        detections.push({
          id,
          tagType,
          family,
          corners: [
            [centerX - size / 2, centerY - size / 2],
            [centerX + size / 2, centerY - size / 2],
            [centerX + size / 2, centerY + size / 2],
            [centerX - size / 2, centerY + size / 2],
          ],
        });
      }

      return detections;
    },
  };
}
