import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makePngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crc]);
}

function createPng(width, height, isMaskable = false) {
  const scanlines = [];
  const bgR = 12, bgG = 13, bgB = 16; // #0c0d10

  // Play triangle bounds
  // Center is (width/2, height/2)
  const cx = width / 2;
  const cy = height / 2;
  // Size of triangle
  const triScale = isMaskable ? width * 0.28 : width * 0.35;
  const x1 = cx - triScale * 0.55;
  const y1 = cy - triScale * 0.65;
  const x2 = cx + triScale * 0.65;
  const y2 = cy;
  const x3 = cx - triScale * 0.55;
  const y3 = cy + triScale * 0.65;

  // Corner radius for rounded container
  const cornerR = isMaskable ? 0 : width * 0.22;

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      let r = bgR, g = bgG, b = bgB, a = 255;

      // Rounded container check if not maskable
      if (!isMaskable && cornerR > 0) {
        let dx = 0, dy = 0;
        if (x < cornerR) dx = cornerR - x;
        else if (x > width - cornerR) dx = x - (width - cornerR);
        if (y < cornerR) dy = cornerR - y;
        else if (y > height - cornerR) dy = y - (height - cornerR);

        if (dx > 0 && dy > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > cornerR) {
            a = 0; // Transparent outer corner
          } else if (dist > cornerR - 1) {
            a = Math.floor(255 * (cornerR - dist));
          }
        }
      }

      // Check if point (x, y) is inside triangle
      if (a > 0) {
        const d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2);
        const d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y2);
        const d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);

        if (!(hasNeg && hasPos)) {
          // Inside play triangle! Gradient from pure white to #cbd5e1
          const factor = (y - y1) / (y3 - y1);
          r = Math.round(255 - factor * 35);
          g = Math.round(255 - factor * 30);
          b = Math.round(255 - factor * 25);
        }
      }

      const idx = 1 + x * 4;
      row[idx] = r;
      row[idx + 1] = g;
      row[idx + 2] = b;
      row[idx + 3] = a;
    }
    scanlines.push(row);
  }

  const rawData = Buffer.concat(scanlines);
  const compressed = zlib.deflateSync(rawData);

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const chunks = [
    sig,
    makePngChunk('IHDR', ihdr),
    makePngChunk('IDAT', compressed),
    makePngChunk('IEND', Buffer.alloc(0))
  ];

  return Buffer.concat(chunks);
}

const outDir = path.resolve('public');
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), createPng(192, 192, false));
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), createPng(512, 512, false));
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), createPng(180, 180, false));

console.log('Successfully generated PWA icons in /public!');
