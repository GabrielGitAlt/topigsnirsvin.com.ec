// Recompress the mirror's images in place — same filenames, same URLs, so the
// pages look identical but weigh far less. JPEG at high quality (visually
// lossless), PNG lossless, and only downscale images larger than the largest
// size the site ever displays (2560px, WordPress's "scaled" cap).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TARGET = process.argv[2] || path.join(process.cwd(), '..', 'site', 'topigsnorsvin.mx');
const MAXW = 2560;
const JPG_Q = 84;

let before = 0, after = 0, count = 0, resized = 0, kept = 0, failed = 0;

async function optimize(file) {
  const isPng = /\.png$/i.test(file);
  try {
    const orig = fs.statSync(file).size;
    const input = sharp(file, { failOn: 'none' });
    const md = await input.metadata();
    let pipe = input;
    let didResize = false;
    if (md.width && md.width > MAXW) { pipe = pipe.resize({ width: MAXW, withoutEnlargement: true }); didResize = true; }
    pipe = isPng
      ? pipe.png({ compressionLevel: 9, effort: 10 })            // lossless
      : pipe.jpeg({ quality: JPG_Q, mozjpeg: true, progressive: true });
    const buf = await pipe.toBuffer();
    before += orig;
    if (buf.length < orig) { fs.writeFileSync(file, buf); after += buf.length; if (didResize) resized++; }
    else { after += orig; kept++; }
    count++;
    if (count % 40 === 0) process.stdout.write(`\r  ${count} imgs · saved ${((before - after) / 1048576).toFixed(1)} MB`);
  } catch {
    failed++;
  }
}

async function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full);
    else if (/\.(jpe?g|png)$/i.test(e.name)) await optimize(full);
  }
}

console.log(`Optimizing images under ${TARGET} ...`);
await walk(TARGET);
console.log(
  `\nDone. ${count} images.` +
  `\n  Before: ${(before / 1048576).toFixed(1)} MB` +
  `\n  After:  ${(after / 1048576).toFixed(1)} MB  (saved ${((before - after) / 1048576).toFixed(1)} MB, ${(100 * (before - after) / before).toFixed(0)}%)` +
  `\n  Downscaled: ${resized}, already-optimal kept: ${kept}, failed: ${failed}`
);
