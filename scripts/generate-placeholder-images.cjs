'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.resolve(__dirname, '..', 'carrental-api', 'seed-assets', 'vehicles');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Minimal 5x7 bitmap font for rendering text onto raw RGB canvas
const FONT = {
  'A': [0x70,0x88,0x88,0xF8,0x88,0x88,0x88],
  'B': [0xF0,0x88,0x88,0xF0,0x88,0x88,0xF0],
  'C': [0x70,0x88,0x80,0x80,0x80,0x88,0x70],
  'D': [0xE0,0x90,0x88,0x88,0x88,0x90,0xE0],
  'E': [0xF8,0x80,0x80,0xF0,0x80,0x80,0xF8],
  'F': [0xF8,0x80,0x80,0xF0,0x80,0x80,0x80],
  'G': [0x70,0x88,0x80,0xB8,0x88,0x88,0x78],
  'H': [0x88,0x88,0x88,0xF8,0x88,0x88,0x88],
  'I': [0xF8,0x20,0x20,0x20,0x20,0x20,0xF8],
  'J': [0x38,0x10,0x10,0x10,0x10,0x90,0x60],
  'K': [0x88,0x90,0xA0,0xC0,0xA0,0x90,0x88],
  'L': [0x80,0x80,0x80,0x80,0x80,0x80,0xF8],
  'M': [0x88,0xD8,0xA8,0x88,0x88,0x88,0x88],
  'N': [0x88,0xC8,0xA8,0x98,0x88,0x88,0x88],
  'O': [0x70,0x88,0x88,0x88,0x88,0x88,0x70],
  'P': [0xF0,0x88,0x88,0xF0,0x80,0x80,0x80],
  'Q': [0x70,0x88,0x88,0x88,0xA8,0x90,0x68],
  'R': [0xF0,0x88,0x88,0xF0,0xA0,0x90,0x88],
  'S': [0x78,0x80,0x80,0x70,0x08,0x08,0xF0],
  'T': [0xF8,0x20,0x20,0x20,0x20,0x20,0x20],
  'U': [0x88,0x88,0x88,0x88,0x88,0x88,0x70],
  'V': [0x88,0x88,0x88,0x88,0x88,0x50,0x20],
  'W': [0x88,0x88,0x88,0x88,0xA8,0xD8,0x88],
  'X': [0x88,0x88,0x50,0x20,0x50,0x88,0x88],
  'Y': [0x88,0x88,0x50,0x20,0x20,0x20,0x20],
  'Z': [0xF8,0x08,0x10,0x20,0x40,0x80,0xF8],
  '0': [0x70,0x88,0x98,0xA8,0xC8,0x88,0x70],
  '1': [0x20,0x60,0x20,0x20,0x20,0x20,0x70],
  '2': [0x70,0x88,0x08,0x30,0x40,0x80,0xF8],
  '3': [0xF8,0x08,0x10,0x30,0x08,0x88,0x70],
  '4': [0x10,0x30,0x50,0x90,0xF8,0x10,0x10],
  '5': [0xF8,0x80,0xF0,0x08,0x08,0x88,0x70],
  '6': [0x30,0x40,0x80,0xF0,0x88,0x88,0x70],
  '7': [0xF8,0x08,0x10,0x20,0x40,0x40,0x40],
  '8': [0x70,0x88,0x88,0x70,0x88,0x88,0x70],
  '9': [0x70,0x88,0x88,0x78,0x08,0x10,0x60],
  '-': [0x00,0x00,0x00,0x70,0x00,0x00,0x00],
  ' ': [0x00,0x00,0x00,0x00,0x00,0x00,0x00],
  '.': [0x00,0x00,0x00,0x00,0x00,0x30,0x30]
};

function renderText(buf, width, height, text, startX, startY, scale, color) {
  let curX = startX;
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    const bitmap = FONT[char] || FONT[' '];
    for (let row = 0; row < 7; row++) {
      const bits = bitmap[row];
      for (let col = 0; col < 5; col++) {
        if ((bits & (0x80 >> col)) !== 0) {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = curX + col * scale + dx;
              const py = startY + row * scale + dy;
              if (px >= 0 && px < width && py >= 0 && py < height) {
                const idx = (py * width + px) * 3;
                buf[idx] = color[0];
                buf[idx + 1] = color[1];
                buf[idx + 2] = color[2];
              }
            }
          }
        }
      }
    }
    curX += 6 * scale;
  }
}

