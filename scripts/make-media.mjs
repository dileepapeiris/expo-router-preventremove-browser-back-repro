// Builds media/*.gif from the step screenshots (no ffmpeg needed) and a side-by-side
// before/after PNG of the final step. Usage: node scripts/make-media.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const read = (file) => PNG.sync.read(readFileSync(file));

function gif(frames, out, delay = 1600) {
  const encoder = GIFEncoder();
  for (const file of frames) {
    const { width, height, data } = read(file);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    encoder.writeFrame(index, width, height, { palette, delay });
  }
  encoder.finish();
  writeFileSync(out, encoder.bytes());
  console.log('wrote', out);
}

function sideBySide(left, right, out, gap = 16) {
  const a = read(left), b = read(right);
  const width = a.width + gap + b.width, height = Math.max(a.height, b.height);
  const png = new PNG({ width, height });
  png.data.fill(255);
  PNG.bitblt(a, png, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, png, 0, 0, b.width, b.height, a.width + gap, 0);
  writeFileSync(out, PNG.sync.write(png));
  console.log('wrote', out);
}

for (const label of ['before', 'after']) {
  const frames = [1, 2, 3].map((n) => `media/${label}-browser-back-${n}-${['page', 'left', 'forward'][n - 1]}.png`);
  if (frames.every(existsSync)) gif(frames, `media/${label}-browser-back.gif`);
}
if (existsSync('media/before-browser-back-3-forward.png') && existsSync('media/after-browser-back-3-forward.png')) {
  sideBySide('media/before-browser-back-3-forward.png', 'media/after-browser-back-3-forward.png', 'media/before-after-forward.png');
}
