import { runPushNotificationSweep } from "./push-sweep.js";

const GLOBAL_SCHEDULER_KEY = "__autotrack_push_scheduler_v1";

function getIntervalMs() {
  const raw = Number.parseInt(process.env.AUTOTRACK_INTERNAL_SWEEP_INTERVAL_MS || "", 10);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 15 * 1000;
  }
  return Math.max(10 * 1000, raw);
}

export function ensurePushSweepScheduler() {
  if (process.env.AUTOTRACK_DISABLE_INTERNAL_SWEEP === "1") {
    return false;
  }

  const globalScope = globalThis;
  if (globalScope[GLOBAL_SCHEDULER_KEY]) {
    return true;
  }

  const intervalMs = getIntervalMs();
  const timer = setInterval(() => {
    runPushNotificationSweep().catch(() => {
      // Keep scheduler alive across transient push/network errors.
    });
  }, intervalMs);

  if (typeof timer.unref === "function") {
    timer.unref();
  }

  // Warm up quickly so closed-app notifications don't wait for first interval tick.
  setTimeout(() => {
    runPushNotificationSweep().catch(() => {
      // Ignore warmup failures; interval continues.
    });
  }, 2500);

  globalScope[GLOBAL_SCHEDULER_KEY] = { timer, intervalMs, startedAt: Date.now() };
  return true;
}
