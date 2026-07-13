// Replace the Mexico branch's contact details with the Ecuador ones, and remove
// the homepage magazine section. Idempotent — safe to re-run (used by the news
// auto-sync so freshly-pulled pages get Ecuadorized too).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'site/topigsnorsvin.mx');

// Mexico -> Ecuador. Order matters (company+address-start first).
const REPL = [
  ['Topigs Norsvin<br />Blvd. Anacleto González Flores # 945-1', 'Topswine Cia. Ltda.<br />24 de Mayo OE1-241 y José Borja'],
  ['Blvd. Anacleto González Flores # 945-1', '24 de Mayo OE1-241 y José Borja'],
  ['Colonia Centro C.P. 47600', 'Puembo'],
  ['Tepatitlán de Morelos, Jalisco', 'Quito, Ecuador'],
  ['tel:0052%20378%20782%206200', 'tel:+593980294360'],
  ['0052 378 782 6200', '+593 98 029 4360<br />+593 98 626 7287'],
  ['comunicacion@topigsnorsvin.com.mx', 'info@topigsnorsvin.com.ec'],
  ['Comunicacion@topigsnorsvin.com.mx', 'info@topigsnorsvin.com.ec'],
  ['comunicaciones@topigsnorsvin.com.mx', 'info@topigsnorsvin.com.ec'],
  ['comunicacioneas@topigsnorsvin.com.mx', 'info@topigsnorsvin.com.ec'],
  ['oficinas@topigsnorsvin.com.mx', 'info@topigsnorsvin.com.ec'],
  ['<br />www.topigsnorsvin.mx', ''],
  ['www.topigsnorsvin.mx', 'topigsnorsvin.com.ec'],
  ['Office México', 'Oficina Ecuador'],
  ['es_MX', 'es_EC'],
];

// Remove a well-formed <div> subtree by its Elementor data-id (depth-counted).
function removeByDataId(html, id) {
  const m = new RegExp(`<div[^>]*data-id="${id}"[^>]*>`).exec(html);
  if (!m) return html;
  let i = m.index + m[0].length, depth = 1;
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = i;
  let t;
  while ((t = re.exec(html))) {
    depth += t[1] ? -1 : 1;
    if (depth === 0) return html.slice(0, m.index) + html.slice(t.index + t[0].length);
  }
  return html;
}

let files = 0, repl = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.html?$/i.test(e.name)) process1(full, path.relative(ROOT, full));
  }
}
function process1(file, rel) {
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  let n = 0;
  for (const [a, b] of REPL) {
    const parts = html.split(a);
    if (parts.length > 1) { n += parts.length - 1; html = parts.join(b); }
  }
  if (rel === 'index.html') html = removeByDataId(html, 'a4e4efe');
  if (html !== before) { fs.writeFileSync(file, html); files++; repl += n; }
}

walk(ROOT);
console.log(`apply-ecuador-content: ${repl} replacements across ${files} files.`);
