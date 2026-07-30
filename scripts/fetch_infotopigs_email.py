#!/usr/bin/env python3
"""Publish Infotopigs editions that arrive by email.

The team already sends the weekly bulletin as an image attachment. This reads a
mailbox over IMAP, finds unread mail from approved senders, and publishes each
attached bulletin by handing it to scripts/add-infotopigs.mjs.

Nothing is required of the senders: no account, no login, no subject format.
The week is worked out from the day the mail arrived — they send on Monday (or a
day or two later) for the week that just ended, so "the ISO week containing
<arrival date> minus 7 days" is right either way. A subject mentioning
"semana 31" overrides that, for the odd week sent out of step.

Stdlib only, so it runs on a bare GitHub Actions runner with no install step.

Environment:
  IMAP_HOST         e.g. imap.gmail.com          (required)
  IMAP_USER         mailbox login                (required)
  IMAP_PASS         app password                 (required)
  IMAP_PORT         default 993
  IMAP_MAILBOX      default INBOX
  ALLOWED_SENDERS   comma-separated addresses allowed to publish (required)
  SITE              default site/topigsnorsvin.mx

Flags:
  --dry-run   report what would happen; publish nothing, mark nothing as read
  --debug     list every folder and the newest messages in each; changes nothing
              (for "I sent it but nothing happened" — usually Spam or a typo)
"""
from __future__ import annotations

import email
import email.utils
import imaplib
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import date, timedelta
from email.header import decode_header, make_header
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SITE = Path(os.environ.get("SITE") or REPO / "site/topigsnorsvin.mx")
ENTRIES = SITE / "infotopigs" / "entries.json"

# Signature logos and tracking pixels ride along in most business email; the
# bulletin is a full-page infographic, so size alone separates them cleanly.
MIN_IMAGE_BYTES = 30_000
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".pdf")

DRY_RUN = "--dry-run" in sys.argv
DEBUG = "--debug" in sys.argv


def log(msg: str) -> None:
    print(msg, flush=True)


def need(name: str) -> str:
    v = os.environ.get(name, "").strip()
    if not v:
        sys.exit(f"fetch-infotopigs: falta la variable {name}")
    return v


def decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def week_for(arrived: date, subject: str) -> tuple[int, int, date, date]:
    """(week, iso_year, monday, sunday) for the edition in this message."""
    prior = arrived - timedelta(days=7)
    iso_year, iso_week, _ = prior.isocalendar()

    m = re.search(r"semana\s*(\d{1,2})", subject, re.I)
    if m:
        wanted = int(m.group(1))
        if 1 <= wanted <= 53:
            # Trust their number; keep the year that makes it land nearest the
            # mail, so a January "semana 52" still files under the old year.
            year = iso_year
            ym = re.search(r"\b(20\d{2})\b", subject)
            if ym:
                year = int(ym.group(1))
            elif wanted > iso_week + 4:
                year = iso_year - 1
            elif wanted + 4 < iso_week:
                year = iso_year + 1
            iso_week, iso_year = wanted, year

    try:
        monday = date.fromisocalendar(iso_year, iso_week, 1)
        sunday = date.fromisocalendar(iso_year, iso_week, 7)
    except ValueError:
        sys.exit(f"fetch-infotopigs: semana {iso_week} no existe en {iso_year}")
    return iso_week, iso_year, monday, sunday


def biggest_attachment(msg: email.message.Message) -> tuple[str, bytes] | None:
    """The bulletin: the largest image/PDF part above the noise threshold."""
    best: tuple[str, bytes] | None = None
    for part in msg.walk():
        if part.get_content_maintype() == "multipart":
            continue
        name = decode(part.get_filename()) or ""
        ctype = (part.get_content_type() or "").lower()
        if not (ctype.startswith("image/") or ctype == "application/pdf"
                or name.lower().endswith(IMAGE_EXT)):
            continue
        try:
            data = part.get_payload(decode=True) or b""
        except Exception:
            continue
        if len(data) < MIN_IMAGE_BYTES:
            continue
        ext = Path(name).suffix.lower()
        if ext not in IMAGE_EXT:
            ext = ".pdf" if ctype == "application/pdf" else "." + (ctype.split("/")[-1] or "jpg")
        if ext not in IMAGE_EXT:
            # e.g. image/heic straight off an iPhone — browsers can't show it,
            # so skipping (mail stays unread) beats publishing a broken image.
            continue
        if best is None or len(data) > len(best[1]):
            best = (ext, data)
    return best


