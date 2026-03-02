#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/AutoTrack}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
DB_PATH="${DB_PATH:-$APP_DIR/.data/autotrack.sqlite}"
APP_HOST="${APP_HOST:-127.0.0.1}"
APP_PORT="${APP_PORT:-4001}"
API_LOCAL="http://${APP_HOST}:${APP_PORT}"
SWEEP_SERVICE="${SWEEP_SERVICE:-autotrack-sweep.service}"
SWEEP_TIMER="${SWEEP_TIMER:-autotrack-sweep.timer}"
APP_SERVICE="${APP_SERVICE:-autotrack.service}"
AUTO_PRUNE="${PUSH_GUARD_AUTO_PRUNE:-1}"

die() {
  echo "ERROR: $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    exec sudo "$0" "$@"
  fi
}

prepare_runtime() {
  [[ -d "$APP_DIR" ]] || die "Missing app directory: $APP_DIR"
  cd "$APP_DIR" || die "Failed to cd into $APP_DIR"
}

ensure_node_push_deps() {
  [[ -d "$APP_DIR/node_modules" ]] || die "Missing $APP_DIR/node_modules. Run: cd $APP_DIR && npm ci"
  if ! node <<'NODE' >/dev/null 2>&1
require.resolve("web-push");
require.resolve("better-sqlite3");
NODE
  then
    die "Missing Node deps in $APP_DIR. Run: cd $APP_DIR && npm ci"
  fi
}

load_env() {
  [[ -f "$ENV_FILE" ]] || die "Missing env file: $ENV_FILE"
  set -a
  # shellcheck source=/dev/null
  . "$ENV_FILE"
  set +a
  [[ -n "${VAPID_PUBLIC_KEY:-}" ]] || die "VAPID_PUBLIC_KEY missing in $ENV_FILE"
  [[ -n "${VAPID_PRIVATE_KEY:-}" ]] || die "VAPID_PRIVATE_KEY missing in $ENV_FILE"
  [[ -n "${VAPID_SUBJECT:-}" ]] || die "VAPID_SUBJECT missing in $ENV_FILE"
  [[ -n "${AUTOTRACK_CRON_SECRET:-}" ]] || die "AUTOTRACK_CRON_SECRET missing in $ENV_FILE"
}

api_get() {
  local path="$1"
  curl -sS "${API_LOCAL}${path}"
}

api_post() {
  local path="$1"
  curl -sS -X POST \
    -H "x-autotrack-cron-secret: ${AUTOTRACK_CRON_SECRET}" \
    "${API_LOCAL}${path}"
}

ensure_units() {
  local sweep_url="http://${APP_HOST}:${APP_PORT}/api/push/sweep"

  cat >/etc/systemd/system/${SWEEP_SERVICE} <<EOF
[Unit]
Description=AutoTrack Push Sweep
After=network-online.target ${APP_SERVICE}
Wants=network-online.target
Requires=${APP_SERVICE}

[Service]
Type=oneshot
EnvironmentFile=${ENV_FILE}
ExecStart=/bin/bash -lc 'exec /usr/bin/curl --retry 5 --retry-delay 2 --retry-connrefused --max-time 20 -sS -o /dev/null -X POST "${sweep_url}" -H "x-autotrack-cron-secret: \${AUTOTRACK_CRON_SECRET}"'
EOF

  cat >/etc/systemd/system/${SWEEP_TIMER} <<EOF
[Unit]
Description=Run AutoTrack Push Sweep Every Minute

[Timer]
OnCalendar=*-*-* *:*:00
Persistent=true
Unit=${SWEEP_SERVICE}

[Install]
WantedBy=timers.target
EOF

  systemctl daemon-reload
  systemctl enable --now "${SWEEP_TIMER}"
}

wipe_push_state() {
  ensure_node_push_deps
  [[ -f "$DB_PATH" ]] || die "Missing sqlite DB: $DB_PATH"
  cp -f "$DB_PATH" "$DB_PATH.bak.$(date +%s)"

  export DB_PATH VAPID_PUBLIC_KEY
  node <<'NODE'
const Database = require("better-sqlite3");

const db = new Database(process.env.DB_PATH);
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const now = new Date().toISOString();

const beforeSubs = db.prepare("SELECT COUNT(*) AS c FROM push_subscriptions").get().c;
const beforeState = db.prepare("SELECT COUNT(*) AS c FROM notification_state").get().c;

db.prepare(`
  INSERT INTO app_settings (id, selected_vehicle_id, theme_preference, pwa_settings_json, vapid_public_key, last_tab, updated_at)
  VALUES (1, NULL, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    vapid_public_key = excluded.vapid_public_key,
    updated_at = excluded.updated_at
`).run("light", "{}", vapidPublicKey, "dashboard", now);

db.prepare("DELETE FROM push_subscriptions").run();
db.prepare("DELETE FROM notification_state").run();

const afterSubs = db.prepare("SELECT COUNT(*) AS c FROM push_subscriptions").get().c;
const afterState = db.prepare("SELECT COUNT(*) AS c FROM notification_state").get().c;
const dbKey = db.prepare("SELECT vapid_public_key FROM app_settings WHERE id = 1").get()?.vapid_public_key || "";

console.log("before push_subscriptions:", beforeSubs);
console.log("before notification_state:", beforeState);
console.log("after push_subscriptions:", afterSubs);
console.log("after notification_state:", afterState);
console.log("db key matches env:", dbKey === vapidPublicKey);
db.close();
NODE
}

