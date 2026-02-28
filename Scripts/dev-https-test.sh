#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
LOCAL_URL="http://127.0.0.1:${PORT}"
DEV_PID=""

cleanup() {
  if [[ -n "${DEV_PID}" ]] && kill -0 "${DEV_PID}" >/dev/null 2>&1; then
    kill "${DEV_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting Next.js dev server on ${HOST}:${PORT}..."
npm run dev -- --hostname "${HOST}" --port "${PORT}" &
DEV_PID=$!

echo "Waiting for app to be reachable at ${LOCAL_URL}..."
for _ in $(seq 1 60); do
  if curl -fsS "${LOCAL_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

if ! curl -fsS "${LOCAL_URL}" >/dev/null 2>&1; then
  echo "Dev server did not start in time."
  exit 1
fi

echo
echo "Dev server is up. Opening HTTPS tunnel..."
echo
bash Scripts/open-https-tunnel.sh
