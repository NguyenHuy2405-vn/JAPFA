cp -r public .next/standalone/apps/japfa-payload 2>/dev/null || true

cp -r .next/static .next/standalone/apps/japfa-payload/.next 2>/dev/null || true

node .next/standalone/apps/japfa-payload/server.js
