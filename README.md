# Topigs Norsvin Ecuador — topigsnirsvin.com.ec

An **exact 1:1 copy** of https://topigsnorsvin.mx/ for the Ecuador branch,
**optimized to load faster** and deployed on **GitHub Pages**. Same pixels as the
original — it's the original site's own files — just lighter.

The deployable site is **`site/topigsnorsvin.mx/`** (plain static HTML/CSS/JS).

## Optimizations (nothing changed about how it looks)

| | Before | After |
|---|---|---|
| Images on disk | 98 MB | **49 MB** (recompressed, visually identical) |
| Images per page load | all up front | **lazy-loaded** (only on-screen ones) |
| Asset paths | absolute | **relative** — renders at any URL (project Pages URL *and* custom domain) |

## Deploy (GitHub Pages via Actions)

`.github/workflows/deploy.yml` publishes `site/topigsnorsvin.mx/` on every push
to `main`. Enable it once: repo **Settings → Pages → Source: GitHub Actions**.

- **Live now at the project URL:** `https://<user>.github.io/<repo>/` — it
  renders correctly there because all asset paths are relative.
- **Custom domain (topigsnirsvin.com.ec):** create a file
  `site/topigsnorsvin.mx/CNAME` containing `topigsnirsvin.com.ec`, commit it,
  then point DNS at GitHub Pages (apex `A` records `185.199.108–111.153`) and set
  the domain under Settings → Pages.

## Contact / newsletter forms

The site is static, so forms post to **Web3Forms** (no backend). Tested working.

- The access key lives in `site/topigsnorsvin.mx/form-handler.js`
  (`WEB3FORMS_KEY`). It's **public by design** — Web3Forms keys are meant to sit
  in client-side code; the recipient inbox is configured on the
  [web3forms.com](https://web3forms.com) dashboard, not in the repo.

## Infotopigs (boletín semanal)

The **Infotopigs** tab is our own section — it isn't mirrored from Mexico:

```
infotopigs/index.html            the archive — every week, grouped by year
infotopigs/2026-semana-30/       one page per edition (blog-post layout)
infotopigs/ediciones/            the artwork files themselves
```

Each edition gets its **own page**, like a news article — title, week, date
range, the infographic laid out inside the site chrome, download button and
prev/next links. The archive links to those pages, not to the raw image file.

The two page types copy their chrome from different places on purpose: the
archive from `noticias/index.html` (depth 1, `../` asset paths) and the editions
from a news article (depth 2, `../../`). A news article is already a blog-post
layout at exactly the depth the editions sit at, so its relative asset paths
carry over untouched — nothing has to be rewritten and nothing can drift.

**To publish an edition — one command.** Read the week number and dates off the
bulletin's own header ("SEMANA 30 / 20 JUL – 26 JUL 2026") and pass them
straight through, so the page always agrees with what the team published:

```bash
npm run add-infotopigs -- --file ~/Downloads/semana30.jpg --week 30 --from 2026-07-20 --to 2026-07-26
```

That copies the artwork into `infotopigs/ediciones/`, adds the entry to
`entries.json` and rebuilds the page. Then commit and push. `--title` and
`--summary` are optional; the default title is "Información semanal del mercado
porcino ecuatoriano".

Notes:

- **Always pass `--week`.** Their numbering is what readers see on the artwork.
  Without it the week is derived from the date, which can disagree by one at a
  year boundary.
- Image editions (`.jpg`, `.png`, …) get a thumbnail in the archive, cropped to
  the top so the branded header shows. PDFs just get the text row.
- `url` in `entries.json` can also be an external link (Drive, Dropbox, …);
  those open in a new tab.

## Informes (internal reports) — built but switched off

`/informes/` is written and ready (`scripts/build-informes.mjs`, plus a footer
link injected by `apply-ecuador-content.mjs`) but **not published**. The plan was
a shared Google Drive folder doing the access check, and that fell through:
Drive requires each authorised person to have a Google account, and the team's
`@grupodelago.com` addresses are Yahoo-hosted, so sharing is refused outright.

A static host can't check who a visitor is, so a real private area needs either
Cloudflare Access (free, email one-time codes, works with any address — but the
domain has to be on Cloudflare) or hosting with a login and an admin panel
(~USD 10–30/month, and it would also give the team self-service uploads). That's
the open decision — see [TODO.md](TODO.md).

To switch the section back on: uncomment the `addInformesFooterLink` call in
`scripts/apply-ecuador-content.mjs` and the `build-informes.mjs` line in
`scripts/sync-news.sh`, point `FOLDER_URL` at whatever destination is agreed,
then re-run both scripts.

### Publishing automatically from email

`.github/workflows/infotopigs-email.yml` checks a mailbox every hour and
publishes anything new, so nobody has to run the command. The team sends the
bulletin as an email attachment exactly as they do today — **no account, no
login, no subject format required.**

The week is worked out from the day the mail arrives: they send on Monday (or a
day or two later) for the week that just ended, so "the ISO week containing
arrival − 7 days" is right either way. A subject mentioning `semana 31`
overrides it, for a week sent out of step.

**Setup — four repo secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `IMAP_HOST` | e.g. `imap.gmail.com` |
| `IMAP_USER` | the mailbox login |
| `IMAP_PASS` | an **app password**, not the account password |
| `ALLOWED_SENDERS` | comma-separated addresses allowed to publish |

Optional: `IMAP_PORT` (993), `IMAP_MAILBOX` (INBOX).

Use a **dedicated throwaway mailbox**. `IMAP_PASS` grants full read access to
whatever inbox it belongs to, and this repo is public — don't point it at a
personal account. Proton Mail won't work: it has no plain IMAP, only a local
desktop Bridge app that a CI runner can't reach.

`ALLOWED_SENDERS` is the security boundary — anyone can email the address, so
mail from anyone not on that list is ignored.

To test without publishing anything, run the workflow manually with **dry run**
ticked; it reports what it would do and marks nothing as read. If a run fails it
opens an issue labelled `infotopigs-auto` rather than failing silently, since a
quiet breakage would just mean a stale site.

Mail that can't be published (no attachment, unknown sender) is left **unread**,
so fixing the cause and re-running picks it up — an edition is never lost.

## Preview locally

```bash
# exactly how GitHub Pages serves it:
cd site/topigsnorsvin.mx && python3 -m http.server 8080   # http://localhost:8080
```

## Maintenance scripts (only needed if you re-mirror the site)

```bash
npm install                 # installs sharp (for image optimization)
npm run optimize-images     # recompress/resize images in place
npm run lazy-load           # add loading="lazy" to <img> tags
npm run relativize          # convert any absolute/root-relative asset paths to relative
npm run add-infotopigs -- …  # publish one Infotopigs edition (see above)
npm run build-infotopigs    # regenerate the Infotopigs page from entries.json
npm run build-informes      # regenerate the Informes page (currently disabled)
```

### Ecuador-specific edits live in a script, not just in the HTML

The daily news sync re-downloads pages from Mexico, so any change made only in
the mirrored HTML would be silently reverted. Site-wide Ecuador changes belong
in `scripts/apply-ecuador-content.mjs`, which the sync re-runs every night —
contact details, the Ecuador social links, and the Infotopigs nav tab are all
applied there.

## To do

See [TODO.md](TODO.md).
