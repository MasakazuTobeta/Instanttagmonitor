import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deflateSync } from 'node:zlib';

const outputDir = resolve('public/icons');

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([lengthBuffer, typeBuffer, data, crcBuffer]);
}

function setPixel(buffer, size, x, y, red, green, blue, alpha = 255) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const offset = (y * size + x) * 4;
  buffer[offset] = red;
  buffer[offset + 1] = green;
  buffer[offset + 2] = blue;
  buffer[offset + 3] = alpha;
}

function fillRect(buffer, size, x, y, width, height, color) {
  for (let currentY = y; currentY < y + height; currentY += 1) {
    for (let currentX = x; currentX < x + width; currentX += 1) {
      setPixel(buffer, size, currentX, currentY, color[0], color[1], color[2], color[3] ?? 255);
    }
  }
}

function fillRoundedRect(buffer, size, x, y, width, height, radius, color) {
  const radiusSquared = radius * radius;

  for (let currentY = y; currentY < y + height; currentY += 1) {
    for (let currentX = x; currentX < x + width; currentX += 1) {
      const localX = currentX - x;
      const localY = currentY - y;

      const inLeft = localX < radius;
      const inRight = localX >= width - radius;
      const inTop = localY < radius;
      const inBottom = localY >= height - radius;

      if ((inLeft || inRight) && (inTop || inBottom)) {
        const circleX = inLeft ? radius : width - radius - 1;
        const circleY = inTop ? radius : height - radius - 1;
        const dx = localX - circleX;
        const dy = localY - circleY;

        if (dx * dx + dy * dy > radiusSquared) {
          continue;
        }
      }

      setPixel(buffer, size, currentX, currentY, color[0], color[1], color[2], color[3] ?? 255);
    }
  }
}

function fillCircle(buffer, size, centerX, centerY, radius, color) {
  const radiusSquared = radius * radius;

  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      if (dx * dx + dy * dy <= radiusSquared) {
        setPixel(buffer, size, x, y, color[0], color[1], color[2], color[3] ?? 255);
      }
    }
  }
}

function drawBracket(buffer, size, x, y, length, thickness, horizontal, color) {
  if (horizontal) {
    fillRect(buffer, size, x, y, length, thickness, color);
  } else {
    fillRect(buffer, size, x, y, thickness, length, color);
  }
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const background = [8, 17, 13, 255];
  const tile = [15, 28, 22, 255];
  const glow = [18, 46, 34, 255];
  const accent = [74, 222, 128, 255];
  const accentSoft = [134, 239, 172, 255];

  fillRect(pixels, size, 0, 0, size, size, background);

  const tileInset = Math.round(size * 0.12);
  const tileSize = size - tileInset * 2;
  fillRoundedRect(
    pixels,
    size,
    tileInset,
    tileInset,
    tileSize,
    tileSize,
    Math.round(size * 0.18),
    tile,
  );

  fillCircle(
    pixels,
    size,
    Math.round(size * 0.5),
    Math.round(size * 0.44),
    Math.round(size * 0.16),
    glow,
  );

  const bracketInset = Math.round(size * 0.25);
  const bracketLength = Math.round(size * 0.14);
  const bracketThickness = Math.max(8, Math.round(size * 0.04));
  const rightEdge = size - bracketInset - bracketLength;
  const bottomEdge = size - bracketInset - bracketLength;

  drawBracket(pixels, size, bracketInset, bracketInset, bracketLength, bracketThickness, true, accent);
  drawBracket(pixels, size, bracketInset, bracketInset, bracketLength, bracketThickness, false, accent);

  drawBracket(pixels, size, rightEdge, bracketInset, bracketLength, bracketThickness, true, accent);
  drawBracket(pixels, size, rightEdge + bracketLength - bracketThickness, bracketInset, bracketLength, bracketThickness, false, accent);

  drawBracket(pixels, size, bracketInset, bottomEdge + bracketLength - bracketThickness, bracketLength, bracketThickness, true, accent);
  drawBracket(pixels, size, bracketInset, bottomEdge, bracketLength, bracketThickness, false, accent);

  drawBracket(pixels, size, rightEdge, bottomEdge + bracketLength - bracketThickness, bracketLength, bracketThickness, true, accent);
  drawBracket(pixels, size, rightEdge + bracketLength - bracketThickness, bottomEdge, bracketLength, bracketThickness, false, accent);

  fillCircle(
    pixels,
    size,
    Math.round(size * 0.5),
    Math.round(size * 0.5),
    Math.round(size * 0.055),
    accentSoft,
  );

  fillCircle(
    pixels,
    size,
    Math.round(size * 0.5),
    Math.round(size * 0.5),
    Math.round(size * 0.024),
    accent,
  );

  return pixels;
}

function encodePng(size, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawRows = [];
  for (let row = 0; row < size; row += 1) {
    rawRows.push(Buffer.from([0]));
    rawRows.push(rgbaBuffer.subarray(row * size * 4, (row + 1) * size * 4));
  }

  const idat = deflateSync(Buffer.concat(rawRows));
  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', idat),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

function writeIcon(size, fileName) {
  const pixels = createIcon(size);
  const png = encodePng(size, pixels);
  writeFileSync(resolve(outputDir, fileName), png);
}

mkdirSync(outputDir, { recursive: true });
writeIcon(192, 'icon-192.png');
writeIcon(512, 'icon-512.png');
writeIcon(180, 'apple-touch-icon.png');
