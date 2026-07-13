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
```

## To do

See [TODO.md](TODO.md) — mainly: replace the Mexico office contact details with
the real Ecuador ones (they appear in the footer of every page).
