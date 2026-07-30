// Build site/topigsnorsvin.mx/infotopigs/index.html — the weekly "Infotopigs"
// bulletin and its full archive (every week, every year).
//
// Content lives in infotopigs/entries.json; this script renders it. The page
// chrome (head, header, nav, footer) is lifted verbatim from noticias/index.html
// so Infotopigs always matches the rest of the site — including any header or
// footer change that arrives with the daily news sync.
//
// Run after apply-ecuador-content.mjs (which adds the Infotopigs nav tab):
//   npm run build-infotopigs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'site/topigsnorsvin.mx');
const TEMPLATE = path.join(ROOT, 'noticias', 'index.html');
const OUT_DIR = path.join(ROOT, 'infotopigs');
const OUT = path.join(OUT_DIR, 'index.html');
const DATA = path.join(OUT_DIR, 'entries.json');

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// ISO-8601 week number *and* week-year — the "semana N" shown on each edition.
// We group by the week-year rather than the calendar year so the two always
// agree: the Monday of 29-dic-2025 opens week 1, so it files under 2026 (which
// is what "semana 1" means to a reader) instead of showing "2025 · semana 1".
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

const STYLE = `
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

// entries.json -> normalised records. "week"/"year" may be set explicitly to
// override the values derived from the date.
function normalise(e) {
  const d = new Date(`${e.date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`entries.json: fecha inválida "${e.date}"`);
  if (!e.title) throw new Error(`entries.json: falta "title" en la edición del ${e.date}`);
  if (!e.url) throw new Error(`entries.json: falta "url" en la edición del ${e.date}`);
  const iso = isoWeekParts(d);
  const until = e.until ? new Date(`${e.until}T00:00:00Z`) : null;
  if (until && Number.isNaN(until.getTime())) {
    throw new Error(`entries.json: "until" inválido en la edición del ${e.date}`);
  }
  return { ...e, d, until, week: e.week ?? iso.week, year: String(e.year ?? iso.year) };
}

function renderEntry(e) {
  const summary = e.summary
    ? `<span class="tn-info-summary">${esc(e.summary)}</span>` : '';
  // Open in a new tab so the archive stays put, and tell Elementor to keep its
  // hands off: its LightboxManager grabs any link ending in an image extension
  // and calls preventDefault, but the lightbox itself doesn't work in this
  // static mirror — so the click would just do nothing at all.
  const linkAttrs = ' target="_blank" rel="noopener" data-elementor-open-lightbox="no"';
  // The editions are infographics, so preview the artwork itself when we can.
  const thumb = isImage(e.url)
    ? `<span class="tn-info-thumb"><img src="${esc(e.url)}" alt="" loading="lazy" decoding="async"></span>`
    : '';
  return `
					<li class="tn-info-item">
						<a class="tn-info-link" href="${esc(e.url)}"${linkAttrs}>
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
  // Newest first, grouped by ISO week-year.
  const sorted = entries.map(normalise).sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(sorted.map((e) => e.year))];
  return years.map((y) => {
    const inYear = sorted.filter((e) => e.year === y);
    const n = inYear.length;
    return `
				<section class="tn-info-year">
					<h2>${y} <small>${n} ${n === 1 ? 'edición' : 'ediciones'}</small></h2>
					<ul class="tn-info-list">${inYear.map(renderEntry).join('')}
					</ul>
				</section>`;
  }).join('');
}

// ---- read content -----------------------------------------------------------
if (!fs.existsSync(DATA)) {
  console.error(`build-infotopigs: falta ${path.relative(process.cwd(), DATA)}`);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const entries = Array.isArray(data.entries) ? data.entries : [];
const intro = data.intro || 'Publicación semanal de Topigs Norsvin Ecuador. Nueva edición cada lunes.';

// ---- page chrome from the news page ----------------------------------------
const tpl = fs.readFileSync(TEMPLATE, 'utf8');
const headEnd = tpl.indexOf('</header>');
const footStart = tpl.indexOf('<footer data-elementor-type="footer"');
if (headEnd === -1 || footStart === -1) {
  console.error('build-infotopigs: no encuentro el header/footer en noticias/index.html');
  process.exit(1);
}
let head = tpl.slice(0, headEnd + '</header>'.length);
const foot = tpl.slice(footStart);

const TITLE = 'Infotopigs - Topigs Norsvin';
head = head
  .replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`)
  .replace(/<link rel="next"[^>]*>\s*/, '')
  .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(TITLE)}"`)
  .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${esc(TITLE)}"`)
  .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(intro)}"`)
  .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${esc(intro)}"`)
  .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(intro)}"`)
  .replace(/<meta property="og:url" content="[^"]*"/, '<meta property="og:url" content="/infotopigs/"')
  // Drop the news-archive structured data — it does not describe this page.
  .replace(/<script type="application\/ld\+json" class="rank-math-schema">[\s\S]*?<\/script>\s*/, '')
  .replace('<body data-rsssl=1 class="blog ', '<body data-rsssl=1 class="page ')
  .replace('</head>', `${STYLE}\n</head>`);

// The template is the news archive, so its own nav links point at itself. This
// page sits at the same depth (infotopigs/), so swap which tab is "current":
// Noticias becomes a normal sibling link, Infotopigs becomes the active one.
// Applies to every nav on the page — the header one and the footer one.
function swapCurrentTab(html) {
  return html
    .replace(
      /(<li class=")([^"]*menu-item-119267)(">)<a href="[^"]*"([^>]*)>Noticias<\/a>/g,
      (_m, open, liClass, close, attrs) => {
        const cls = liClass.replace(/\bcurrent[-_][\w-]+\b/g, '').replace(/\s+/g, ' ').trim();
        const tabindex = /tabindex="-1"/.test(attrs) ? ' tabindex="-1"' : '';
        return `${open}${cls}${close}<a href="../noticias/index.html" class="elementor-item"${tabindex}>Noticias</a>`;
      })
    .replace(
      /(<li class="[^"]*menu-item-119268">)<a href="[^"]*"([^>]*)>Infotopigs<\/a>/g,
      (_m, open, attrs) => {
        const tabindex = /tabindex="-1"/.test(attrs) ? ' tabindex="-1"' : '';
        return `${open}<a href="index.html" aria-current="page" class="elementor-item elementor-item-active"${tabindex}>Infotopigs</a>`;
      });
}

const body = `
				<div data-elementor-type="wp-page" class="elementor elementor-infotopigs" data-elementor-post-type="page">
					<div class="tn-info-wrap tn-info-head">
						<h1 class="elementor-heading-title elementor-size-default">Infotopigs</h1>
						<p class="tn-info-intro">${esc(intro)}</p>
					</div>
					<div class="tn-info-wrap tn-info-archive">${renderArchive(entries)}
					</div>
				</div>
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, swapCurrentTab(head + body + foot));
console.log(`build-infotopigs: ${entries.length} edicion(es) -> ${path.relative(process.cwd(), OUT)}`);
