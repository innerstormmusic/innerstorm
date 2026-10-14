#!/usr/bin/env bash
# Rebuilds the local R2 emulation (used by `npm run dev`) from docs/samples, which mirrors the live
# bucket: docs/samples/{tracks,mixes,calendar}/*.mp3 -> innerstorm-media/<folder>/<file>.
# Only touches .wrangler/state in this project; the real bucket is never contacted (--local).
set -euo pipefail

cd "$(dirname "$0")/.."
SAMPLES=docs/samples
BUCKET=innerstorm-media
STATE=.wrangler/state/v3

if [ ! -d "$SAMPLES" ]; then
  echo "No $SAMPLES folder; put tracks/, mixes/ and calendar/ with MP3s in it." >&2
  exit 1
fi

# Start from an empty bucket and drop cached track lists, tags and covers.
rm -rf "$STATE/r2" "$STATE/cache"

count=0
failed=()
for folder in tracks mixes calendar; do
  [ -d "$SAMPLES/$folder" ] || continue
  while IFS= read -r -d '' file; do
    key="$folder/${file#"$SAMPLES/$folder/"}"
    echo "  $key"
    # A file that fails to upload is reported at the end instead of stopping the run.
    if WRANGLER_SEND_METRICS=false npx wrangler r2 object put "$BUCKET/$key" \
      --file "$file" --content-type audio/mpeg --local >/dev/null 2>&1; then
      count=$((count + 1))
    else
      failed+=("$key")
    fi
  done < <(find "$SAMPLES/$folder" -type f -iname '*.mp3' -print0 | sort -z)
done

echo "Local bucket now holds $count MP3s. Restart \`npm run dev\` if it's running."
if [ ${#failed[@]} -gt 0 ]; then
  echo "Not uploaded:" >&2
  printf '  %s\n' "${failed[@]}" >&2
fi