function makePng(width, height, bgR, bgG, bgB, title, subtitle) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const crcBuf = Buffer.alloc(4);
    const toCrc = Buffer.concat([typeBuf, data]);
    let c = 0xFFFFFFFF;
    for (let i = 0; i < toCrc.length; i++) {
      c ^= toCrc[i];
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcBuf.writeInt32BE(~c, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Raw pixel buffer (width * height * 3)
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      // Vignette / subtle gradient
      const factor = 1 - 0.25 * Math.hypot((x - width/2)/width, (y - height/2)/height);
      rgb[idx] = Math.round(bgR * factor);
      rgb[idx + 1] = Math.round(bgG * factor);
      rgb[idx + 2] = Math.round(bgB * factor);
    }
  }

  // Draw sleek card outline
  const pad = 24;
  for (let x = pad; x < width - pad; x++) {
    const topIdx = (pad * width + x) * 3;
    const botIdx = ((height - pad) * width + x) * 3;
    rgb[topIdx] = rgb[botIdx] = 255;
    rgb[topIdx+1] = rgb[botIdx+1] = 255;
    rgb[topIdx+2] = rgb[botIdx+2] = 255;
  }
  for (let y = pad; y < height - pad; y++) {
    const lIdx = (y * width + pad) * 3;
    const rIdx = (y * width + (width - pad)) * 3;
    rgb[lIdx] = rgb[rIdx] = 255;
    rgb[lIdx+1] = rgb[rIdx+1] = 255;
    rgb[lIdx+2] = rgb[rIdx+2] = 255;
  }

  // Render WanderWheels brand badge
  renderText(rgb, width, height, 'WANDERWHEELS FLEET', pad + 30, pad + 30, 2, [240, 240, 240]);
  
  // Render main vehicle title
  const titleX = pad + 30;
  const titleY = Math.round(height * 0.45);
  renderText(rgb, width, height, title, titleX, titleY, 5, [255, 255, 255]);

  // Render subtitle (Angle / View)
  renderText(rgb, width, height, subtitle, titleX, titleY + 50, 3, [200, 220, 240]);

  // Format into PNG scanlines
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    raw[pos++] = 0; // Filter 0
    const rowStart = y * width * 3;
    rgb.copy(raw, pos, rowStart, rowStart + width * 3);
    pos += width * 3;
  }

  const idatData = zlib.deflateSync(raw);
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const vehicles = [
  { name: 'bmw-5-series', title: 'BMW 5 SERIES', rgb: [28, 54, 84] },
  { name: 'audi-a4', title: 'AUDI A4', rgb: [45, 52, 68] },
  { name: 'mercedes-c-class', title: 'MERCEDES C-CLASS', rgb: [30, 30, 42] },
  { name: 'honda-city', title: 'HONDA CITY', rgb: [110, 28, 48] },
  { name: 'toyota-fortuner', title: 'TOYOTA FORTUNER', rgb: [28, 70, 52] },
  { name: 'hyundai-creta', title: 'HYUNDAI CRETA', rgb: [24, 76, 102] }
];

const angles = [
  { num: 1, label: 'EXTERIOR FRONT VIEW' },
  { num: 2, label: 'SIDE PROFILE VIEW' },
  { num: 3, label: 'REAR ANGLE VIEW' }
];

console.log('Generating license-clean placeholder images in:', outDir);
let count = 0;
for (const v of vehicles) {
  for (const a of angles) {
    const filename = `${v.name}-${a.num}.png`;
    const buf = makePng(800, 500, v.rgb[0], v.rgb[1], v.rgb[2], v.title, a.label);
    fs.writeFileSync(path.join(outDir, filename), buf);
    count++;
  }
}
console.log(`Successfully generated ${count} license-clean vehicle placeholder images.`);
