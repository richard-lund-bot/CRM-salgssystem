// Genererer PNG-ikoner (uten avhengigheter) via en enkel PNG-encoder.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function png(size, draw) {
  const ch = 4, W = size, H = size;
  const buf = Buffer.alloc(W * H * ch);
  draw((x, y, r, g, b, a = 255) => {
    const i = (y * W + x) * ch;
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  });
  // raw with filter byte 0 per row
  const raw = Buffer.alloc(H * (W * ch + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (W * ch + 1)] = 0;
    buf.copy(raw, y * (W * ch + 1) + 1, y * W * ch, (y + 1) * W * ch);
  }
  const idat = deflateSync(raw);
  const crcTable = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(Buffer.concat([t, data])));
    return Buffer.concat([len, t, data, cr]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Enkelt motiv: mørk bakgrunn + grønn løftesymbol (manual/vektstang stilisert)
function draw(size, maskable) {
  return (set) => {
    const c = size / 2, pad = maskable ? size * 0.18 : size * 0.1;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      // bakgrunn
      let r = 15, g = 18, b = 22;
      // rundet hjørne kun for non-maskable
      set(x, y, r, g, b, 255);
      // hantel: horisontal stang med to vektskiver
      const midY = Math.abs(y - c) < size * 0.045;
      const barX = x > pad * 1.6 && x < size - pad * 1.6;
      const plateL = x > pad && x < pad + size * 0.16 && Math.abs(y - c) < size * 0.20;
      const plateR = x > size - pad - size * 0.16 && x < size - pad && Math.abs(y - c) < size * 0.20;
      if ((midY && barX) || plateL || plateR) set(x, y, 45, 212, 137, 255);
    }
  };
}

for (const [name, size, mask] of [['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable', 512, true]]) {
  writeFileSync(`icons/${name}.png`, png(size, draw(size, mask)));
  console.log('skrev icons/' + name + '.png');
}
