const MAX_PIXELS: i32 = 1280 * 720;
const MAX_DETECTIONS: i32 = 2;
const OUTPUT_STRIDE: i32 = 6;

const inputBuffer = new Uint8Array(MAX_PIXELS);
const outputBuffer = new Int32Array(MAX_DETECTIONS * OUTPUT_STRIDE);

function absI32(value: i32): i32 {
  return value < 0 ? -value : value;
}

function maxI32(a: i32, b: i32): i32 {
  return a > b ? a : b;
}

function minI32(a: i32, b: i32): i32 {
  return a < b ? a : b;
}

export function getInputPointer(): usize {
  return inputBuffer.dataStart;
}

export function getOutputPointer(): usize {
  return outputBuffer.dataStart;
}

export function getOutputStride(): i32 {
  return OUTPUT_STRIDE;
}

export function getMaxDetections(): i32 {
  return MAX_DETECTIONS;
}

export function detect(width: i32, height: i32, frame: i32): i32 {
  if (width <= 0 || height <= 0 || width * height > MAX_PIXELS) {
    return 0;
  }

  const cols = width >= 1000 ? 12 : width >= 720 ? 10 : 8;
  const rows = height >= 720 ? 10 : height >= 540 ? 8 : 6;
  const cellW = maxI32(24, width / cols);
  const cellH = maxI32(24, height / rows);
  const stepX = maxI32(2, cellW / 6);
  const stepY = maxI32(2, cellH / 6);

  let bestScore1 = -1;
  let bestId1 = 0;
  let bestX1 = 0;
  let bestY1 = 0;
  let bestSize1 = 0;

  let bestScore2 = -1;
  let bestId2 = 0;
  let bestX2 = 0;
  let bestY2 = 0;
  let bestSize2 = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const xStart = col * cellW;
      const yStart = row * cellH;
      const xEnd = minI32(width, xStart + cellW);
      const yEnd = minI32(height, yStart + cellH);

      let sum = 0;
      let sampleCount = 0;
      let minValue = 255;
      let maxValue = 0;
      let edgeScore = 0;

      for (let y = yStart + stepY / 2; y < yEnd; y += stepY) {
        let previous = -1;

        for (let x = xStart + stepX / 2; x < xEnd; x += stepX) {
          const value = inputBuffer[y * width + x];
          sum += value;
          sampleCount += 1;
          minValue = minI32(minValue, value);
          maxValue = maxI32(maxValue, value);

          if (previous >= 0) {
            edgeScore += absI32(value - previous);
          }

          if (y - stepY >= yStart + stepY / 2) {
            const vertical = inputBuffer[(y - stepY) * width + x];
            edgeScore += absI32(value - vertical);
          }

          previous = value;
        }
      }

      if (sampleCount == 0) {
        continue;
      }

      const average = sum / sampleCount;
      const range = maxValue - minValue;
      const contrast = edgeScore / sampleCount;
      const balance = 255 - absI32(128 - average) * 2;
      const score = range * 5 + contrast * 3 + balance;

      if (score < 240) {
        continue;
      }

      const centerX = xStart + (xEnd - xStart) / 2;
      const centerY = yStart + (yEnd - yStart) / 2;
      const size = minI32(xEnd - xStart, yEnd - yStart);
      const detectionId = (average + range * 7 + contrast * 3 + frame + row * 31 + col * 17) % 1000;

      const nearBest1 = absI32(centerX - bestX1) < size && absI32(centerY - bestY1) < size;

      if (score > bestScore1) {
        bestScore2 = bestScore1;
        bestId2 = bestId1;
        bestX2 = bestX1;
        bestY2 = bestY1;
        bestSize2 = bestSize1;

        bestScore1 = score;
        bestId1 = detectionId;
        bestX1 = centerX;
        bestY1 = centerY;
        bestSize1 = size;
        continue;
      }

      if (!nearBest1 && score > bestScore2) {
        bestScore2 = score;
        bestId2 = detectionId;
        bestX2 = centerX;
        bestY2 = centerY;
        bestSize2 = size;
      }
    }
  }

  let count = 0;

  if (bestScore1 >= 0) {
    outputBuffer[0] = bestId1;
    outputBuffer[1] = bestX1;
    outputBuffer[2] = bestY1;
    outputBuffer[3] = bestSize1;
    outputBuffer[4] = bestScore1;
    outputBuffer[5] = 0;
    count += 1;
  }

  if (bestScore2 >= 0) {
    const offset = OUTPUT_STRIDE;
    outputBuffer[offset] = bestId2;
    outputBuffer[offset + 1] = bestX2;
    outputBuffer[offset + 2] = bestY2;
    outputBuffer[offset + 3] = bestSize2;
    outputBuffer[offset + 4] = bestScore2;
    outputBuffer[offset + 5] = 0;
    count += 1;
  }

  return count;
}
