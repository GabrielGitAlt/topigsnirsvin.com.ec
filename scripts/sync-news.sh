#!/usr/bin/env bash
# Pull the latest news from topigsnorsvin.mx into this site and re-apply all the
# Ecuador transforms, so new Mexico articles appear here automatically.
# Run by .github/workflows/sync-news.yml (daily) — or manually: bash scripts/sync-news.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/site/topigsnorsvin.mx"
TMP="$(mktemp -d)"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

echo "==> Mirroring news from topigsnorsvin.mx ..."
httrack \
  "https://topigsnorsvin.mx/noticias/" \
  "https://topigsnorsvin.mx/post-sitemap.xml" \
  -O "$TMP" -F "$UA" -n -c6 -A100000000 -q "-%v0" \
  '+*topigsnorsvin.mx/news/*' \
  '+*topigsnorsvin.mx/noticias/*' \
  '+*topigsnorsvin.mx/wp-content/*' \
  '+*topigsnorsvin.mx/tn-content/*' \
  '+*topigsnorsvin.mx/wp-includes/*' \
  '-*topigsnorsvin.mx/wp-json/*' '-*replytocom*' '-*/feed/*' || true

SRC="$TMP/topigsnorsvin.mx"
if [ ! -d "$SRC/news" ]; then
  echo "!! mirror produced no news/ directory — aborting without changes"
  rm -rf "$TMP"; exit 1
fi

echo "==> Copying news pages + new assets into the site ..."
rsync -a "$SRC/news/" "$SITE/news/"
rsync -a "$SRC/noticias/" "$SITE/noticias/"
for d in wp-content tn-content wp-includes; do
  [ -d "$SRC/$d" ] && rsync -a --ignore-existing "$SRC/$d/" "$SITE/$d/" || true
done

echo "==> Applying transforms ..."
node "$ROOT/scripts/prepare-site.js"
node "$ROOT/scripts/localize-assets.js"
node "$ROOT/scripts/relativize-paths.mjs" "$SITE"
node "$ROOT/scripts/apply-ecuador-content.mjs" "$SITE"
node "$ROOT/scripts/add-lazy-loading.mjs" "$SITE"

# Match the injected form-handler cache version to the rest of the site.
VER="$(grep -oE 'form-handler\.js\?v=[0-9]+' "$SITE/index.html" | grep -oE '[0-9]+' | head -1 || echo 8)"
find "$SITE" -name '*.html' -print0 | xargs -0 perl -pi -e "s/form-handler\.(js|css)\?v=\d+/form-handler.\$1?v=${VER}/g"

rm -rf "$TMP"
echo "==> News sync complete (form-handler v=${VER})."