prune_stale_subscriptions() {
  ensure_node_push_deps
  export DB_PATH VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT
  node <<'NODE'
const webpush = require("web-push");
const Database = require("better-sqlite3");

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const db = new Database(process.env.DB_PATH);
const rows = db.prepare("SELECT endpoint, subscription_json FROM push_subscriptions").all();

let ok = 0;
let failed = 0;
let removed = 0;

function shouldRemove(statusCode, body) {
  if (statusCode === 404 || statusCode === 410) return true;
  if (statusCode === 400 && String(body || "").includes("VapidPkHashMismatch")) return true;
  return false;
}

(async () => {
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        JSON.parse(row.subscription_json),
        JSON.stringify({
          title: "\u2060",
          body: "AutoTrack endpoint health probe",
          icon: "/icons/white-icon-apple-touch.png",
          url: "/"
        }),
        { TTL: 60, urgency: "high" }
      );
      ok += 1;
    } catch (error) {
      failed += 1;
      const statusCode = Number(error?.statusCode || 0);
      const body = String(error?.body || "");
      if (shouldRemove(statusCode, body)) {
        db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(row.endpoint);
        removed += 1;
      }
    }
  }

  const remaining = db.prepare("SELECT COUNT(*) AS c FROM push_subscriptions").get().c;
  console.log(JSON.stringify({ ok, failed, removed, remaining }));
  db.close();
})();
NODE
}

send_direct_test() {
  ensure_node_push_deps
  export DB_PATH VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT
  node <<'NODE'
const webpush = require("web-push");
const Database = require("better-sqlite3");

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const db = new Database(process.env.DB_PATH);
const rows = db.prepare("SELECT endpoint, subscription_json FROM push_subscriptions").all();

let sent = 0;
let failed = 0;
const errors = [];

(async () => {
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        JSON.parse(row.subscription_json),
        JSON.stringify({
          title: "\u2060",
          body: "AutoTrack direct test push",
          icon: "/icons/white-icon-apple-touch.png",
          url: "/"
        }),
        { TTL: 3600, urgency: "high" }
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      errors.push({
        endpoint: row.endpoint,
        statusCode: Number(error?.statusCode || 0),
        message: error?.message || "Unknown push send error",
        body: String(error?.body || "")
      });
    }
  }

  console.log(JSON.stringify({ subscriptions: rows.length, sent, failed, errors }, null, 2));
  db.close();
})();
NODE
}

show_status() {
  echo "=== ENV (lengths) ==="
  echo "VAPID_PUBLIC_KEY length: ${#VAPID_PUBLIC_KEY}"
  echo "AUTOTRACK_CRON_SECRET length: ${#AUTOTRACK_CRON_SECRET}"
  echo

  echo "=== API (local) ==="
  api_get "/api/push/config"; echo
  api_get "/api/push/subscribe"; echo
  echo

  echo "=== SWEEP DRY RUN (local) ==="
  api_post "/api/push/sweep?dryRun=1"; echo
  echo

  echo "=== SYSTEMD ==="
  systemctl status "${APP_SERVICE}" --no-pager | sed -n "1,12p"
  systemctl status "${SWEEP_TIMER}" --no-pager | sed -n "1,12p"
  systemctl status "${SWEEP_SERVICE}" -l --no-pager | sed -n "1,12p"
}

maybe_auto_prune() {
  if [[ "$AUTO_PRUNE" == "1" ]]; then
    echo "=== AUTO PRUNE ==="
    prune_stale_subscriptions
    echo
  fi
}

restart_runtime() {
  systemctl daemon-reload
  systemctl restart "${APP_SERVICE}"
  systemctl enable --now "${SWEEP_TIMER}"
  systemctl start "${SWEEP_SERVICE}" || true
}

usage() {
  cat <<'EOF'
Usage: autotrack-push-guard.sh [--auto-prune|--no-auto-prune] <command>

Commands:
  reset    Force DB VAPID key from env, wipe subscriptions/state, restart services
  prune    Remove stale subscriptions (VapidPkHashMismatch, 404, 410)
  status   Show push readiness, subscription count, dry-run sweep, and systemd health
  test     Send direct test push to every subscription and print per-endpoint results
  sweep    Execute one real sweep against local API
  doctor   Run prune, status, test, and sweep in sequence
  units    Re-write and enable systemd sweep unit + timer
EOF
}

main() {
  local cmd=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --auto-prune)
        AUTO_PRUNE="1"
        ;;
      --no-auto-prune)
        AUTO_PRUNE="0"
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        if [[ -z "$cmd" ]]; then
          cmd="$1"
        else
          die "Unexpected argument: $1"
        fi
        ;;
    esac
    shift
  done

  [[ -n "$cmd" ]] || die "Missing command. Use --help."

  case "$cmd" in
    units)
      ensure_units
      restart_runtime
      show_status
      ;;
    reset)
      ensure_units
      wipe_push_state
      restart_runtime
      show_status
      ;;
    prune)
      prune_stale_subscriptions
      ;;
    status)
      maybe_auto_prune
      show_status
      ;;
    test)
      maybe_auto_prune
      send_direct_test
      ;;
    sweep)
      maybe_auto_prune
      api_post "/api/push/sweep"
      echo
      ;;
    doctor)
      maybe_auto_prune
      show_status
      echo
      echo "=== DIRECT TEST ==="
      send_direct_test
      echo
      echo "=== REAL SWEEP ==="
      api_post "/api/push/sweep"
      echo
      ;;
    *)
      die "Unknown command: $cmd"
      ;;
  esac
}

need_cmd node
need_cmd curl
need_cmd systemctl
require_root "$@"
prepare_runtime
load_env
main "$@"