def already_published(week: int, year: int) -> bool:
    if not ENTRIES.exists():
        return False
    data = json.loads(ENTRIES.read_text(encoding="utf-8"))
    for e in data.get("entries") or []:
        d = e.get("date") or ""
        e_year = str(e.get("year") or (d[:4] if len(d) >= 4 else ""))
        if int(e.get("week") or -1) == week and e_year == str(year):
            return True
    return False


def publish(path: Path, week: int, monday: date, sunday: date) -> None:
    cmd = [
        "node", str(REPO / "scripts" / "add-infotopigs.mjs"),
        "--site", str(SITE),
        "--file", str(path),
        "--week", str(week),
        "--from", monday.isoformat(),
        "--to", sunday.isoformat(),
    ]
    log("    " + " ".join(cmd[1:]))
    subprocess.run(cmd, cwd=REPO, check=True)


def debug_dump(M: imaplib.IMAP4_SSL) -> None:
    """Where did the mail actually land? Read-only tour of every folder."""
    typ, folders = M.list()
    names = []
    for raw in folders or []:
        line = raw.decode(errors="replace") if isinstance(raw, bytes) else str(raw)
        m = re.search(r'"([^"]*)"\s*$', line) or re.search(r'(\S+)\s*$', line)
        if m:
            names.append(m.group(1))
    log(f"  carpetas: {', '.join(names)}")

    for name in names:
        try:
            typ, data = M.select(f'"{name}"', readonly=True)
            if typ != "OK":
                continue
            total = int(data[0])
            typ, unseen = M.search(None, "UNSEEN")
            n_unseen = len(unseen[0].split()) if typ == "OK" else 0
        except Exception as exc:
            log(f"  [{name}] no se pudo abrir ({exc})")
            continue
        if not total:
            continue
        log(f"  [{name}] {total} mensaje(s), {n_unseen} sin leer")
        typ, ids = M.search(None, "ALL")
        for num in (ids[0].split() if typ == "OK" else [])[-6:]:
            typ, raw = M.fetch(num, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)])")
            if typ != "OK" or not raw or not isinstance(raw[0], tuple):
                continue
            hdr = email.message_from_bytes(raw[0][1])
            sender = email.utils.parseaddr(hdr.get("From") or "")[1]
            log(f"      · {sender or '(?)'} — {decode(hdr.get('Subject'))[:58]}"
                f"  [{decode(hdr.get('Date'))[:31]}]")


def warn_about_spam(M: imaplib.IMAP4_SSL, allowed: set[str]) -> int:
    """A bulletin filtered into Spam would otherwise fail completely silently.

    We deliberately do NOT publish from Spam — that folder is exactly where
    forged mail claiming to be an approved sender would land, and honouring it
    would undo the allowlist. So: notice it, say so loudly, and let a human
    move it or add a Gmail filter.
    """
    typ, folders = M.list()
    spam = []
    for raw in folders or []:
        line = raw.decode(errors="replace") if isinstance(raw, bytes) else str(raw)
        m = re.search(r'"([^"]*)"\s*$', line) or re.search(r'(\S+)\s*$', line)
        if m and re.search(r'(spam|junk)$', m.group(1), re.I):
            spam.append(m.group(1))

    stuck = 0
    for name in spam:
        try:
            if M.select(f'"{name}"', readonly=True)[0] != "OK":
                continue
            typ, ids = M.search(None, "UNSEEN")
            for num in (ids[0].split() if typ == "OK" else []):
                typ, raw = M.fetch(num, "(BODY.PEEK[HEADER.FIELDS (FROM SUBJECT)])")
                if typ != "OK" or not raw or not isinstance(raw[0], tuple):
                    continue
                hdr = email.message_from_bytes(raw[0][1])
                sender = email.utils.parseaddr(hdr.get("From") or "")[1].lower()
                if sender in allowed:
                    stuck += 1
                    log(f"::warning::Correo de {sender} está en {name} y no se publicará: "
                        f"«{decode(hdr.get('Subject'))[:50]}». Márquelo como 'no es spam' "
                        f"y cree un filtro para que no vuelva a pasar.")
        except Exception as exc:
            log(f"  no pude revisar {name}: {exc}")
    return stuck


