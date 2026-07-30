// Publish one Infotopigs edition in a single step: copy the artwork in, add the
// entry to entries.json, rebuild the page.
//
//   npm run add-infotopigs -- --file ~/Downloads/semana30.jpg --week 30 \
//                             --from 2026-07-20 --to 2026-07-26
//
// --week/--from/--to come straight off the bulletin's own header ("SEMANA 30 /
// 20 JUL – 26 JUL 2026"), so what the page shows always matches what the team
// published. --title and --summary are optional.
import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i];
}

const SITE = path.resolve(args.site || 'site/topigsnorsvin.mx');
const DIR = path.join(SITE, 'infotopigs');
const DATA = path.join(DIR, 'entries.json');
const EDS = path.join(DIR, 'ediciones');

function die(msg) {
  console.error(`add-infotopigs: ${msg}`);
  console.error('uso: npm run add-infotopigs -- --file <archivo> --week <n> --from <YYYY-MM-DD> [--to <YYYY-MM-DD>] [--title "..."] [--summary "..."]');
  process.exit(1);
}

if (!args.file) die('falta --file');
if (!args.from) die('falta --from (el lunes de la semana que cubre el informe)');
if (!fs.existsSync(args.file)) die(`no encuentro el archivo: ${args.file}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(args.from)) die('--from debe ser YYYY-MM-DD');
if (args.to && !/^\d{4}-\d{2}-\d{2}$/.test(args.to)) die('--to debe ser YYYY-MM-DD');

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
data.entries ||= [];

if (data.entries.some((e) => e.date === args.from)) {
  die(`ya existe una edición con fecha ${args.from} — bórrela de entries.json si quiere reemplazarla`);
}

// Name the file after the week it covers, so the folder sorts chronologically
// and the URL says what it is.
const week = args.week ? String(args.week).padStart(2, '0') : null;
const stem = week ? `${args.from.slice(0, 4)}-semana-${week}` : args.from;

// The team sends whatever their tools produce — the week-30 bulletin arrived as
// a 1.4 MB PNG of a 1131×1600 infographic. Recompress on the way in to the same
// budget as the rest of the site (see optimize-mirror-images.mjs): JPEG q84
// mozjpeg, capped at 2560px wide. PDFs and animated images pass through as-is,
// and so does anything sharp can't read or can't actually make smaller.
const CONVERTIBLE = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);
const kb = (n) => `${Math.round(n / 1024)} KB`;

async function webReadyCopy(src) {
  const ext = path.extname(src).toLowerCase();
  const orig = fs.readFileSync(src);
  let out = { name: stem + ext, data: orig, note: '' };

  if (CONVERTIBLE.has(ext)) {
    try {
      const { default: sharp } = await import('sharp');
      const img = sharp(src, { failOn: 'none' });
      const md = await img.metadata();
      if ((md.pages ?? 1) > 1) {
        out.note = ' (animada, se copia tal cual)';
      } else {
        const buf = await img
          .rotate() // apply EXIF orientation, in case it comes off a phone
          .flatten({ background: '#ffffff' }) // JPEG has no alpha channel
          .resize({ width: 2560, withoutEnlargement: true })
          .jpeg({ quality: 84, mozjpeg: true, progressive: true })
          .toBuffer();
        if (buf.length < orig.length) {
          out = { name: `${stem}.jpg`, data: buf, note: ` (optimizada: ${kb(orig.length)} -> ${kb(buf.length)})` };
        }
      }
    } catch (e) {
      console.warn(`add-infotopigs: no pude optimizar la imagen (${e.message}); la copio tal cual. Ejecute \`npm install\` para habilitar la compresión.`);
    }
  }

  fs.mkdirSync(EDS, { recursive: true });
  // Replacing an edition can change the extension (.png -> .jpg); drop any
  // artwork left over for the same week so orphans don't pile up.
  for (const f of fs.readdirSync(EDS)) {
    if (f !== out.name && path.parse(f).name === stem) fs.unlinkSync(path.join(EDS, f));
  }
  fs.writeFileSync(path.join(EDS, out.name), out.data);
  return out;
}

const saved = await webReadyCopy(args.file);
const base = saved.name;

const entry = {
  date: args.from,
  ...(args.to ? { until: args.to } : {}),
  ...(args.week ? { week: Number(args.week) } : {}),
  title: args.title || 'Información semanal del mercado porcino ecuatoriano',
  ...(args.summary ? { summary: args.summary } : {}),
  url: `ediciones/${base}`,
};

data.entries.unshift(entry);
fs.writeFileSync(DATA, `${JSON.stringify(data, null, 2)}\n`);

console.log(`add-infotopigs: agregada semana ${args.week ?? '(auto)'} -> infotopigs/ediciones/${base}${saved.note}`);

// Rebuild so the page is ready to commit.
const { spawnSync } = await import('node:child_process');
const r = spawnSync(process.execPath, [path.join(import.meta.dirname, 'build-infotopigs.mjs'), SITE],
  { stdio: 'inherit' });
process.exit(r.status ?? 0);
