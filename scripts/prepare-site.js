'use strict';

/*
 * Post-processes the httrack mirror in ./site so it works as a standalone
 * copy for topigsnirsvin.com.ec:
 *   1. Injects our form handler (CSS + JS) into every page.
 *   2. Strips the parent company's third-party tracking / consent scripts
 *      (Google Tag Manager, GA, Facebook Pixel, Pardot, HubSpot, CookieFirst)
 *      so the copy doesn't send data to their analytics accounts.
 *   3. Removes the httrack signature comment.
 *
 * Safe to run multiple times (idempotent).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function findSiteRoot() {
  const siteDir = path.join(ROOT, 'site');
  const preferred = path.join(siteDir, 'topigsnorsvin.mx');
  if (fs.existsSync(preferred)) return preferred;
  if (fs.existsSync(path.join(siteDir, 'index.html'))) return siteDir;
  for (const entry of fs.readdirSync(siteDir, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(siteDir, entry.name, 'index.html'))) {
      return path.join(siteDir, entry.name);
    }
  }
  throw new Error('Could not locate mirrored site under ./site — run the mirror first.');
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.html?$/i.test(entry.name)) out.push(full);
  }
  return out;
}

// Signatures that mark a <script> (external or inline) as third-party tracking.
const TRACKER_SIGNATURES = [
  'googletagmanager.com',
  'google-analytics.com',
  '/gtag/js',
  'gtag(',
  'datalayer',
  'connect.facebook.net',
  'fbq(',
  'pi.pardot.com',
  'piaid',
  'picid',
  'pardot',
  'hsforms.net',
  'hsforms.com',
  'hs-scripts.com',
  'hs-analytics',
  'hubspot',
  'hbspt',
  'cookiefirst.com',
  'cookiefirst',
  '_linkedin',
  'snap.licdn.com',
];

const ASSET_VER = '2'; // bump to cache-bust the injected handler
const HEAD_INJECT = `<link rel="stylesheet" href="/form-handler.css?v=${ASSET_VER}">`;
const BODY_INJECT = `<script src="/form-handler.js?v=${ASSET_VER}"></script>`;

function stripTrackers(html) {
  let removed = 0;
  // Remove <script>...</script> blocks whose contents match a tracker signature.
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (tag) => {
    const lower = tag.toLowerCase();
    if (TRACKER_SIGNATURES.some((sig) => lower.indexOf(sig) !== -1)) {
      removed++;
      return '';
    }
    return tag;
  });
  // Remove <noscript> GTM/Facebook fallbacks (iframes / pixels).
  html = html.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, (tag) => {
    const lower = tag.toLowerCase();
    if (lower.indexOf('googletagmanager.com') !== -1 || lower.indexOf('facebook.com/tr') !== -1) {
      removed++;
      return '';
    }
    return tag;
  });
  return { html, removed };
}

function process(file) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;

  // Remove httrack signature comment.
  html = html.replace(/<!--\s*Mirrored from[\s\S]*?-->\s*/gi, '');
  html = html.replace(/<!--\s*Added by HTTrack[\s\S]*?-->\s*/gi, '');

  const stripResult = stripTrackers(html);
  html = stripResult.html;

  // Inject CSS once, before </head>.
  if (html.indexOf('/form-handler.css') === -1) {
    if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `  ${HEAD_INJECT}\n</head>`);
  }
  // Inject JS once, before </body>.
  if (html.indexOf('/form-handler.js') === -1) {
    if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, `  ${BODY_INJECT}\n</body>`);
    else html += `\n${BODY_INJECT}\n`;
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    return { changed: true, trackersRemoved: stripResult.removed };
  }
  return { changed: false, trackersRemoved: 0 };
}

function main() {
  const siteRoot = findSiteRoot();
  const files = walk(siteRoot, []);
  let changed = 0;
  let trackers = 0;
  for (const f of files) {
    const r = process(f);
    if (r.changed) changed++;
    trackers += r.trackersRemoved;
  }
  console.log(`prepare-site: processed ${files.length} HTML files`);
  console.log(`  injected form handler into pages, updated ${changed}`);
  console.log(`  removed ${trackers} third-party tracking/consent script blocks`);
  console.log(`  site root: ${siteRoot}`);
}

main();
