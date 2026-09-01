async function crc32(bytes: Uint8Array): Promise<number> {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u32(value: number): Uint8Array {
  return new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

async function chunk(type: string, data: Uint8Array): Promise<Uint8Array> {
  const typeBytes = new TextEncoder().encode(type);
  const crcInput = new Uint8Array(typeBytes.length + data.length);
  crcInput.set(typeBytes);
  crcInput.set(data, typeBytes.length);
  const crc = u32(await crc32(crcInput));
  const out = new Uint8Array(4 + 4 + data.length + 4);
  out.set(u32(data.length), 0);
  out.set(typeBytes, 4);
  out.set(data, 8);
  out.set(crc, 8 + data.length);
  return out;
}

async function deflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new CompressionStream("deflate");
  const writer = stream.writable.getWriter();
  await writer.write(data);
  await writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

const PALETTE = [
  [28, 24, 22],
  [62, 48, 38],
  [120, 92, 64],
  [186, 164, 128],
  [90, 78, 68],
  [40, 36, 48],
  [72, 64, 52],
  [140, 118, 96],
  [32, 38, 34],
] as const;

export async function mockArtworkPng(seed: string): Promise<Uint8Array> {
  const width = 96;
  const height = 144;
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const color = PALETTE[hash % PALETTE.length] ?? PALETTE[0];
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const i = row + 1 + x * 3;
      const shade = ((x + y + hash) % 24) - 12;
      raw[i] = Math.max(0, Math.min(255, color[0] + shade));
      raw[i + 1] = Math.max(0, Math.min(255, color[1] + shade));
      raw[i + 2] = Math.max(0, Math.min(255, color[2] + shade));
    }
  }

  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = new Uint8Array(13);
  ihdr.set(u32(width), 0);
  ihdr.set(u32(height), 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const idat = await deflate(raw);
  const ihdrChunk = await chunk("IHDR", ihdr);
  const idatChunk = await chunk("IDAT", idat);
  const iendChunk = await chunk("IEND", new Uint8Array());
  const png = new Uint8Array(
    signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length,
  );
  png.set(signature, 0);
  png.set(ihdrChunk, signature.length);
  png.set(idatChunk, signature.length + ihdrChunk.length);
  png.set(iendChunk, signature.length + ihdrChunk.length + idatChunk.length);
  return png;
}
