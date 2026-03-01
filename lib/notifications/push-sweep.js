import webpush from "web-push";
import { getMaintenanceStats } from "../autotrack-model.js";
import {
  clearNotificationStage,
  getNotificationStateMap,
  getSnapshot,
  listPushSubscriptions,
  markPushDeliveryFailure,
  markPushDeliverySuccess,
  removePushSubscription,
  setNotificationStage
} from "../db/sqlite-storage.js";
import {
  buildServiceNotificationBody,
  getNotificationStage,
  getNotificationStageKey
} from "./maintenance-notifications.js";

const HIDDEN_NOTIFICATION_TITLE = "\u2060";
const DEFAULT_ICON = "/icons/white-icon-apple-touch.png";

let webPushConfigured = false;

function getVapidConfig() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@autotrack.local";

  return {
    publicKey: publicKey.trim(),
    privateKey: privateKey.trim(),
    subject: subject.trim()
  };
}

function ensureWebPushConfigured() {
  if (webPushConfigured) return true;
  const vapid = getVapidConfig();
  if (!vapid.publicKey || !vapid.privateKey) return false;

  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  webPushConfigured = true;
  return true;
}

async function sendPayloadToSubscriptions(payload, subscriptions) {
  let sentCount = 0;
  let failedCount = 0;
  let removedCount = 0;

  for (const row of subscriptions) {
    const subscription = row?.subscription;
    const endpoint = row?.endpoint;
    if (!subscription || !endpoint) continue;

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload), {
        TTL: 60 * 60,
        urgency: "high"
      });
      sentCount += 1;
      await markPushDeliverySuccess(endpoint);
    } catch (error) {
      failedCount += 1;
      await markPushDeliveryFailure(endpoint);

      const statusCode = Number(error?.statusCode) || 0;
      if (statusCode === 404 || statusCode === 410) {
        await removePushSubscription(endpoint);
        removedCount += 1;
      }
    }
  }

  return { sentCount, failedCount, removedCount };
}

export function getPushRuntimeStatus() {
  const vapid = getVapidConfig();
  return {
    hasPublicKey: Boolean(vapid.publicKey),
    hasPrivateKey: Boolean(vapid.privateKey),
    ready: Boolean(vapid.publicKey && vapid.privateKey)
  };
}

export async function runPushNotificationSweep(options = {}) {
  const nowMs = Number.isFinite(options.nowMs) ? options.nowMs : Date.now();
  const dryRun = options.dryRun === true;
  const status = getPushRuntimeStatus();
  const pushReady = status.ready ? ensureWebPushConfigured() : false;

  const [{ snapshot }, subscriptions, notificationState] = await Promise.all([
    getSnapshot(),
    listPushSubscriptions(),
    getNotificationStateMap()
  ]);

  const vehicles = Array.isArray(snapshot?.state?.vehicles) ? snapshot.state.vehicles : [];
  const appIcon = snapshot?.settings?.pwaSettings?.appIcon || DEFAULT_ICON;

  let checks = 0;
  let stageUpdates = 0;
  let clearedStages = 0;
  let sentCount = 0;
  let failedCount = 0;
  let removedCount = 0;

  for (const vehicle of vehicles) {
    const stats = getMaintenanceStats(vehicle, nowMs);
    const checksForVehicle = [
      {
        maintenanceType: "oil_change",
        remainingMs: stats.oilRemainingMs,
        dueDateISO: stats.oilDueDateISO,
        windowMs: stats.oilWindowMs
      },
      {
        maintenanceType: "tire_rotation",
        remainingMs: stats.tireRemainingMs,
        dueDateISO: stats.tireDueDateISO,
        windowMs: stats.tireWindowMs
      }
    ];

    for (const item of checksForVehicle) {
      checks += 1;
      const mapKey = `${vehicle.id}:${item.maintenanceType}`;
      const stage = getNotificationStage(item.remainingMs, item.windowMs);

      if (!stage) {
        if (!notificationState[mapKey]) continue;
        if (!dryRun) {
          await clearNotificationStage(vehicle.id, item.maintenanceType);
        }
        delete notificationState[mapKey];
        clearedStages += 1;
        continue;
      }

      const stageKey = getNotificationStageKey(stage, item.dueDateISO);
      if (notificationState[mapKey] === stageKey) {
        continue;
      }

      if (!pushReady || subscriptions.length === 0) {
        continue;
      }

      const payload = {
        title: HIDDEN_NOTIFICATION_TITLE,
        body: buildServiceNotificationBody({
          vehicleName: vehicle.name,
          maintenanceType: item.maintenanceType,
          stage,
          remainingMs: item.remainingMs,
          dueDateISO: item.dueDateISO
        }),
        icon: appIcon,
        url: "/"
      };

      if (dryRun) {
        sentCount += subscriptions.length;
        continue;
      }

      const sendResult = await sendPayloadToSubscriptions(payload, subscriptions);
      sentCount += sendResult.sentCount;
      failedCount += sendResult.failedCount;
      removedCount += sendResult.removedCount;

      if (sendResult.sentCount > 0) {
        await setNotificationStage(vehicle.id, item.maintenanceType, stageKey);
        notificationState[mapKey] = stageKey;
        stageUpdates += 1;
      }
    }
  }

  return {
    ok: true,
    ready: pushReady,
    subscriptions: subscriptions.length,
    checks,
    sentCount,
    failedCount,
    removedCount,
    stageUpdates,
    clearedStages,
    dryRun
  };
}
