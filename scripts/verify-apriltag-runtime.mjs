import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inflateSync } from 'node:zlib';

const FAMILY_MASKS = {
  tag36h11: 1 << 0,
  tag25h9: 1 << 1,
  tag16h5: 1 << 2,
  tagCircle21h7: 1 << 3,
  tagCircle49h12: 1 << 4,
  tagStandard41h12: 1 << 5,
  tagStandard52h13: 1 << 6,
};

const ALL_FAMILY_MASK = Object.values(FAMILY_MASKS).reduce((mask, value) => mask | value, 0);

const TEST_CASES = [
  {
    family: 'tag36h11',
    mask: FAMILY_MASKS.tag36h11,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tag36h11/tag36_11_00000.png',
  },
  {
    family: 'tag25h9',
    mask: FAMILY_MASKS.tag25h9,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tag25h9/tag25_09_00000.png',
  },
  {
    family: 'tag16h5',
    mask: FAMILY_MASKS.tag16h5,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tag16h5/tag16_05_00000.png',
  },
  {
    family: 'tagCircle21h7',
    mask: FAMILY_MASKS.tagCircle21h7,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tagCircle21h7/tag21_07_00000.png',
  },
  {
    family: 'tagCircle49h12',
    mask: FAMILY_MASKS.tagCircle49h12,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tagCircle49h12/tag49_12_00000.png',
  },
  {
    family: 'tagStandard41h12',
    mask: FAMILY_MASKS.tagStandard41h12,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tagStandard41h12/tag41_12_00000.png',
  },
  {
    family: 'tagStandard52h13',
    mask: FAMILY_MASKS.tagStandard52h13,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tagStandard52h13/tag52_13_00000.png',
  },
  {
    family: 'tagStandard52h13',
    mask: ALL_FAMILY_MASK,
    imageUrl: 'https://raw.githubusercontent.com/AprilRobotics/apriltag-imgs/master/tagStandard52h13/tag52_13_00000.png',
  },
];

function paethPredictor(a, b, c) {
  const predictor = a + b - c;
  const pa = Math.abs(predictor - a);
  const pb = Math.abs(predictor - b);
  const pc = Math.abs(predictor - c);

  if (pa <= pb && pa <= pc) {
    return a;
  }

  if (pb <= pc) {
    return b;
  }

  return c;
}

function decodePng(buffer) {
  const signature = buffer.subarray(0, 8);
  const expectedSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  if (!signature.equals(expectedSignature)) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;

    const type = buffer.toString('ascii', offset, offset + 4);
    offset += 4;

    const data = buffer.subarray(offset, offset + length);
    offset += length + 4;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
  }

  const compressed = Buffer.concat(idatChunks);
  const inflated = inflateSync(compressed);
  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const pixels = Buffer.alloc(width * height * bytesPerPixel);
  let inputOffset = 0;
  let outputOffset = 0;
  let previousRow = Buffer.alloc(stride);

  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[inputOffset++];

    for (let column = 0; column < stride; column += 1) {
      const raw = inflated[inputOffset++];
      const left = column >= bytesPerPixel ? pixels[outputOffset + column - bytesPerPixel] : 0;
      const up = previousRow[column];
      const upLeft = column >= bytesPerPixel ? previousRow[column - bytesPerPixel] : 0;
      let value = raw;

      if (filterType === 1) {
        value = (raw + left) & 0xff;
      } else if (filterType === 2) {
        value = (raw + up) & 0xff;
      } else if (filterType === 3) {
        value = (raw + Math.floor((left + up) / 2)) & 0xff;
      } else if (filterType === 4) {
        value = (raw + paethPredictor(left, up, upLeft)) & 0xff;
      }

      pixels[outputOffset + column] = value;
    }

    previousRow = pixels.subarray(outputOffset, outputOffset + stride);
    outputOffset += stride;
  }

  return { width, height, pixels };
}

