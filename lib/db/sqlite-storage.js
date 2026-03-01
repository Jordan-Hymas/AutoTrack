import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { createInitialState } from "../autotrack-model.js";

const DB_DIR = process.env.AUTOTRACK_DB_DIR
  ? path.resolve(process.env.AUTOTRACK_DB_DIR)
  : path.join(process.cwd(), ".data");
const DB_PATH = path.join(DB_DIR, "autotrack.sqlite");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");
const APP_ICON_SETS = [
  {
    appleTouch: "/icons/apple-touch-icon.png",
    icon192: "/icons/icon-192.png",
    icon512: "/icons/icon-512.png"
  },
  {
    appleTouch: "/icons/white-icon-apple-touch.png",
    icon192: "/icons/white-icon-192.png",
    icon512: "/icons/white-icon-512.png",
    legacyOriginal: "/icons/whiteIcon.png"
  }
];
const DEFAULT_PWA_ICON = APP_ICON_SETS[1].appleTouch;
const DEFAULT_PWA_SETTINGS = {
  launchTab: "dashboard",
  resumeLastTab: true,
  offlineReady: true,
  pushAlerts: false,
  appIcon: DEFAULT_PWA_ICON
};

let dbInstance;
let schemaCache;

function nowISO() {
  return new Date().toISOString();
}

function getSchemaSql() {
  if (!schemaCache) {
    schemaCache = fs.readFileSync(SCHEMA_PATH, "utf8");
  }
  return schemaCache;
}

