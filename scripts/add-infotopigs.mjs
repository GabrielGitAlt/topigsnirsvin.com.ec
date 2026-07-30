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
const ext = path.extname(args.file).toLowerCase();
const week = args.week ? String(args.week).padStart(2, '0') : null;
const base = week
  ? `${args.from.slice(0, 4)}-semana-${week}${ext}`
  : `${args.from}${ext}`;

fs.mkdirSync(EDS, { recursive: true });
fs.copyFileSync(args.file, path.join(EDS, base));

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

console.log(`add-infotopigs: agregada semana ${args.week ?? '(auto)'} -> infotopigs/ediciones/${base}`);

// Rebuild so the page is ready to commit.
const { spawnSync } = await import('node:child_process');
const r = spawnSync(process.execPath, [path.join(import.meta.dirname, 'build-infotopigs.mjs'), SITE],
  { stdio: 'inherit' });
process.exit(r.status ?? 0);
