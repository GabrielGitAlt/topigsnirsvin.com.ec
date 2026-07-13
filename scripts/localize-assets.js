'use strict';

/*
 * Makes the mirror fully self-contained:
 *   1. Scans all HTML/CSS/JS for absolute https://topigsnorsvin.mx asset URLs.
 *   2. Downloads any that are missing locally (they were only referenced from
 *      JS/JSON — e.g. the Element Pack slideshow hero images).
 *   3. Rewrites every https://topigsnorsvin.mx reference to a root-relative
 *      path so nothing depends on the live site and the copy works on any host.
 *
 * Usage:  node scripts/localize-assets.js [--download-only] [--rewrite-only]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const SITE = path.join(ROOT, 'site', 'topigsnorsvin.mx');
const ORIGIN = 'https://topigsnorsvin.mx';
const HOST_RE = /https?:\/\/topigsnorsvin\.mx/g;

const EXT = 'jpg|jpeg|png|gif|webp|svg|css|js|woff2?|ttf|eot|mp4|webm|ico|pdf';

// Normal absolute URLs: https://topigsnorsvin.mx/wp-content/.../file.jpg
const ASSET_URL_RE = new RegExp(
  `https:\\/\\/topigsnorsvin\\.mx\\/(?:wp-content|tn-content|wp-includes)\\/[^"'\\)\\s\\\\]+?\\.(?:${EXT})`,
  'gi'
);

// Escaped URLs inside JSON blobs: https:\/\/topigsnorsvin.mx\/wp-content\/...\/file.jpg
const ASSET_URL_RE_ESC = new RegExp(
  `https:\\\\\\/\\\\\\/topigsnorsvin\\.mx(?:\\\\\\/[A-Za-z0-9_\\-.]+)+\\.(?:${EXT})`,
  'gi'
);
const HOST_RE_ESC = /https:\\\/\\\/topigsnorsvin\.mx/g;

const TEXT_EXT = /\.(html?|css|js|xml|json)$/i;

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function collectAssetUrls(files) {
  const urls = new Set();
  for (const f of files) {
    if (!TEXT_EXT.test(f)) continue;
    const txt = fs.readFileSync(f, 'utf8');
    const matches = txt.match(ASSET_URL_RE);
    if (matches) for (const m of matches) urls.add(m);
    // Escaped JSON form -> normalise \/ to / so it downloads to the same path.
    const esc = txt.match(ASSET_URL_RE_ESC);
    if (esc) for (const m of esc) urls.add(m.replace(/\\\//g, '/'));
  }
  return [...urls];
}

function localPathFor(url) {
  const rel = url.slice(ORIGIN.length + 1); // strip "https://topigsnorsvin.mx/"
  return path.join(SITE, decodeURIComponent(rel.split('?')[0]));
}

function download(url, dest, redirects) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        },
        timeout: 30000,
      },
      (res) => {
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location &&
          (redirects || 0) < 5
        ) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          return resolve(download(next, dest, (redirects || 0) + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return resolve({ ok: false, code: res.statusCode });
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const tmp = dest + '.part';
        const out = fs.createWriteStream(tmp);
        res.pipe(out);
        out.on('finish', () => out.close(() => { fs.renameSync(tmp, dest); resolve({ ok: true }); }));
        out.on('error', (e) => resolve({ ok: false, error: e.message }));
      }
    );
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.on('error', (e) => resolve({ ok: false, error: e.message }));
  });
}

async function downloadMissing(urls) {
  const missing = urls.filter((u) => !fs.existsSync(localPathFor(u)));
  console.log(`asset URLs referenced: ${urls.length}, missing locally: ${missing.length}`);
  let ok = 0;
  let fail = 0;
  const CONC = 8;
  for (let i = 0; i < missing.length; i += CONC) {
    const batch = missing.slice(i, i + CONC);
    const results = await Promise.all(
      batch.map((u) => download(u, localPathFor(u)).then((r) => ({ u, r })))
    );
    for (const { u, r } of results) {
      if (r.ok) ok++;
      else { fail++; console.log(`  FAIL ${r.code || r.error}: ${u}`); }
    }
  }
  console.log(`downloaded: ${ok}, failed: ${fail}`);
  return { ok, fail };
}

function rewriteFiles(files) {
  let changed = 0;
  let refs = 0;
  for (const f of files) {
    if (!TEXT_EXT.test(f)) continue;
    const txt = fs.readFileSync(f, 'utf8');
    const count = (txt.match(HOST_RE) || []).length + (txt.match(HOST_RE_ESC) || []).length;
    if (!count) continue;
    // Escaped JSON form first: https:\/\/topigsnorsvin.mx\/foo -> \/foo
    let next = txt.replace(HOST_RE_ESC, '');
    // Root-relative: https://topigsnorsvin.mx/foo -> /foo ; bare origin -> /
    next = next.replace(HOST_RE, '');
    // Any now-empty attribute like href="" would break; restore to "/".
    next = next.replace(/(href|src|action)=(["'])(\2)/gi, '$1=$2/$2');
    fs.writeFileSync(f, next);
    changed++;
    refs += count;
  }
  console.log(`rewrote ${refs} references across ${changed} files -> root-relative`);
}

async function main() {
  const mode = process.argv.slice(2);
  const files = walk(SITE, []);
  const urls = collectAssetUrls(files);

  if (!mode.includes('--rewrite-only')) {
    await downloadMissing(urls);
  }
  if (!mode.includes('--download-only')) {
    rewriteFiles(files);
  }
  console.log('done.');
}

main();
