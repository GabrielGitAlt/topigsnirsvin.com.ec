// Build the Infotopigs section:
//
//   infotopigs/index.html                  the archive — every week, every year
//   infotopigs/<year>-semana-<nn>/         one page per edition
//
// Content comes from infotopigs/entries.json. Page chrome (head, header, nav,
// footer) is lifted from pages already in the mirror, so Infotopigs always
// matches the rest of the site — including header/footer changes that arrive
// with the daily news sync:
//
//   - the archive copies noticias/index.html   (depth 1, ../ asset paths)
//   - editions copy a news article             (depth 2, ../../ asset paths)
//
// Editions live one level deeper on purpose: a news article is already a
// blog-post layout at exactly that depth, so its relative asset paths work
// verbatim and nothing has to be rewritten.
//
// Run after apply-ecuador-content.mjs (which adds the Infotopigs nav tab):
//   npm run build-infotopigs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'site/topigsnorsvin.mx');
const DIR = path.join(ROOT, 'infotopigs');
const DATA = path.join(DIR, 'entries.json');
const ARCHIVE_TPL = path.join(ROOT, 'noticias', 'index.html');

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ISO-8601 week number *and* week-year. We group by the week-year rather than
// the calendar year so the two always agree: the Monday of 29-dic-2025 opens
// week 1, so it files under 2026 — which is what "semana 1" means to a reader.
function isoWeekParts(date) {
  const t = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); // nearest Thursday
  const year = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return { week, year };
}

const longDate = (d) => `${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;

// Each edition covers a week, so show the span the way the bulletin itself does
// ("20 – 26 de julio de 2026"), collapsing the parts the two dates share.
function longRange(a, b) {
  if (!b) return longDate(a);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) return `${longDate(a)} – ${longDate(b)}`;
  if (a.getUTCMonth() !== b.getUTCMonth()) {
    return `${a.getUTCDate()} de ${MONTHS[a.getUTCMonth()]} – ${longDate(b)}`;
  }
  return `${a.getUTCDate()} – ${longDate(b)}`;
}

const isImage = (u) => /\.(jpe?g|png|webp|gif|avif)$/i.test(u || '');
const slugFor = (e) => `${e.year}-semana-${String(e.week).padStart(2, '0')}`;

// ---------------------------------------------------------------- page shell
function shellFrom(file) {
  const tpl = fs.readFileSync(file, 'utf8');
  const headEnd = tpl.indexOf('</header>');
  const footStart = tpl.indexOf('<footer data-elementor-type="footer"');
  if (headEnd === -1 || footStart === -1) {
    throw new Error(`no encuentro el header/footer en ${path.relative(ROOT, file)}`);
  }
  return {
    head: tpl.slice(0, headEnd + '</header>'.length),
    foot: tpl.slice(footStart),
  };
}

function rewriteHead(head, { title, desc, ogUrl, ogImage, style }) {
  let h = head
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<link rel="next"[^>]*>\s*/, '')
    .replace(/<link rel="prev"[^>]*>\s*/, '')
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(title)}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${esc(title)}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(desc)}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${esc(desc)}"`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(desc)}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${esc(ogUrl)}"`)
    // Article-specific structured data from the template doesn't describe us.
    .replace(/<script type="application\/ld\+json" class="rank-math-schema">[\s\S]*?<\/script>\s*/, '')
    .replace('<body data-rsssl=1 class="blog ', '<body data-rsssl=1 class="page ');
  if (ogImage) {
    h = h.replace(/<meta property="og:image" content="[^"]*"/, `<meta property="og:image" content="${esc(ogImage)}"`);
    if (!/og:image/.test(h)) {
      h = h.replace('</head>', `<meta property="og:image" content="${esc(ogImage)}" />\n</head>`);
    }
  }
  return h.replace('</head>', `${style}\n</head>`);
}

