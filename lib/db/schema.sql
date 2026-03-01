PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  name TEXT NOT NULL,
  image_path TEXT NOT NULL,
  image_scale REAL,
  image_shift_x TEXT,
  odometer INTEGER NOT NULL,
  oil_interval_miles INTEGER NOT NULL,
  tire_interval_miles INTEGER NOT NULL,
  oil_interval_months REAL NOT NULL,
  tire_interval_months REAL NOT NULL,
  last_oil_change_odometer INTEGER NOT NULL,
  last_tire_rotation_odometer INTEGER NOT NULL,
  last_oil_change_at TEXT NOT NULL,
  last_tire_rotation_at TEXT NOT NULL,
  oil_due_override_at TEXT,
  tire_due_override_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS history_events (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  mileage INTEGER NOT NULL,
  details TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS service_reminders (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('oil_change', 'tire_rotation')),
  scheduled_for TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  remind_lead TEXT NOT NULL CHECK (remind_lead IN ('15m', '30m', '1h', '1d')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  selected_vehicle_id TEXT,
  theme_preference TEXT NOT NULL CHECK (theme_preference IN ('light', 'dark', 'system')) DEFAULT 'light',
  pwa_settings_json TEXT NOT NULL,
  vapid_public_key TEXT NOT NULL DEFAULT '',
  last_tab TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (selected_vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notification_state (
  vehicle_id TEXT NOT NULL,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('oil_change', 'tire_rotation')),
  stage_key TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (vehicle_id, maintenance_type),
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  subscription_json TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_success_at TEXT,
  last_failure_at TEXT,
  failure_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_history_vehicle_time
  ON history_events (vehicle_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminders_vehicle_time
  ON service_reminders (vehicle_id, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_failure
  ON push_subscriptions (failure_count, updated_at DESC);