function scaleToGrayscale(decoded, scale, margin) {
  const width = decoded.width * scale + margin * 2;
  const height = decoded.height * scale + margin * 2;
  const grayscale = new Uint8Array(width * height);
  grayscale.fill(255);

  for (let y = 0; y < decoded.height; y += 1) {
    for (let x = 0; x < decoded.width; x += 1) {
      const offset = (y * decoded.width + x) * 4;
      const red = decoded.pixels[offset];
      const green = decoded.pixels[offset + 1];
      const blue = decoded.pixels[offset + 2];
      const alpha = decoded.pixels[offset + 3] / 255;
      const gray = Math.round(((red * 77 + green * 150 + blue * 29) >> 8) * alpha + 255 * (1 - alpha));

      for (let dy = 0; dy < scale; dy += 1) {
        const rowOffset = (margin + y * scale + dy) * width;
        for (let dx = 0; dx < scale; dx += 1) {
          grayscale[rowOffset + margin + x * scale + dx] = gray;
        }
      }
    }
  }

  return { width, height, grayscale };
}

function parseDetections(Module, detectRaw) {
  const resultPointer = detectRaw();
  const jsonLength = Module.getValue(resultPointer, 'i32');
  const jsonPointer = Module.getValue(resultPointer + 4, 'i32');
  const jsonView = new Uint8Array(Module.HEAPU8.buffer, jsonPointer, jsonLength);
  return jsonLength ? JSON.parse(new TextDecoder().decode(jsonView)) : [];
}

async function main() {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'apriltag-runtime-'));
  const wasmModulePath = path.join(tempDir, 'apriltag_wasm.cjs');
  const wasmSourcePath = path.resolve('public/vendor/apriltag/apriltag_wasm.js');
  const wasmAssetDir = path.resolve('public/vendor/apriltag');

  copyFileSync(wasmSourcePath, wasmModulePath);

  try {
    const require = createRequire(import.meta.url);
    const originalFetch = globalThis.fetch;
    let Module;

    try {
      globalThis.fetch = undefined;
      const AprilTagWasm = require(wasmModulePath);
      Module = await AprilTagWasm({
        locateFile(file) {
          return path.join(wasmAssetDir, file);
        },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    const init = Module.cwrap('atagjs_init', 'number', []);
    const setDetectorOptions = Module.cwrap(
      'atagjs_set_detector_options',
      'number',
      ['number', 'number', 'number', 'number', 'number', 'number', 'number'],
    );
    const setDetectorFamilies = Module.cwrap('atagjs_set_detector_families', 'number', ['number']);
    const setImageBuffer = Module.cwrap('atagjs_set_img_buffer', 'number', ['number', 'number', 'number']);
    const detectRaw = Module.cwrap('atagjs_detect', 'number', []);

    init();
    setDetectorOptions(1.0, 0.0, 1, 1, 0, 0, 0);

    const results = [];

    for (const testCase of TEST_CASES) {
      const response = await fetch(testCase.imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch verification tag image: ${response.status}`);
      }

      setDetectorFamilies(testCase.mask);

      const png = Buffer.from(await response.arrayBuffer());
      const decoded = decodePng(png);
      const scaled = scaleToGrayscale(decoded, 64, 96);
      const imagePointer = setImageBuffer(scaled.width, scaled.height, scaled.width);
      Module.HEAPU8.set(scaled.grayscale, imagePointer);

      const detections = parseDetections(Module, detectRaw);
      const matchedDetection = detections.find(detection => detection.family === testCase.family);

      if (!matchedDetection) {
        throw new Error(`No ${testCase.family} detection was returned.`);
      }

      if (matchedDetection.id !== 0) {
        throw new Error(`Expected tag id 0 for ${testCase.family} but received ${matchedDetection.id}.`);
      }

      results.push({
        family: testCase.family,
        mask: testCase.mask,
        id: matchedDetection.id,
      });
    }

    console.log(JSON.stringify({ results }, null, 2));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