// The templates are other pages, so their nav marks *themselves* as current.
// Point the Noticias tab back at the news archive and light up Infotopigs.
function activateInfotopigs(html, { noticiasHref, selfHref }) {
  return html
    .replace(
      /(<li class=")([^"]*menu-item-119267)(">)<a href="[^"]*"([^>]*)>Noticias<\/a>/g,
      (_m, open, liClass, close, attrs) => {
        const cls = liClass.replace(/\bcurrent[-_][\w-]+\b/g, '').replace(/\s+/g, ' ').trim();
        const tabindex = /tabindex="-1"/.test(attrs) ? ' tabindex="-1"' : '';
        return `${open}${cls}${close}<a href="${noticiasHref}" class="elementor-item"${tabindex}>Noticias</a>`;
      })
    .replace(
      /(<li class="[^"]*menu-item-119268">)<a href="[^"]*"([^>]*)>Infotopigs<\/a>/g,
      (_m, open, attrs) => {
        const tabindex = /tabindex="-1"/.test(attrs) ? ' tabindex="-1"' : '';
        return `${open}<a href="${selfHref}" aria-current="page" class="elementor-item elementor-item-active"${tabindex}>Infotopigs</a>`;
      });
}

// -------------------------------------------------------------------- styles
const ARCHIVE_STYLE = `
<style id="tn-infotopigs">
.tn-info-wrap{max-width:1140px;margin:0 auto;padding:0 20px}
.tn-info-head{padding:56px 0 8px}
.tn-info-head h1{font-family:"Roboto",Sans-serif;font-size:56px;font-weight:600;color:#E6007E;margin:0 0 14px;line-height:1.1}
.tn-info-intro{font-family:"Roboto",Sans-serif;font-size:19px;line-height:1.6;color:#404040;margin:0;max-width:760px}
.tn-info-archive{padding:32px 0 72px}
.tn-info-year{margin-top:40px}
.tn-info-year>h2{font-family:"Roboto",Sans-serif;font-size:28px;font-weight:600;color:#404040;margin:0 0 18px;
  padding-bottom:10px;border-bottom:3px solid #E6007E;display:flex;align-items:baseline;gap:12px}
.tn-info-year>h2 small{font-size:15px;font-weight:400;color:#B2B2B3}
.tn-info-list{list-style:none;margin:0;padding:0}
.tn-info-item+.tn-info-item{margin-top:10px}
.tn-info-link{display:flex;align-items:center;gap:22px;padding:20px 24px;background:#F6F4F4;border-left:5px solid #C9C9CB;
  text-decoration:none;color:inherit;transition:background .2s,border-color .2s,transform .2s}
.tn-info-link:hover,.tn-info-link:focus-visible{background:#fff;border-left-color:#E6007E;transform:translateX(3px);
  box-shadow:0 6px 20px rgba(0,0,0,.08)}
.tn-info-week{flex:0 0 auto;min-width:92px;font-family:"Roboto",Sans-serif;font-weight:600;font-size:13px;
  letter-spacing:.06em;text-transform:uppercase;color:#E6007E}
.tn-info-week b{display:block;font-size:26px;letter-spacing:0;line-height:1.1}
/* Fixed box, cropped to the top: the editions are tall portrait infographics,
   and their top edge is the branded "INFOTOPIGS / SEMANA n" header — the most
   recognisable part — so rows stay even whatever proportions arrive. */
.tn-info-thumb{flex:0 0 auto;width:76px;height:100px;line-height:0;background:#fff;border:1px solid #e2e0e0}
.tn-info-thumb img{width:100%;height:100%;display:block;object-fit:cover;object-position:top center}
.tn-info-body{flex:1 1 auto;min-width:0}
.tn-info-title{display:block;font-family:"Roboto",Sans-serif;font-size:19px;font-weight:600;color:#404040;line-height:1.35}
.tn-info-summary{display:block;margin-top:5px;font-size:15px;line-height:1.5;color:#6b6b6b}
.tn-info-meta{flex:0 0 auto;text-align:right;font-size:14px;color:#8a8a8a;white-space:nowrap}
.tn-info-meta .tn-info-go{display:block;margin-top:6px;font-weight:600;color:#E6007E}
.tn-info-empty{background:#F6F4F4;border-left:5px solid #E6007E;padding:28px 30px;font-size:17px;line-height:1.6;color:#404040}
.tn-info-empty strong{display:block;font-size:20px;margin-bottom:6px;color:#E6007E}
@media(max-width:767px){
  .tn-info-head{padding-top:36px}
  .tn-info-head h1{font-size:38px}
  .tn-info-intro{font-size:17px}
  .tn-info-link{flex-wrap:wrap;gap:8px 16px;padding:18px}
  .tn-info-week{min-width:0;display:flex;align-items:baseline;gap:8px}
  .tn-info-week b{font-size:20px}
  .tn-info-thumb{width:58px;height:76px;order:4}
  .tn-info-body{flex:1 1 auto;order:5}
  .tn-info-meta{text-align:left;margin-left:auto}
  .tn-info-meta .tn-info-go{margin-top:2px}
}
</style>`.trim();

const EDITION_STYLE = `
<style id="tn-infotopigs-edicion">
.tn-ed-wrap{max-width:900px;margin:0 auto;padding:48px 20px 72px}
.tn-ed-back{display:inline-block;font-family:"Roboto",Sans-serif;font-size:15px;font-weight:600;color:#E6007E;
  text-decoration:none;margin-bottom:18px}
.tn-ed-back:hover{text-decoration:underline}
.tn-ed-kicker{font-family:"Roboto",Sans-serif;font-size:13px;font-weight:600;letter-spacing:.08em;
  text-transform:uppercase;color:#E6007E;margin:0 0 8px}
.tn-ed-wrap h1{font-family:"Roboto",Sans-serif;font-size:42px;font-weight:600;color:#404040;line-height:1.15;margin:0 0 10px}
.tn-ed-date{font-family:"Roboto",Sans-serif;font-size:16px;color:#8a8a8a;margin:0 0 26px}
.tn-ed-summary{font-family:"Roboto",Sans-serif;font-size:18px;line-height:1.6;color:#404040;margin:0 0 26px;
  padding-left:16px;border-left:4px solid #E6007E}
.tn-ed-figure{margin:0 0 26px;background:#F6F4F4;padding:18px;line-height:0}
.tn-ed-figure img{width:100%;height:auto;display:block;box-shadow:0 4px 18px rgba(0,0,0,.10)}
.tn-ed-actions{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 40px}
.tn-ed-btn{display:inline-block;background:#E6007E;color:#fff !important;font-family:"Roboto",Sans-serif;font-size:16px;
  font-weight:600;text-decoration:none;padding:13px 26px;transition:background .2s,transform .2s}
.tn-ed-btn:hover,.tn-ed-btn:focus-visible{background:#B10061;transform:translateY(-2px)}
.tn-ed-btn--ghost{background:transparent;color:#E6007E !important;box-shadow:inset 0 0 0 2px #E6007E}
.tn-ed-btn--ghost:hover,.tn-ed-btn--ghost:focus-visible{background:#E6007E;color:#fff !important}
.tn-ed-nav{display:flex;flex-wrap:wrap;gap:14px;justify-content:space-between;align-items:center;
  border-top:1px solid #e2e0e0;padding-top:22px}
.tn-ed-nav a{font-family:"Roboto",Sans-serif;font-size:15px;font-weight:600;color:#E6007E;text-decoration:none}
.tn-ed-nav a:hover{text-decoration:underline}
.tn-ed-nav .tn-ed-nav-mid{color:#8a8a8a;font-weight:400}
@media(max-width:767px){
  .tn-ed-wrap{padding-top:30px}
  .tn-ed-wrap h1{font-size:30px}
  .tn-ed-figure{padding:10px}
  .tn-ed-btn{flex:1 1 100%;text-align:center}
  .tn-ed-nav{gap:10px}
  .tn-ed-nav a{flex:1 1 100%}
  .tn-ed-nav .tn-ed-nav-mid{order:3;text-align:center}
}
</style>`.trim();

// ------------------------------------------------------------------ entries
function normalise(e) {
  const d = new Date(`${e.date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`entries.json: fecha inválida "${e.date}"`);
  if (!e.title) throw new Error(`entries.json: falta "title" en la edición del ${e.date}`);
  if (!e.url) throw new Error(`entries.json: falta "url" en la edición del ${e.date}`);
  const until = e.until ? new Date(`${e.until}T00:00:00Z`) : null;
  if (until && Number.isNaN(until.getTime())) {
    throw new Error(`entries.json: "until" inválido en la edición del ${e.date}`);
  }
  const iso = isoWeekParts(d);
  return { ...e, d, until, week: e.week ?? iso.week, year: String(e.year ?? iso.year) };
}

// ------------------------------------------------------------------ archive
function renderCard(e) {
  const summary = e.summary ? `<span class="tn-info-summary">${esc(e.summary)}</span>` : '';
  const thumb = isImage(e.url)
    ? `<span class="tn-info-thumb"><img src="${esc(e.url)}" alt="" loading="lazy" decoding="async"></span>`
    : '';
  return `
					<li class="tn-info-item">
						<a class="tn-info-link" href="${esc(e.slug)}/index.html">
							<span class="tn-info-week">Semana <b>${e.week}</b></span>
							${thumb}
							<span class="tn-info-body">
								<span class="tn-info-title">${esc(e.title)}</span>
								${summary}
							</span>
							<span class="tn-info-meta">${esc(longRange(e.d, e.until))}<span class="tn-info-go">Ver edición &rarr;</span></span>
						</a>
					</li>`;
}

function renderArchive(entries) {
  if (!entries.length) {
    return `
				<div class="tn-info-empty">
					<strong>Próximamente la primera edición</strong>
					Infotopigs se publica cada lunes. Aquí quedará el histórico completo de todas las semanas y años.
				</div>`;
  }
  const years = [...new Set(entries.map((e) => e.year))];
  return years.map((y) => {
    const inYear = entries.filter((e) => e.year === y);
    const n = inYear.length;
    return `
				<section class="tn-info-year">
					<h2>${y} <small>${n} ${n === 1 ? 'edición' : 'ediciones'}</small></h2>
					<ul class="tn-info-list">${inYear.map(renderCard).join('')}
					</ul>
				</section>`;
  }).join('');
}

// ------------------------------------------------------------------ edition
function renderEdition(e, newer, older) {
  // Paths are relative to infotopigs/<slug>/ — one level under the section.
  const asset = e.url.startsWith('http') ? e.url : `../${e.url}`;
  const summary = e.summary ? `<p class="tn-ed-summary">${esc(e.summary)}</p>` : '';
  const media = isImage(e.url)
    ? `
					<figure class="tn-ed-figure">
						<a href="${esc(asset)}" target="_blank" rel="noopener" data-elementor-open-lightbox="no">
							<img src="${esc(asset)}" alt="Infotopigs semana ${e.week} — ${esc(e.title)}" decoding="async">
						</a>
					</figure>`
    : '';
  const openLabel = isImage(e.url) ? 'Ver a tamaño completo' : 'Abrir la edición';
  return `
				<div data-elementor-type="single-post" class="elementor elementor-infotopigs-edicion" data-elementor-post-type="post">
					<div class="tn-ed-wrap">
						<a class="tn-ed-back" href="../index.html">&larr; Todas las ediciones</a>
						<p class="tn-ed-kicker">Infotopigs &middot; Semana ${e.week}</p>
						<h1 class="elementor-heading-title">${esc(e.title)}</h1>
						<p class="tn-ed-date">${esc(longRange(e.d, e.until))}</p>
						${summary}${media}
						<p class="tn-ed-actions">
							<a class="tn-ed-btn" href="${esc(asset)}" target="_blank" rel="noopener" data-elementor-open-lightbox="no">${openLabel}</a>
							<a class="tn-ed-btn tn-ed-btn--ghost" href="${esc(asset)}" download>Descargar</a>
						</p>
						<nav class="tn-ed-nav">
							${older ? `<a href="../${esc(older.slug)}/index.html">&larr; Semana ${older.week}</a>` : '<span></span>'}
							<a class="tn-ed-nav-mid" href="../index.html">Todas las ediciones</a>
							${newer ? `<a href="../${esc(newer.slug)}/index.html">Semana ${newer.week} &rarr;</a>` : '<span></span>'}
						</nav>
					</div>
				</div>
`;
}

// --------------------------------------------------------------------- main
if (!fs.existsSync(DATA)) {
  console.error(`build-infotopigs: falta ${path.relative(process.cwd(), DATA)}`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const intro = data.intro
  || 'Publicación semanal de Topigs Norsvin Ecuador. Nueva edición cada lunes.';

// Newest first, and give every edition its page slug up front so the archive and
// the prev/next links agree.
const entries = (Array.isArray(data.entries) ? data.entries : [])
  .map(normalise)
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((e) => ({ ...e, slug: slugFor(e) }));

const dupe = entries.map((e) => e.slug).find((s, i, a) => a.indexOf(s) !== i);
if (dupe) {
  console.error(`build-infotopigs: dos ediciones comparten la semana "${dupe}" — revise entries.json`);
  process.exit(1);
}

// --- archive ---------------------------------------------------------------
const archiveShell = shellFrom(ARCHIVE_TPL);
const archive = activateInfotopigs(
  rewriteHead(archiveShell.head, {
    title: 'Infotopigs - Topigs Norsvin',
    desc: intro,
    ogUrl: '/infotopigs/',
    style: ARCHIVE_STYLE,
  })
  + `
				<div data-elementor-type="wp-page" class="elementor elementor-infotopigs" data-elementor-post-type="page">
					<div class="tn-info-wrap tn-info-head">
						<h1 class="elementor-heading-title elementor-size-default">Infotopigs</h1>
						<p class="tn-info-intro">${esc(intro)}</p>
					</div>
					<div class="tn-info-wrap tn-info-archive">${renderArchive(entries)}
					</div>
				</div>
`
  + archiveShell.foot,
  { noticiasHref: '../noticias/index.html', selfHref: 'index.html' },
);
fs.mkdirSync(DIR, { recursive: true });
fs.writeFileSync(path.join(DIR, 'index.html'), archive);

// --- one page per edition --------------------------------------------------
// A news article is already a blog-post layout at the depth the editions sit
// at, so its relative asset paths carry over untouched.
let editionShell = null;
if (entries.length) {
  const article = fs.readdirSync(path.join(ROOT, 'news'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(ROOT, 'news', d.name, 'index.html'))
    .filter((f) => fs.existsSync(f))
    .sort()[0];
  if (!article) {
    console.error('build-infotopigs: no encuentro ninguna nota en news/ para usar de plantilla');
    process.exit(1);
  }
  editionShell = shellFrom(article);
}

entries.forEach((e, i) => {
  const html = activateInfotopigs(
    rewriteHead(editionShell.head, {
      title: `Infotopigs semana ${e.week} (${e.year}) - Topigs Norsvin`,
      desc: e.summary || e.title,
      ogUrl: `/infotopigs/${e.slug}/`,
      ogImage: isImage(e.url) ? `../${e.url}` : null,
      style: EDITION_STYLE,
    })
    + renderEdition(e, entries[i - 1] || null, entries[i + 1] || null)
    + editionShell.foot,
    { noticiasHref: '../../noticias/index.html', selfHref: '../index.html' },
  );
  const out = path.join(DIR, e.slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
});

// Drop edition folders that no longer have an entry, so removing or renumbering
// a week doesn't leave an orphan page live on the site.
const keep = new Set(entries.map((e) => e.slug));
for (const d of fs.readdirSync(DIR, { withFileTypes: true })) {
  if (d.isDirectory() && /^\d{4}-semana-\d{2}$/.test(d.name) && !keep.has(d.name)) {
    fs.rmSync(path.join(DIR, d.name), { recursive: true, force: true });
    console.log(`build-infotopigs: retirada edición obsoleta ${d.name}`);
  }
}

console.log(`build-infotopigs: ${entries.length} edicion(es) -> infotopigs/ (archivo + ${entries.length} página(s))`);
