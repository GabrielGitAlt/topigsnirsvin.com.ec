# TODO — before/after going live

## ✅ Done

- **Ecuador contact details** — address, phones and email replaced site-wide
  (Topswine Cía. Ltda., Puembo/Quito). Applied by
  `scripts/apply-ecuador-content.mjs`, so the nightly news sync can't revert it.
- **Social links** → the Ecuador accounts (Facebook / Instagram / LinkedIn) on
  all 118 pages. Also in `apply-ecuador-content.mjs`.
- **Infotopigs tab** — new weekly section with the full year-by-year archive.
  See the README for how to publish each Monday's edition.
- **Líneas de machos** — only **TN Duroc** and **TN Tempo** are listed. TN Rex
  and TN Select removed from `productos/index.html`.

## 🔴 Pending — private area for internal reports

A restricted section to host internal reports was requested, along with options
for how to implement it. The site is **static on GitHub Pages**, which has no
server and no real login, so the choice is between:

| Option | Real security | Cost | Effort |
|---|---|---|---|
| Password page in JS (password sits in the page source) | ❌ none — trivially bypassed | free | low |
| Cloudflare Access in front of `/privado/` (email one-time codes / Google login) | ✅ real | free tier | medium — needs the domain on Cloudflare |
| Netlify / Vercel password protection | ✅ real | paid tier | low — but moves hosting off GitHub Pages |
| Shared Google Drive / SharePoint folder, linked from the site | ✅ real | free | lowest |

**Waiting on a decision before building.** The JS-password option must not be
presented as secure — anyone can read the password in the page source.

## 🟡 Notes / review

- **YouTube icon** on `se-acerca-una-tormenta/` still points at the global
  Topigs Norsvin channel — no Ecuador channel was provided. Change it if one
  exists.
- Four mirrored **news articles** still show a Mexico press contact
  (`paloma.lazcano@topigsnorsvin.com.mx`). That is the body text of those
  articles, not our own contact info — left as published.
- **Web3Forms recipient** is set on the web3forms.com dashboard, not in the
  repo. Confirm it points at the real Ecuador inbox.
- Confirm the domain `topigsnirsvin.com.ec` DNS + GitHub Pages custom domain.
