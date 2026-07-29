// Replace the Mexico branch's contact details with the Ecuador ones, point the
// social icons at the Ecuador accounts, add the Infotopigs nav tab, and remove
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

  // Social icons -> Topigs Norsvin Ecuador accounts. The mirror carries the
  // Mexico handles in the footer of every page, and the global (corporate)
  // handles on the "se acerca una tormenta" landing page.
  ['https://linkedin.com/company/topigsnorsvinmx', 'https://ec.linkedin.com/company/topigs-norsvin-ecuador'],
  ['https://www.linkedin.com/company/topigs-norsvin/', 'https://ec.linkedin.com/company/topigs-norsvin-ecuador'],
  ['https://facebook.com/topigsnorsvinmx', 'https://www.facebook.com/share/1BLtVoQEpX/'],
  ['https://www.facebook.com/TopigsNorsvin/', 'https://www.facebook.com/share/1BLtVoQEpX/'],
  ['https://www.instagram.com/topigsnorsvinmx/', 'https://www.instagram.com/topigsnorsvinec/'],
  ['https://www.instagram.com/topigsnorsvin/', 'https://www.instagram.com/topigsnorsvinec/'],
];

// Add the "Infotopigs" tab to the main nav, right after "Noticias". The mirror
// renders that menu item once per nav instance (desktop + mobile dropdown), so
// we clone each one and keep whatever relative href prefix that page uses.
// The <li> class list varies per page (some carry current_page_parent etc.) and
// so does the href on the news item itself (../../noticias/index.html on most
// pages, index.html on the archive, /noticias/ on the attachment pages). Match
// it by menu id + label, and reuse the class list minus "you are here" state.
const NOTICIAS_LI =
  /<li class="([^"]*menu-item-119267)"><a href="[^"]*"([^>]*)>Noticias<\/a><\/li>/g;

function addInfotopigsTab(html, rel) {
  if (html.includes('menu-item-119268')) return html; // already added
  const onSelf = rel === path.join('infotopigs', 'index.html');
  // Relative to this page's own directory, so it works at any URL depth.
  const href = path.relative(path.dirname(rel), path.join('infotopigs', 'index.html'))
    .split(path.sep).join('/');
  return html.replace(NOTICIAS_LI, (li, liClass, attrs) => {
    const cls = liClass
      .replace(/\bcurrent[-_][\w-]+\b/g, '')   // current-menu-item, current_page_parent, ...
      .replace(/\bmenu-item-119267\b/, 'menu-item-119268')
      .replace(/\s+/g, ' ').trim();
    const tabindex = /tabindex="-1"/.test(attrs) ? ' tabindex="-1"' : '';
    const aCls = onSelf ? 'elementor-item elementor-item-active' : 'elementor-item';
    const current = onSelf ? ' aria-current="page"' : '';
    return (
      li +
      `<li class="${cls}">` +
      `<a href="${href}"${current} class="${aCls}"${tabindex}>Infotopigs</a></li>`
    );
  });
}

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
  html = addInfotopigsTab(html, rel);
  if (html !== before) { fs.writeFileSync(file, html); files++; repl += n; }
}

walk(ROOT);
console.log(`apply-ecuador-content: ${repl} replacements across ${files} files.`);
