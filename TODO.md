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

## 🔴 Private area for internal reports — built, one thing left

`/informes/` is live in the repo: a page explaining the section, linking to the
shared Drive folder that holds the reports, linked from every page's footer.
Chosen over Cloudflare Access because the team manages its own Drive
permissions — nobody has to email us to add or remove a colleague.

**Before this goes public, confirm in Drive:** the folder must be **"Restricted"**
(specific people), *not* "Anyone with the link". The website is public, so the
link is visible to anyone — the folder's own setting is the only thing keeping
the reports private.

People on the original request, to share the folder with:

| Name | Email |
|---|---|
| Jimena (technical team) | `jmartinez@grupodelago.com` |
| Mauricio Castillo | `topigs@grupodelago.com` |
| Yolanda Herrera | `agrocastillo@yahoo.com` |
| Mirza González | `mgonzalez@grupodelago.com` |
| Andrea Navarro | `anavarro@topigsnorsvin.com.ec` |

Rejected: a JS password box — the password sits in the page source, so it is not
security. Still available if they ever want the files served from our own domain:
Cloudflare Access (free, but needs the domain's DNS moved to Cloudflare).

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
