// Add loading="lazy" + decoding="async" to <img> tags that don't already have
// a loading attribute. Off-screen images then load only when scrolled to —
// large drop in initial page weight, zero change to how the page looks.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.argv[2] || path.join(process.cwd(), '..', 'site', 'topigsnorsvin.mx');
let files = 0, imgs = 0;

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.html?$/i.test(e.name)) processFile(full);
  }
}

function processFile(file) {
  let html = fs.readFileSync(file, 'utf8');
  let changed = 0;
  html = html.replace(/<img\b([^>]*)>/gi, (tag, attrs) => {
    if (/\bloading\s*=/.test(attrs)) return tag; // already set
    changed++;
    const extra = /\bdecoding\s*=/.test(attrs) ? '' : ' decoding="async"';
    return `<img loading="lazy"${extra}${attrs}>`;
  });
  if (changed) { fs.writeFileSync(file, html); files++; imgs += changed; }
}

walk(ROOT);
console.log(`Added lazy-loading to ${imgs} <img> tags across ${files} files.`);
