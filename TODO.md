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

## 🔴 Private area for internal reports — blocked on a decision

`/informes/` is written but **switched off** (see README). The shared-Drive route
failed: Drive refuses to share with an address that has no Google account, and
every address on the request is Yahoo-hosted —
`jmartinez@`, `topigs@`, `mgonzalez@` (`@grupodelago.com` runs on Yahoo Business
Mail), `agrocastillo@yahoo.com`, and `anavarro@topigsnorsvin.com.ec` (own mail
server). None are Google accounts.

Remaining options:

| Option | Who has to sign up | Cost | Blocker |
|---|---|---|---|
| **Cloudflare Access** — email one-time codes | nobody | free (≤50 users) | needs the domain on Cloudflare, and the domain isn't live yet |
| **Hosting with logins + admin panel** (e.g. WordPress) | nobody | ~USD 10–30/mo | budget approval; also solves self-service weekly uploads |
| Shared Drive/OneDrive folder | everyone (one-time Google/Microsoft account) | free | refused today; needs 5 signups |
| JS password box | nobody | free | ❌ not security — password sits in the page source |

Bundled with the self-upload request in the reply to the team, since both need a
server and doing them together is one migration and one bill.

## 🔴 Domain is not live

- `topigsnirsvin.com.ec` (this repo's name) has **no nameservers** — nothing
  resolves. The site is only reachable at the github.io URL.
- `topigsnorsvin.com.ec` (correct spelling, matches `anavarro@`'s address) **is**
  registered, on `ns1/ns2.apolo.cloud`, pointing at `77.90.0.212`, and currently
  serves an empty "Index of /".

Need to confirm which domain is intended and who administers it. Cloudflare
Access can't be set up until this is settled.

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