function getDb() {
  if (dbInstance) return dbInstance;
  fs.mkdirSync(DB_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");
  db.exec(getSchemaSql());
  dbInstance = db;
  return dbInstance;
}

function parseJson(value, fallback) {
  if (!value || typeof value !== "string") return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeThemePreference(value) {
  return value === "dark" || value === "system" ? value : "light";
}

function isValidMaintenanceType(value) {
  return value === "oil_change" || value === "tire_rotation";
}

function normalizeAppIconPath(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return DEFAULT_PWA_ICON;

  const matchedSet = APP_ICON_SETS.find(
    (iconSet) =>
      iconSet.appleTouch === normalized ||
      iconSet.icon192 === normalized ||
      iconSet.icon512 === normalized ||
      iconSet.legacyOriginal === normalized
  );
  return matchedSet ? matchedSet.appleTouch : DEFAULT_PWA_ICON;
}

function normalizePwaSettings(value) {
  const parsed = value && typeof value === "object" ? value : {};
  return {
    launchTab: typeof parsed.launchTab === "string" ? parsed.launchTab : DEFAULT_PWA_SETTINGS.launchTab,
    resumeLastTab:
      typeof parsed.resumeLastTab === "boolean"
        ? parsed.resumeLastTab
        : DEFAULT_PWA_SETTINGS.resumeLastTab,
    offlineReady:
      typeof parsed.offlineReady === "boolean" ? parsed.offlineReady : DEFAULT_PWA_SETTINGS.offlineReady,
    pushAlerts: typeof parsed.pushAlerts === "boolean" ? parsed.pushAlerts : DEFAULT_PWA_SETTINGS.pushAlerts,
    appIcon: normalizeAppIconPath(parsed.appIcon)
  };
}

export function buildDefaultSnapshot() {
  return {
    state: createInitialState(),
    calendarEvents: {},
    settings: {
      themePreference: "light",
      pwaSettings: { ...DEFAULT_PWA_SETTINGS },
      vapidPublicKey: "",
      autoNotificationState: {},
      lastTab: "dashboard"
    }
  };
}

function normalizeSnapshot(input) {
  const fallback = buildDefaultSnapshot();
  const source = input && typeof input === "object" ? input : {};
  const sourceState = source.state && typeof source.state === "object" ? source.state : {};
  const vehicles = Array.isArray(sourceState.vehicles) ? sourceState.vehicles : fallback.state.vehicles;
  const history = Array.isArray(sourceState.history) ? sourceState.history : [];
  const selectedVehicleId =
    typeof sourceState.selectedVehicleId === "string"
      ? sourceState.selectedVehicleId
      : fallback.state.selectedVehicleId;
  const calendarEvents =
    source.calendarEvents && typeof source.calendarEvents === "object" && !Array.isArray(source.calendarEvents)
      ? source.calendarEvents
      : {};
  const settings = source.settings && typeof source.settings === "object" ? source.settings : {};
  const autoNotificationState =
    settings.autoNotificationState &&
    typeof settings.autoNotificationState === "object" &&
    !Array.isArray(settings.autoNotificationState)
      ? settings.autoNotificationState
      : {};

  return {
    state: {
      vehicles,
      history,
      selectedVehicleId
    },
    calendarEvents,
    settings: {
      themePreference: normalizeThemePreference(settings.themePreference),
      pwaSettings: normalizePwaSettings(settings.pwaSettings),
      vapidPublicKey: typeof settings.vapidPublicKey === "string" ? settings.vapidPublicKey : "",
      autoNotificationState,
      lastTab: typeof settings.lastTab === "string" ? settings.lastTab : "dashboard"
    }
  };
}

function dbRowsToSnapshot(db) {
  const vehicleRows = db
    .prepare(
      `SELECT
        id,
        name,
        image_path,
        image_scale,
        image_shift_x,
        odometer,
        oil_interval_miles,
        tire_interval_miles,
        oil_interval_months,
        tire_interval_months,
        last_oil_change_odometer,
        last_tire_rotation_odometer,
        last_oil_change_at,
        last_tire_rotation_at,
        oil_due_override_at,
        tire_due_override_at,
        created_at,
        updated_at
       FROM vehicles
       ORDER BY sort_order ASC`
    )
    .all();

  const historyRows = db
    .prepare(
      `SELECT id, vehicle_id, event_type, mileage, details, occurred_at
       FROM history_events
       ORDER BY occurred_at DESC`
    )
    .all();

  const reminderRows = db
    .prepare(
      `SELECT
        id,
        vehicle_id,
        service_type,
        scheduled_for,
        title,
        location,
        remind_lead,
        created_at,
        updated_at
       FROM service_reminders
       ORDER BY scheduled_for ASC`
    )
    .all();

  const setting = db
    .prepare(
      `SELECT
        selected_vehicle_id,
        theme_preference,
        pwa_settings_json,
        vapid_public_key,
        last_tab
       FROM app_settings
       WHERE id = 1`
    )
    .get();

  const notificationRows = db
    .prepare(
      `SELECT vehicle_id, maintenance_type, stage_key
       FROM notification_state`
    )
    .all();

  const calendarEvents = {};
  for (const row of reminderRows) {
    const event = {
      id: String(row.id),
      vehicleId: String(row.vehicle_id),
      dateISO: String(row.scheduled_for),
      title: String(row.title),
      location: String(row.location),
      serviceType: String(row.service_type),
      remindLead: String(row.remind_lead),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
    if (!calendarEvents[event.vehicleId]) {
      calendarEvents[event.vehicleId] = [];
    }
    calendarEvents[event.vehicleId].push(event);
  }

  const stateVehicles = vehicleRows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    image: String(row.image_path),
    imageScale: row.image_scale === null ? undefined : Number(row.image_scale),
    imageShiftX: row.image_shift_x === null ? undefined : String(row.image_shift_x),
    odometer: Number(row.odometer),
    oilInterval: Number(row.oil_interval_miles),
    tireInterval: Number(row.tire_interval_miles),
    oilIntervalMonths: Number(row.oil_interval_months),
    tireIntervalMonths: Number(row.tire_interval_months),
    lastOilChangeOdometer: Number(row.last_oil_change_odometer),
    lastTireRotationOdometer: Number(row.last_tire_rotation_odometer),
    lastOilChangeDateISO: String(row.last_oil_change_at),
    lastTireRotationDateISO: String(row.last_tire_rotation_at),
    serviceOverrides: {
      oil_change: row.oil_due_override_at ? String(row.oil_due_override_at) : null,
      tire_rotation: row.tire_due_override_at ? String(row.tire_due_override_at) : null
    },
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  }));

  const history = historyRows.map((row) => ({
    id: String(row.id),
    vehicleId: String(row.vehicle_id),
    type: String(row.event_type),
    mileage: Number(row.mileage),
    details: String(row.details),
    dateISO: String(row.occurred_at)
  }));

  const notificationState = {};
  for (const row of notificationRows) {
    notificationState[`${row.vehicle_id}:${row.maintenance_type}`] = String(row.stage_key);
  }

  const pwaSettings = normalizePwaSettings(parseJson(setting?.pwa_settings_json, DEFAULT_PWA_SETTINGS));

  return normalizeSnapshot({
    state: {
      vehicles: stateVehicles,
      selectedVehicleId: setting?.selected_vehicle_id || stateVehicles[0]?.id || null,
      history
    },
    calendarEvents,
    settings: {
      themePreference: normalizeThemePreference(setting?.theme_preference),
      pwaSettings,
      vapidPublicKey: setting?.vapid_public_key || "",
      autoNotificationState: notificationState,
      lastTab: setting?.last_tab || "dashboard"
    }
  });
}

