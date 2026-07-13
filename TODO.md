# TODO — before/after going live

## 🔴 Replace Mexico info with Ecuador info

The copy still carries the **Mexico branch's** contact details (it's their
content). These must be changed to the Ecuador office before this represents the
Ecuador branch.

**What to change (current → needs Ecuador equivalent):**

| Field | Current (Mexico) value |
|-------|------------------------|
| Address | Blvd. Anacleto González Flores #945-1, Colonia Centro, C.P. 47600, Tepatitlán de Morelos, Jalisco |
| Phone | 0052 378 782 6200 |
| Email | comunicacion@topigsnorsvin.com.mx |
| Website ref | www.topigsnorsvin.mx |

**Where it appears:**
- The **footer of every page** (~117 pages under `site/topigsnorsvin.mx/`).
- The **Contacto** page: `site/topigsnorsvin.mx/contact/contacto/index.html`.

> Because it's in the shared footer, this is a global find-and-replace. Give me
> the real Ecuador address / phone / email and I'll swap all of them in one pass.

## 🟡 Point the form at the real inbox

- Forms are wired to **Web3Forms** (access key in
  `site/topigsnorsvin.mx/form-handler.js`), tested working.
- The **recipient email is set on the web3forms.com dashboard**, not in code.
  When ready, change it there to the real Ecuador inbox (no code change needed).

## 🟢 Optional / review

- "Elija su país" menu + social links still point to the global/other-region
  Topigs Norsvin accounts — decide whether to keep, change, or remove.
- Confirm the domain `topigsnirsvin.com.ec` DNS + GitHub Pages custom domain.
