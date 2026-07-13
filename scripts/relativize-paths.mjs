// Convert root-relative asset refs (/wp-content/…, /form-handler.js, …) to
// page-depth-relative refs (../../wp-content/…). Relative paths render correctly
// BOTH at a project GitHub Pages URL (github.io/<repo>/…) AND at the custom
// domain root — so the site works everywhere with no per-host config.
//
// Safe by construction: only rewrites a target path when it's immediately
// preceded by a URL delimiter (" ' ( , or whitespace), so already-relative
// paths like ../wp-content (preceded by "/") and escaped JSON (\/wp-content)
// are left untouched.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'site/topigsnorsvin.mx');
const TARGETS = 'wp-content|wp-includes|wp-json|tn-content|form-handler';
const RE = new RegExp(`(["'(,\\s])/(${TARGETS})`, 'g');

let files = 0, refs = 0;

function relativize(file) {
  const rel = path.relative(ROOT, file);
  const depth = rel.split(path.sep).length - 1; // dirs between file and root
  const prefix = depth > 0 ? '../'.repeat(depth) : '';
  const html = fs.readFileSync(file, 'utf8');
  let count = 0;
  const out = html.replace(RE, (_m, delim, target) => {
    count++;
    return delim + prefix + target;
  });
  if (count) {
    fs.writeFileSync(file, out);
    files++;
    refs += count;
  }
}

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.html?$/i.test(e.name)) relativize(full);
  }
}

walk(ROOT);
console.log(`Relativized ${refs} root-relative refs across ${files} files (root: ${ROOT}).`);
