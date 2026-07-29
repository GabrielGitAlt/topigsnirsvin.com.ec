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

The **Infotopigs** tab is our own section — it isn't mirrored from Mexico. It
lists every weekly edition, newest first, grouped by year, so the full history
of all weeks and years stays on the site.

**To publish Monday's edition:**

1. Drop the PDF in `site/topigsnorsvin.mx/infotopigs/ediciones/`.
2. Add an entry at the top of the `entries` list in
   `site/topigsnorsvin.mx/infotopigs/entries.json`:
   ```json
   { "date": "2026-08-03",
     "title": "Título de la edición",
     "summary": "Resumen corto (opcional).",
     "url": "ediciones/2026-08-03-infotopigs.pdf" }
   ```
3. Rebuild and push:
   ```bash
   npm run build-infotopigs
   ```

The week number ("Semana 31") is derived from the date, so there's nothing to
count by hand — add `"week": 31` only if you ever need to override it. `url` can
also be an external link (Drive, Dropbox, …); those open in a new tab.

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
npm run build-infotopigs    # regenerate the Infotopigs page from entries.json
```

### Ecuador-specific edits live in a script, not just in the HTML

The daily news sync re-downloads pages from Mexico, so any change made only in
the mirrored HTML would be silently reverted. Site-wide Ecuador changes belong
in `scripts/apply-ecuador-content.mjs`, which the sync re-runs every night —
contact details, the Ecuador social links, and the Infotopigs nav tab are all
applied there.

## To do

See [TODO.md](TODO.md).
