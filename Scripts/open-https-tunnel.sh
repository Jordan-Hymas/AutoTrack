#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
LOCAL_URL="http://127.0.0.1:${PORT}"
TOOLS_DIR="${HOME}/.autotrack-tools"
CLOUDFLARED_BIN="${TOOLS_DIR}/cloudflared"

if ! curl -fsS "${LOCAL_URL}" >/dev/null 2>&1; then
  echo "AutoTrack is not reachable at ${LOCAL_URL}."
  echo "Start the app first in another terminal with: npm run dev"
  exit 1
fi

echo "Opening temporary HTTPS tunnel for ${LOCAL_URL}"
echo "Keep this terminal open while testing on iPhone."
echo

if command -v cloudflared >/dev/null 2>&1; then
  echo "Using cloudflared tunnel..."
  exec cloudflared tunnel --url "${LOCAL_URL}"
fi

download_cloudflared_macos() {
  local arch url archive tmpdir
  arch="$(uname -m)"
  case "${arch}" in
    arm64)
      url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
      ;;
    x86_64)
      url="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
      ;;
    *)
      return 1
      ;;
  esac

  mkdir -p "${TOOLS_DIR}"
  archive="${TOOLS_DIR}/cloudflared.tgz"
  tmpdir="$(mktemp -d)"

  echo "Downloading cloudflared (${arch})..."
  if ! curl -fL --retry 3 --retry-delay 1 --connect-timeout 10 "${url}" -o "${archive}"; then
    echo "Failed to download cloudflared from GitHub."
    rm -rf "${tmpdir}"
    return 1
  fi

  if ! tar -xzf "${archive}" -C "${tmpdir}"; then
    echo "Failed to extract cloudflared archive."
    rm -rf "${tmpdir}"
    return 1
  fi

  if [[ ! -f "${tmpdir}/cloudflared" ]]; then
    echo "cloudflared binary not found in downloaded archive."
    rm -rf "${tmpdir}"
    return 1
  fi

  mv "${tmpdir}/cloudflared" "${CLOUDFLARED_BIN}"
  chmod +x "${CLOUDFLARED_BIN}"
  rm -rf "${tmpdir}"
}

if [[ -x "${CLOUDFLARED_BIN}" ]]; then
  echo "Using cached cloudflared tunnel..."
  exec "${CLOUDFLARED_BIN}" tunnel --url "${LOCAL_URL}"
fi

if [[ "$(uname -s)" == "Darwin" ]]; then
  if download_cloudflared_macos; then
    echo "Using downloaded cloudflared tunnel..."
    exec "${CLOUDFLARED_BIN}" tunnel --url "${LOCAL_URL}"
  fi
fi

echo "cloudflared unavailable. Falling back to localtunnel (npx)."
echo "If you see 503 from localtunnel, run again to get a fresh URL."
echo "This is temporary dev tooling only and does not affect VPS deploy."

if [[ -n "${LT_SUBDOMAIN:-}" ]]; then
  exec npx --yes localtunnel --port "${PORT}" --subdomain "${LT_SUBDOMAIN}" --host "https://loca.lt"
fi

exec npx --yes localtunnel --port "${PORT}" --host "https://loca.lt"
