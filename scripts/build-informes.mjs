// Build site/topigsnorsvin.mx/informes/index.html — the restricted-access
// landing page for the team's internal reports.
//
// The reports themselves live in a shared Drive folder, which does the access
// check (the site is static and cannot). This page exists so the section has a
// stable address on our own domain: if the folder ever moves, or we later put
// the files behind Cloudflare Access, only FOLDER_URL below changes and every
// link on the site keeps working.
//
// Page chrome is lifted from noticias/index.html, same as build-infotopigs.mjs.
//   npm run build-informes
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.argv[2] || 'site/topigsnorsvin.mx');
const TEMPLATE = path.join(ROOT, 'noticias', 'index.html');
const OUT_DIR = path.join(ROOT, 'informes');
const OUT = path.join(OUT_DIR, 'index.html');

// Shared Drive folder holding the internal reports. Must be set to
// "Restricted" in Drive — this page is public, so anyone can see the link.
const FOLDER_URL = 'https://drive.google.com/drive/folders/1r9w7xiuidR24Z9k-MMKRhkUJpOp39Coj';

const TITLE = 'Informes - Topigs Norsvin';
const INTRO = 'Espacio de acceso restringido al equipo de Topigs Norsvin Ecuador. '
  + 'Aquí encontrará los informes internos.';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const STYLE = `
<style id="tn-informes">
.tn-rep-wrap{max-width:1140px;margin:0 auto;padding:0 20px}
.tn-rep-head{padding:56px 0 8px}
.tn-rep-head h1{font-family:"Roboto",Sans-serif;font-size:56px;font-weight:600;color:#E6007E;margin:0 0 14px;line-height:1.1}
.tn-rep-intro{font-family:"Roboto",Sans-serif;font-size:19px;line-height:1.6;color:#404040;margin:0;max-width:760px}
.tn-rep-body{padding:28px 0 72px}
.tn-rep-card{background:#F6F4F4;border-left:5px solid #E6007E;padding:34px 36px;max-width:760px}
.tn-rep-card h2{font-family:"Roboto",Sans-serif;font-size:22px;font-weight:600;color:#404040;margin:0 0 10px}
.tn-rep-card p{font-size:16px;line-height:1.6;color:#404040;margin:0 0 22px}
/* !important: the theme's link colour rule outranks a plain class selector,
   which would leave the label pink-on-pink and invisible. */
.tn-rep-btn{display:inline-block;background:#E6007E;color:#fff !important;font-family:"Roboto",Sans-serif;font-size:17px;
  font-weight:600;text-decoration:none;padding:15px 30px;transition:background .2s,transform .2s}
.tn-rep-btn:hover,.tn-rep-btn:focus-visible{background:#B10061;color:#fff !important;transform:translateY(-2px)}
.tn-rep-note{margin-top:22px;font-size:15px;line-height:1.6;color:#6b6b6b}
.tn-rep-note a{color:#E6007E}
@media(max-width:767px){
  .tn-rep-head{padding-top:36px}
  .tn-rep-head h1{font-size:38px}
  .tn-rep-intro{font-size:17px}
  .tn-rep-card{padding:26px 22px}
  .tn-rep-btn{display:block;text-align:center}
}
</style>`.trim();

// ---- page chrome from the news page ----------------------------------------
const tpl = fs.readFileSync(TEMPLATE, 'utf8');
const headEnd = tpl.indexOf('</header>');
const footStart = tpl.indexOf('<footer data-elementor-type="footer"');
if (headEnd === -1 || footStart === -1) {
  console.error('build-informes: no encuentro el header/footer en noticias/index.html');
  process.exit(1);
}
let head = tpl.slice(0, headEnd + '</header>'.length);
const foot = tpl.slice(footStart);

head = head
  .replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`)
  .replace(/<link rel="next"[^>]*>\s*/, '')
  .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${esc(TITLE)}"`)
  .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${esc(TITLE)}"`)
  .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(INTRO)}"`)
  .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${esc(INTRO)}"`)
  .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(INTRO)}"`)
  .replace(/<meta property="og:url" content="[^"]*"/, '<meta property="og:url" content="/informes/"')
  // Internal section — keep it out of search results.
  .replace(/<meta name="robots" content="[^"]*"/, '<meta name="robots" content="noindex, nofollow"')
  .replace(/<script type="application\/ld\+json" class="rank-math-schema">[\s\S]*?<\/script>\s*/, '')
  .replace('<body data-rsssl=1 class="blog ', '<body data-rsssl=1 class="page ')
  .replace('</head>', `${STYLE}\n</head>`);

// The template is the news archive, so its own nav links point at itself; this
// page sits at the same depth, so make Noticias a normal sibling link again.
const html = (head + `
				<div data-elementor-type="wp-page" class="elementor elementor-informes" data-elementor-post-type="page">
					<div class="tn-rep-wrap tn-rep-head">
						<h1 class="elementor-heading-title elementor-size-default">Informes</h1>
						<p class="tn-rep-intro">${esc(INTRO)}</p>
					</div>
					<div class="tn-rep-wrap tn-rep-body">
						<div class="tn-rep-card">
							<h2>Acceso restringido</h2>
							<p>Los informes est&aacute;n en una carpeta compartida. Al abrirla se le pedir&aacute;
							iniciar sesi&oacute;n con su cuenta de correo autorizada.</p>
							<a class="tn-rep-btn" href="${FOLDER_URL}" target="_blank" rel="noopener">Abrir carpeta de informes</a>
							<p class="tn-rep-note">&iquest;No tiene acceso? Escriba a
							<a href="mailto:info@topigsnorsvin.com.ec">info@topigsnorsvin.com.ec</a>
							para que le agreguen a la lista de personas autorizadas.</p>
						</div>
					</div>
				</div>
` + foot)
  .replace(
    /(<li class=")([^"]*menu-item-119267)(">)<a href="[^"]*"([^>]*)>Noticias<\/a>/g,
    (_m, open, liClass, close, attrs) => {
      const cls = liClass.replace(/\bcurrent[-_][\w-]+\b/g, '').replace(/\s+/g, ' ').trim();
      const tabindex = /tabindex="-1"/.test(attrs) ? ' tabindex="-1"' : '';
      return `${open}${cls}${close}<a href="../noticias/index.html" class="elementor-item"${tabindex}>Noticias</a>`;
    });

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`build-informes: -> ${path.relative(process.cwd(), OUT)}`);