function upsertSnapshot(db, snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  const timestamp = nowISO();
  const vehicles = normalized.state.vehicles;
  const history = normalized.state.history;
  const reminders = Object.values(normalized.calendarEvents).flatMap((value) =>
    Array.isArray(value) ? value : []
  );
  const selectedVehicleId = vehicles.some((vehicle) => vehicle.id === normalized.state.selectedVehicleId)
    ? normalized.state.selectedVehicleId
    : vehicles[0]?.id || null;

  const insertVehicle = db.prepare(
    `INSERT INTO vehicles (
      id,
      sort_order,
      name,
      image_path,
      image_scale,
      image_shift_x,
      odometer,
      oil_interval_miles,
      tire_interval_miles,
      oil_interval_months,
      tire_interval_months,
      last_oil_change_odometer,
      last_tire_rotation_odometer,
      last_oil_change_at,
      last_tire_rotation_at,
      oil_due_override_at,
      tire_due_override_at,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const insertHistory = db.prepare(
    `INSERT INTO history_events (id, vehicle_id, event_type, mileage, details, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const insertReminder = db.prepare(
    `INSERT INTO service_reminders (
      id,
      vehicle_id,
      service_type,
      scheduled_for,
      title,
      location,
      remind_lead,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const upsertSettings = db.prepare(
    `INSERT INTO app_settings (
      id,
      selected_vehicle_id,
      theme_preference,
      pwa_settings_json,
      vapid_public_key,
      last_tab,
      updated_at
    ) VALUES (1, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      selected_vehicle_id = excluded.selected_vehicle_id,
      theme_preference = excluded.theme_preference,
      pwa_settings_json = excluded.pwa_settings_json,
      vapid_public_key = excluded.vapid_public_key,
      last_tab = excluded.last_tab,
      updated_at = excluded.updated_at`
  );

  const insertNotification = db.prepare(
    `INSERT INTO notification_state (vehicle_id, maintenance_type, stage_key, updated_at)
     VALUES (?, ?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM history_events").run();
    db.prepare("DELETE FROM service_reminders").run();
    db.prepare("DELETE FROM notification_state").run();
    db.prepare("DELETE FROM vehicles").run();

    vehicles.forEach((vehicle, index) => {
      insertVehicle.run([
        vehicle.id,
        index,
        vehicle.name,
        vehicle.image,
        vehicle.imageScale === undefined ? null : Number(vehicle.imageScale),
        vehicle.imageShiftX === undefined ? null : String(vehicle.imageShiftX),
        Number(vehicle.odometer) || 0,
        Number(vehicle.oilInterval) || 0,
        Number(vehicle.tireInterval) || 0,
        Number(vehicle.oilIntervalMonths) || 0,
        Number(vehicle.tireIntervalMonths) || 0,
        Number(vehicle.lastOilChangeOdometer) || 0,
        Number(vehicle.lastTireRotationOdometer) || 0,
        vehicle.lastOilChangeDateISO || timestamp,
        vehicle.lastTireRotationDateISO || timestamp,
        vehicle.serviceOverrides?.oil_change || null,
        vehicle.serviceOverrides?.tire_rotation || null,
        vehicle.createdAt || timestamp,
        vehicle.updatedAt || timestamp
      ]);
    });

    history.forEach((entry) => {
      insertHistory.run([
        entry.id,
        entry.vehicleId,
        entry.type,
        Number(entry.mileage) || 0,
        entry.details || "",
        entry.dateISO || timestamp
      ]);
    });

    reminders.forEach((entry) => {
      insertReminder.run([
        entry.id,
        entry.vehicleId,
        entry.serviceType,
        entry.dateISO,
        entry.title || "Service Reminder",
        entry.location || "No location",
        entry.remindLead || "15m",
        entry.createdAt || timestamp,
        entry.updatedAt || timestamp
      ]);
    });

    const setting = normalized.settings;
    upsertSettings.run([
      selectedVehicleId,
      normalizeThemePreference(setting.themePreference),
      JSON.stringify(normalizePwaSettings(setting.pwaSettings)),
      setting.vapidPublicKey || "",
      setting.lastTab || "dashboard",
      timestamp
    ]);

    Object.entries(setting.autoNotificationState || {}).forEach(([key, stageKey]) => {
      if (typeof key !== "string" || typeof stageKey !== "string") return;
      const [vehicleId, maintenanceType] = key.split(":");
      if (!vehicleId || !maintenanceType) return;
      if (maintenanceType !== "oil_change" && maintenanceType !== "tire_rotation") return;
      insertNotification.run([vehicleId, maintenanceType, stageKey, timestamp]);
    });
  });

  transaction();
}

export async function getSnapshot() {
  const db = getDb();
  const row = db.prepare("SELECT id FROM vehicles LIMIT 1").get();
  if (!row) {
    return {
      snapshot: buildDefaultSnapshot(),
      meta: { isEmpty: true }
    };
  }
  return {
    snapshot: dbRowsToSnapshot(db),
    meta: { isEmpty: false }
  };
}

export async function saveSnapshot(snapshot) {
  const db = getDb();
  upsertSnapshot(db, snapshot);
  return dbRowsToSnapshot(db);
}

export async function getNotificationStateMap() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT vehicle_id, maintenance_type, stage_key
       FROM notification_state`
    )
    .all();

  const map = {};
  for (const row of rows) {
    map[`${row.vehicle_id}:${row.maintenance_type}`] = String(row.stage_key);
  }
  return map;
}

export async function setNotificationStage(vehicleId, maintenanceType, stageKey) {
  if (typeof vehicleId !== "string" || !vehicleId.trim()) return false;
  if (!isValidMaintenanceType(maintenanceType)) return false;
  if (typeof stageKey !== "string" || !stageKey.trim()) return false;

  const db = getDb();
  const timestamp = nowISO();
  db.prepare(
    `INSERT INTO notification_state (vehicle_id, maintenance_type, stage_key, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(vehicle_id, maintenance_type) DO UPDATE SET
      stage_key = excluded.stage_key,
      updated_at = excluded.updated_at`
  ).run(vehicleId.trim(), maintenanceType, stageKey.trim(), timestamp);
  return true;
}

export async function clearNotificationStage(vehicleId, maintenanceType) {
  if (typeof vehicleId !== "string" || !vehicleId.trim()) return false;
  if (!isValidMaintenanceType(maintenanceType)) return false;

  const db = getDb();
  db.prepare(
    `DELETE FROM notification_state
     WHERE vehicle_id = ? AND maintenance_type = ?`
  ).run(vehicleId.trim(), maintenanceType);
  return true;
}

function normalizePushSubscription(subscription) {
  if (!subscription || typeof subscription !== "object") return null;
  const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint.trim() : "";
  const keys = subscription.keys && typeof subscription.keys === "object" ? subscription.keys : {};
  const p256dh = typeof keys.p256dh === "string" ? keys.p256dh.trim() : "";
  const auth = typeof keys.auth === "string" ? keys.auth.trim() : "";
  if (!endpoint || !p256dh || !auth) return null;

  return {
    endpoint,
    keys: { p256dh, auth },
    expirationTime:
      subscription.expirationTime === null || Number.isFinite(subscription.expirationTime)
        ? subscription.expirationTime ?? null
        : null
  };
}

export async function upsertPushSubscription(subscriptionInput, options = {}) {
  const subscription = normalizePushSubscription(subscriptionInput);
  if (!subscription) return false;

  const userAgent =
    typeof options.userAgent === "string" && options.userAgent.trim() ? options.userAgent.trim() : null;
  const timestamp = nowISO();
  const db = getDb();

  db.prepare(
    `INSERT INTO push_subscriptions (
      endpoint,
      p256dh,
      auth,
      subscription_json,
      user_agent,
      created_at,
      updated_at,
      failure_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      subscription_json = excluded.subscription_json,
      user_agent = excluded.user_agent,
      updated_at = excluded.updated_at`
  ).run(
    subscription.endpoint,
    subscription.keys.p256dh,
    subscription.keys.auth,
    JSON.stringify(subscription),
    userAgent,
    timestamp,
    timestamp
  );

  return true;
}

export async function removePushSubscription(endpoint) {
  if (typeof endpoint !== "string" || !endpoint.trim()) return false;
  const db = getDb();
  db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint.trim());
  return true;
}

export async function listPushSubscriptions() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT endpoint, subscription_json, user_agent, updated_at, failure_count
       FROM push_subscriptions
       ORDER BY updated_at DESC`
    )
    .all();

  return rows
    .map((row) => ({
      endpoint: String(row.endpoint),
      subscription: parseJson(row.subscription_json, null),
      userAgent: row.user_agent ? String(row.user_agent) : "",
      updatedAt: String(row.updated_at),
      failureCount: Number(row.failure_count) || 0
    }))
    .filter((row) => row.subscription && row.subscription.endpoint);
}

export async function markPushDeliverySuccess(endpoint) {
  if (typeof endpoint !== "string" || !endpoint.trim()) return false;
  const db = getDb();
  db.prepare(
    `UPDATE push_subscriptions
     SET last_success_at = ?, failure_count = 0
     WHERE endpoint = ?`
  ).run(nowISO(), endpoint.trim());
  return true;
}

export async function markPushDeliveryFailure(endpoint) {
  if (typeof endpoint !== "string" || !endpoint.trim()) return false;
  const db = getDb();
  db.prepare(
    `UPDATE push_subscriptions
     SET last_failure_at = ?, failure_count = failure_count + 1
     WHERE endpoint = ?`
  ).run(nowISO(), endpoint.trim());
  return true;
}
