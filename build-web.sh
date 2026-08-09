#!/usr/bin/env bash
# Assemble the static TTM dashboard (web/) into public/ for Vercel.
# The C# application is untouched — this only ships the browser dashboard.
set -euo pipefail
cd "$(dirname "$0")"

rm -rf public
mkdir -p public
cp -r web/. public/

# Inject Supabase credentials from Vercel env vars (same shared project as
# the other TTM sites; this dashboard's tables are prefixed ohm_). Unset
# vars leave the placeholders, and the stack runs in local-only mode.
# Injection runs through node string-replacement, not sed: env values pasted
# with trailing newlines or containing sed delimiters must not break builds.
if [ -n "${SUPABASE_URL:-}" ] || [ -n "${SUPABASE_ANON_KEY:-}" ]; then
  node -e '
    const fs = require("fs");
    const f = "public/ttm/config.js";
    let s = fs.readFileSync(f, "utf8");
    const url = (process.env.SUPABASE_URL || "").trim();
    const key = (process.env.SUPABASE_ANON_KEY || "").trim();
    if (url) s = s.replace("%SUPABASE_URL%", () => url);
    if (key) s = s.replace("%SUPABASE_ANON_KEY%", () => key);
    fs.writeFileSync(f, s);
  '
fi

echo "build-web: $(find public -type f | wc -l) files staged in public/"