def main() -> int:
    host, user, password = need("IMAP_HOST"), need("IMAP_USER"), need("IMAP_PASS")
    port = int(os.environ.get("IMAP_PORT") or 993)
    mailbox = os.environ.get("IMAP_MAILBOX") or "INBOX"
    allowed = {
        a.strip().lower()
        for a in need("ALLOWED_SENDERS").split(",")
        if a.strip()
    }

    log(f"fetch-infotopigs: {user}@{host}:{port} [{mailbox}]"
        + (" (dry-run)" if DRY_RUN else ""))
    log(f"  remitentes autorizados: {', '.join(sorted(allowed))}")

    published = 0
    with imaplib.IMAP4_SSL(host, port) as M:
        M.login(user, password)

        if DEBUG:
            debug_dump(M)
            return 0

        M.select(mailbox, readonly=DRY_RUN)
        typ, data = M.search(None, "UNSEEN")
        if typ != "OK":
            sys.exit("fetch-infotopigs: la búsqueda IMAP falló")
        ids = data[0].split()
        log(f"  {len(ids)} mensaje(s) sin leer")

        for num in ids:
            typ, raw = M.fetch(num, "(BODY.PEEK[])")
            if typ != "OK" or not raw or not isinstance(raw[0], tuple):
                log(f"  · {num.decode()}: no se pudo leer, lo dejo sin tocar")
                continue
            msg = email.message_from_bytes(raw[0][1])

            subject = decode(msg.get("Subject"))
            sender = email.utils.parseaddr(msg.get("From") or "")[1].lower()
            label = f"  · {sender or '(sin remitente)'} — {subject[:60] or '(sin asunto)'}"

            if sender not in allowed:
                log(f"{label}\n      remitente no autorizado, lo ignoro")
                continue

            try:
                arrived = email.utils.parsedate_to_datetime(msg.get("Date")).date()
            except Exception:
                arrived = date.today()

            att = biggest_attachment(msg)
            if att is None:
                log(f"{label}\n      sin imagen adjunta (>{MIN_IMAGE_BYTES // 1000} KB), lo dejo sin leer")
                continue

            week, year, monday, sunday = week_for(arrived, subject)
            log(f"{label}\n      semana {week} de {year} ({monday} .. {sunday}), {len(att[1]) // 1024} KB")

            if already_published(week, year):
                if DRY_RUN:
                    log("      ya estaba publicada; (dry-run) la dejaría sin leer")
                else:
                    log("      ya estaba publicada; marco el correo como leído")
                    M.store(num, "+FLAGS", "\\Seen")
                continue

            if DRY_RUN:
                log("      (dry-run) publicaría esta edición")
                published += 1
                continue

            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp) / f"infotopigs-semana-{week:02d}{att[0]}"
                path.write_bytes(att[1])
                publish(path, week, monday, sunday)

            # Only now: if publishing raised, the mail stays unread and the next
            # run retries it rather than losing the edition silently.
            M.store(num, "+FLAGS", "\\Seen")
            published += 1
            log("      publicada")

        stuck = warn_about_spam(M, allowed)

    log(f"fetch-infotopigs: {published} edición(es) publicada(s)"
        + (f", {stuck} atrapada(s) en Spam" if stuck else ""))

    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as fh:
            fh.write(f"published={published}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
