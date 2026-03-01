"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as Tabs from "@radix-ui/react-tabs";
import {
  STORAGE_KEY,
  createInitialState,
  getMaintenanceStats,
  getSelectedVehicle,
  loadState,
  reducer
} from "../lib/autotrack-model";
import {
  buildServiceNotificationBody,
  getNotificationStage,
  getNotificationStageKey,
  getServiceLabel
} from "../lib/notifications/maintenance-notifications.js";

const THEME_STORAGE_KEY = "autotrack_theme_pref_v1";
const THEME_OPTIONS = ["system", "light", "dark"];
const PWA_SETTINGS_STORAGE_KEY = "autotrack_pwa_settings_v1";
const LAST_TAB_STORAGE_KEY = "autotrack_last_tab_v1";
const VAPID_KEY_STORAGE_KEY = "autotrack_vapid_public_key_v1";
const AUTO_NOTIFICATION_STATE_STORAGE_KEY = "autotrack_auto_notification_state_v1";
const HIDDEN_NOTIFICATION_TITLE = "\u2060";
const TAB_OPTIONS = ["vehicles", "history", "dashboard", "reminders", "settings"];
const DEV_SETTINGS_PASSCODE = "9384";
const APP_ICON_SETS = [
  {
    id: "classic",
    label: "Classic",
    appleTouch: "/icons/apple-touch-icon.png",
    icon192: "/icons/icon-192.png",
    icon512: "/icons/icon-512.png",
    notification: "/icons/icon-192.png"
  },
  {
    id: "white",
    label: "White",
    appleTouch: "/icons/white-icon-apple-touch.png",
    icon192: "/icons/white-icon-192.png",
    icon512: "/icons/white-icon-512.png",
    notification: "/icons/white-icon-192.png",
    legacyOriginal: "/icons/whiteIcon.png"
  }
];
const DEFAULT_APP_ICON_SET = APP_ICON_SETS[1];
const DEFAULT_PWA_ICON = DEFAULT_APP_ICON_SET.appleTouch;
const DEFAULT_PWA_SETTINGS = {
  launchTab: "dashboard",
  resumeLastTab: true,
  offlineReady: true,
  pushAlerts: false,
  appIcon: DEFAULT_PWA_ICON,
  honda2017TestMode: false
};

const EVENT_LABELS = {
  vehicle_created: "Vehicle Added",
  settings_updated: "Settings Updated",
  odometer_update: "Odometer Updated",
  oil_change: "Oil Change",
  tire_rotation: "Tire Rotation"
};

const MONTH_NAMES_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CALENDAR_MONTH_COUNT = 12;
const AUTO_NOTIFICATION_POLL_MS = 15 * 1000;
const REMINDER_DEFAULT = "15m";
const REMINDER_PRESETS = [
  { value: "15m", label: "15 Minutes Before" },
  { value: "30m", label: "30 Minutes Before" },
  { value: "1h", label: "1 Hour Before" },
  { value: "1d", label: "1 Day Before" }
];
const NAV_ICON_ASSETS = {
  vehicles: "/nav-icons/car.png",
  history: "/nav-icons/history.png",
  dashboard: "/nav-icons/car-brake.png",
  reminders: "/nav-icons/calendar.png",
  settings: "/nav-icons/settings.png"
};
const VEHICLE_PROFILE_SECTIONS = [
  {
    title: "Vehicle Overview",
    fields: ["Primary Driver", "Make", "Model", "Year", "Trim Level", "Engine Type"]
  },
  {
    title: "Oil & Engine Maintenance",
    fields: [
      "Recommended Oil Type",
      "Oil Viscosity",
      "Oil Capacity (Quarts)",
      "Oil Change Interval (Miles)",
      "Last Oil Change Mileage",
      "Oil Filter Type",
      "Engine Air Filter Replacement Interval"
    ]
  },
  {
    title: "Tire & Wheel Maintenance",
    fields: [
      "Tire Pressure (Front PSI)",
      "Tire Pressure (Rear PSI)",
      "Spare Tire Pressure",
      "Tire Rotation Interval (Miles)",
      "Last Tire Rotation Mileage",
      "Wheel Lug Torque Spec"
    ]
  },
  {
    title: "Major Service Intervals",
    fields: ["Transmission Fluid Change Interval", "Spark Plug Replacement Interval"]
  },
  {
    title: "Electrical & Battery",
    fields: ["Battery Type", "Battery Replacement Interval"]
  },
  {
    title: "Fuel Efficiency",
    fields: ["MPG (City)", "MPG (Highway)", "MPG (Combined)"]
  }
];

const VEHICLE_PROFILE_VALUES = {
  "2017-honda-accord-special-edition": {
    "Primary Driver": "Jordan Hymas",
    "Make": "Honda",
    "Model": "Accord",
    "Year": "2017",
    "Trim Level": "Special Edition (SE)",
    "Engine Type": "2.4L 4-Cylinder (K24W1)",
    "Recommended Oil Type": "Full Synthetic",
    "Oil Viscosity": "SAE 0W-20",
    "Oil Capacity (Quarts)": "4.4 quarts",
    "Oil Change Interval (Miles)": "9,000 miles or 12 months",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "32 PSI",
    "Tire Pressure (Rear PSI)": "32 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "6,000 miles or 6 months",
    "Last Tire Rotation Mileage": "User Tracked",
    "Wheel Lug Torque Spec": "80 ft-lb",
    "Transmission Fluid Change Interval": "30,000-60,000 miles",
    "Spark Plug Replacement Interval": "100,000 miles",
    "Battery Type": "Group 51R",
    "Battery Replacement Interval": "3-5 years",
    "MPG (City)": "27 MPG",
    "MPG (Highway)": "36 MPG",
    "MPG (Combined)": "31 MPG"
  },
  "2018-honda-accord-ex-l": {
    "Primary Driver": "Tyson Hymas",
    "Make": "Honda",
    "Model": "Accord",
    "Year": "2018",
    "Trim Level": "EX-L",
    "Engine Type": "1.5L Turbocharged 4-Cylinder (L15BE)",
    "Recommended Oil Type": "Full Synthetic",
    "Oil Viscosity": "SAE 0W-20",
    "Oil Capacity (Quarts)": "3.7 quarts",
    "Oil Change Interval (Miles)": "9,000 miles or 12 months",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "33 PSI",
    "Tire Pressure (Rear PSI)": "33 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "6,000 miles or 6 months",
    "Last Tire Rotation Mileage": "User Tracked",
    "Wheel Lug Torque Spec": "80 ft-lb",
    "Transmission Fluid Change Interval": "30,000-60,000 miles",
    "Spark Plug Replacement Interval": "100,000 miles",
    "Battery Type": "Group 51R",
    "Battery Replacement Interval": "3-5 years",
    "MPG (City)": "30 MPG",
    "MPG (Highway)": "38 MPG",
    "MPG (Combined)": "33 MPG"
  },
  "2020-honda-accord-sedan": {
    "Primary Driver": "Payton Hymas",
    "Make": "Honda",
    "Model": "Accord",
    "Year": "2020",
    "Trim Level": "EX-L",
    "Engine Type": "1.5L Turbocharged 4-Cylinder (L15BE)",
    "Recommended Oil Type": "Full Synthetic",
    "Oil Viscosity": "SAE 0W-20",
    "Oil Capacity (Quarts)": "3.7 quarts",
    "Oil Change Interval (Miles)": "9,000 miles or 12 months",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "33 PSI",
    "Tire Pressure (Rear PSI)": "33 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "6,000 miles or 6 months",
    "Last Tire Rotation Mileage": "User Tracked",
    "Wheel Lug Torque Spec": "80 ft-lb",
    "Transmission Fluid Change Interval": "30,000-60,000 miles",
    "Spark Plug Replacement Interval": "100,000 miles",
    "Battery Type": "Group 51R",
    "Battery Replacement Interval": "3-5 years",
    "MPG (City)": "30 MPG",
    "MPG (Highway)": "38 MPG",
    "MPG (Combined)": "33 MPG"
  },
  "2021-ram-1500-rebel": {
    "Primary Driver": "Thomas Hymas",
    "Make": "Ram",
    "Model": "1500",
    "Year": "2021",
    "Trim Level": "Rebel",
    "Engine Type": "5.7L HEMI V8",
    "Recommended Oil Type": "Full Synthetic",
    "Oil Viscosity": "SAE 5W-20 (5.7L HEMI)",
    "Oil Capacity (Quarts)": "7.0 quarts",
    "Oil Change Interval (Miles)": "9,000 miles or 12 months",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Mopar Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "38 PSI",
    "Tire Pressure (Rear PSI)": "38 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "4,000 miles or 4.5 months",
    "Last Tire Rotation Mileage": "User Tracked",
    "Wheel Lug Torque Spec": "130 ft-lb",
    "Transmission Fluid Change Interval": "60,000 miles",
    "Spark Plug Replacement Interval": "30,000 miles",
    "Battery Type": "H7 / Group 94R AGM",
    "Battery Replacement Interval": "3-5 years",
    "MPG (City)": "17 MPG",
    "MPG (Highway)": "22 MPG",
    "MPG (Combined)": "19 MPG"
  },
  "2023-acura-rdx-a-spec": {
    "Primary Driver": "Michelle Hymas",
    "Make": "Acura",
    "Model": "RDX",
    "Year": "2023",
    "Trim Level": "A-Spec",
    "Engine Type": "2.0L Turbocharged 4-Cylinder (K20C4)",
    "Recommended Oil Type": "Full Synthetic",
    "Oil Viscosity": "SAE 0W-20",
    "Oil Capacity (Quarts)": "5.1 quarts",
    "Oil Change Interval (Miles)": "9,000 miles or 12 months",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Acura/Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "36 PSI",
    "Tire Pressure (Rear PSI)": "36 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "5,000 miles or 5 months",
    "Last Tire Rotation Mileage": "User Tracked",
    "Wheel Lug Torque Spec": "80 ft-lb",
    "Transmission Fluid Change Interval": "30,000-45,000 miles",
    "Spark Plug Replacement Interval": "105,000 miles",
    "Battery Type": "Group 51R (EFB or AGM compatible)",
    "Battery Replacement Interval": "3-5 years",
    "MPG (City)": "21-22 MPG",
    "MPG (Highway)": "27-28 MPG",
    "MPG (Combined)": "23-24 MPG"
  }
};

const DAY_MS = 24 * 60 * 60 * 1000;
const USER_TRACKED_PROFILE_FIELDS = new Set([
  "Last Oil Change Mileage",
  "Last Tire Rotation Mileage"
]);

function formatMileage(miles) {
  return `${Math.round(Number(miles) || 0).toLocaleString()} mi`;
}

function resolveVehicleProfileValue(vehicle, profile, field) {
  if (USER_TRACKED_PROFILE_FIELDS.has(field) && vehicle) {
    const hasOdometerReading = Number(vehicle.odometer) > 0;
    return hasOdometerReading ? formatMileage(vehicle.odometer) : "User Tracked";
  }
  return profile[field] || "Add info";
}

function isUserTrackedProfileField(field, profileValue) {
  return USER_TRACKED_PROFILE_FIELDS.has(field) || profileValue === "User Tracked";
}

function formatDate(dateISO) {
  return new Date(dateISO).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatMonths(months) {
  if (!Number.isFinite(months) || months <= 0) return "N/A";
  const rounded = Math.round(months * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded} months` : `${rounded.toFixed(1)} months`;
}

function addMonthsFractional(baseDate, intervalMonths) {
  const next = new Date(baseDate);
  const wholeMonths = Math.floor(intervalMonths);
  const fractionalMonths = intervalMonths - wholeMonths;
  if (wholeMonths > 0) {
    next.setMonth(next.getMonth() + wholeMonths);
  }
  if (fractionalMonths > 0) {
    next.setDate(next.getDate() + Math.round(fractionalMonths * 30));
  }
  return next;
}

function getFirstDueDate(lastServiceISO, intervalMonths, manualISO) {
  const parsed = new Date(lastServiceISO);
  if (!Number.isFinite(parsed.getTime()) || !Number.isFinite(intervalMonths) || intervalMonths <= 0) {
    return null;
  }
  const autoDueDate = addMonthsFractional(parsed, intervalMonths);
  const manualDueDate = new Date(manualISO);
  if (Number.isFinite(manualDueDate.getTime()) && manualDueDate > parsed) {
    return manualDueDate;
  }
  return autoDueDate;
}

function getServiceDaysForMonth(lastServiceISO, intervalMonths, year, monthIndex, manualISO) {
  const results = new Set();
  let dueDate = getFirstDueDate(lastServiceISO, intervalMonths, manualISO);
  if (!dueDate) return results;

  const monthStart = new Date(year, monthIndex, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  let guard = 0;

  while (dueDate < monthStart && guard < 400) {
    dueDate = addMonthsFractional(dueDate, intervalMonths);
    guard += 1;
  }

  while (dueDate <= monthEnd && guard < 800) {
    results.add(dueDate.getDate());
    dueDate = addMonthsFractional(dueDate, intervalMonths);
    guard += 1;
  }

  return results;
}

function getMonthGrid(year, monthIndex) {
  const startDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startDay; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function getRollingMonths(count = CALENDAR_MONTH_COUNT) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + index, 1);
    return {
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      year: monthDate.getFullYear(),
      monthIndex: monthDate.getMonth()
    };
  });
}

function toLocalDateISO(year, monthIndex, day, timeValue) {
  const [hoursPart, minutesPart] = String(timeValue || "09:00").split(":");
  const hours = Number.parseInt(hoursPart || "9", 10);
  const minutes = Number.parseInt(minutesPart || "0", 10);
  const date = new Date(year, monthIndex, day, Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date.toISOString();
}

function normalizeReminderValue(value) {
  return REMINDER_PRESETS.some((preset) => preset.value === value) ? value : REMINDER_DEFAULT;
}

function createReminderDraft(overrides = {}) {
  const next = {
    title: "",
    location: "",
    serviceType: "tire_rotation",
    time: "09:00",
    remindLead: REMINDER_DEFAULT,
    ...overrides
  };
  return { ...next, remindLead: normalizeReminderValue(next.remindLead) };
}

function reminderLabelFromValue(value) {
  const normalized = normalizeReminderValue(value);
  return REMINDER_PRESETS.find((preset) => preset.value === normalized)?.label || "15 Minutes Before";
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}


function getNotificationContextInfo() {
  if (typeof window === "undefined") {
    return { secure: false, appleMobile: false, standalone: false };
  }
  const appleMobile =
    /iPhone|iPad|iPod/i.test(window.navigator.userAgent) ||
    (typeof window.navigator.platform === "string" && /iP(ad|hone|od)/i.test(window.navigator.platform));
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    window.navigator.standalone === true;
  return {
    secure: window.isSecureContext,
    appleMobile,
    standalone
  };
}

function isValidTab(value) {
  return TAB_OPTIONS.includes(value);
}

function resolveAppIconSet(appIconPath) {
  const normalizedPath = typeof appIconPath === "string" ? appIconPath.trim() : "";
  if (!normalizedPath) return DEFAULT_APP_ICON_SET;

  return (
    APP_ICON_SETS.find(
      (iconSet) =>
        iconSet.appleTouch === normalizedPath ||
        iconSet.icon192 === normalizedPath ||
        iconSet.icon512 === normalizedPath ||
        iconSet.notification === normalizedPath ||
        iconSet.legacyOriginal === normalizedPath
    ) || DEFAULT_APP_ICON_SET
  );
}

function normalizePwaSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PWA_SETTINGS };
  const iconSet = resolveAppIconSet(raw.appIcon);
  return {
    launchTab: isValidTab(raw.launchTab) ? raw.launchTab : DEFAULT_PWA_SETTINGS.launchTab,
    resumeLastTab:
      typeof raw.resumeLastTab === "boolean" ? raw.resumeLastTab : DEFAULT_PWA_SETTINGS.resumeLastTab,
    offlineReady:
      typeof raw.offlineReady === "boolean" ? raw.offlineReady : DEFAULT_PWA_SETTINGS.offlineReady,
    pushAlerts: typeof raw.pushAlerts === "boolean" ? raw.pushAlerts : DEFAULT_PWA_SETTINGS.pushAlerts,
    appIcon: iconSet.appleTouch,
    honda2017TestMode:
      typeof raw.honda2017TestMode === "boolean"
        ? raw.honda2017TestMode
        : DEFAULT_PWA_SETTINGS.honda2017TestMode
  };
}

function normalizeAutoNotificationState(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof key === "string" && typeof value === "string") {
      next[key] = value;
    }
  });
  return next;
}

function createDefaultStorageSnapshot() {
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

function readLegacySnapshotFromLocalStorage() {
  const snapshot = createDefaultStorageSnapshot();
  let hasLegacyData = false;

  try {
    if (localStorage.getItem(STORAGE_KEY)) {
      snapshot.state = loadState();
      hasLegacyData = true;
    }
  } catch {
    // Ignore malformed legacy state.
  }

  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && THEME_OPTIONS.includes(savedTheme)) {
      snapshot.settings.themePreference = savedTheme;
      hasLegacyData = true;
    }
  } catch {
    // Ignore theme read failures.
  }

  try {
    const rawPwaSettings = localStorage.getItem(PWA_SETTINGS_STORAGE_KEY);
    if (rawPwaSettings) {
      snapshot.settings.pwaSettings = normalizePwaSettings(JSON.parse(rawPwaSettings));
      hasLegacyData = true;
    }
  } catch {
    // Ignore malformed legacy PWA settings.
  }

  try {
    const rawLastTab = localStorage.getItem(LAST_TAB_STORAGE_KEY);
    if (rawLastTab && isValidTab(rawLastTab)) {
      snapshot.settings.lastTab = rawLastTab;
      hasLegacyData = true;
    }
  } catch {
    // Ignore legacy tab read failures.
  }

  try {
    const rawVapid = localStorage.getItem(VAPID_KEY_STORAGE_KEY);
    if (typeof rawVapid === "string" && rawVapid.trim()) {
      snapshot.settings.vapidPublicKey = rawVapid.trim();
      hasLegacyData = true;
    }
  } catch {
    // Ignore legacy vapid read failures.
  }

  try {
    const rawNotificationState = localStorage.getItem(AUTO_NOTIFICATION_STATE_STORAGE_KEY);
    if (rawNotificationState) {
      snapshot.settings.autoNotificationState = normalizeAutoNotificationState(
        JSON.parse(rawNotificationState)
      );
      hasLegacyData = true;
    }
  } catch {
    // Ignore malformed legacy notification state.
  }

  return { snapshot, hasLegacyData };
}

function clearLegacyLocalStorage() {
  [
    STORAGE_KEY,
    THEME_STORAGE_KEY,
    PWA_SETTINGS_STORAGE_KEY,
    LAST_TAB_STORAGE_KEY,
    VAPID_KEY_STORAGE_KEY,
    AUTO_NOTIFICATION_STATE_STORAGE_KEY
  ].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore local storage cleanup failures.
    }
  });
}

function remainingLabel(remainingMs) {
  if (remainingMs >= 0) {
    if (remainingMs < DAY_MS) return "Due today";
    const days = Math.ceil(remainingMs / DAY_MS);
    if (days < 30) return `${days} ${days === 1 ? "day" : "days"}`;
    const months = Math.floor(days / 30);
    const dayRemainder = days % 30;
    return `${months}m ${dayRemainder}d`;
  }

  if (remainingMs > -DAY_MS) return "Due today";
  const overdueDays = Math.max(1, Math.floor(Math.abs(remainingMs) / DAY_MS));
  return `Overdue by ${overdueDays} ${overdueDays === 1 ? "day" : "days"}`;
}

function formatScheduleDate(dateISO) {
  const value = new Date(dateISO);
  if (!Number.isFinite(value.getTime())) return "N/A";
  return value.toLocaleDateString(undefined, {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getUpcomingServiceSchedule(
  lastServiceISO,
  currentOdometer,
  intervalMonths,
  intervalMiles,
  manualISO,
  { horizonMonths = 12, maxEntries = 4 } = {}
) {
  const normalizedIntervalMonths = Number(intervalMonths);
  const normalizedIntervalMiles = Math.max(1, Math.round(Number(intervalMiles) || 0));
  const normalizedCurrentOdometer = Math.max(0, Math.round(Number(currentOdometer) || 0));
  if (!Number.isFinite(normalizedIntervalMonths) || normalizedIntervalMonths <= 0) return [];

  let dueDate = getFirstDueDate(lastServiceISO, normalizedIntervalMonths, manualISO);
  if (!dueDate) return [];

  const now = new Date();
  const horizon = new Date(now);
  horizon.setMonth(horizon.getMonth() + horizonMonths);
  const schedule = [];
  let targetMileage = normalizedCurrentOdometer + normalizedIntervalMiles;
  let guard = 0;

  while (dueDate < now && guard < 240) {
    dueDate = addMonthsFractional(dueDate, normalizedIntervalMonths);
    guard += 1;
  }

  while (dueDate <= horizon && schedule.length < maxEntries && guard < 640) {
    schedule.push({
      dateISO: dueDate.toISOString(),
      targetMileage
    });
    dueDate = addMonthsFractional(dueDate, normalizedIntervalMonths);
    targetMileage += normalizedIntervalMiles;
    guard += 1;
  }

  if (schedule.length === 0) {
    schedule.push({
      dateISO: dueDate.toISOString(),
      targetMileage
    });
  }

  return schedule;
}

function NavIcon({ type }) {
  const iconAsset = NAV_ICON_ASSETS[type] || NAV_ICON_ASSETS.settings;
  return (
    <span
      className="tabIcon tabIconAsset"
      style={{ "--icon-url": `url('${iconAsset}')` }}
      aria-hidden="true"
    />
  );
}

function MaintenanceMetric({
  title,
  remainingMs,
  progress,
  lastServiceDateISO,
  intervalMonths,
  intervalMiles,
  onLog,
  actionLabel
}) {
  const overdue = remainingMs < 0;
  const progressPercent = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const complete = progressPercent >= 100;
  const trackerClockClassName = `trackerClock ${complete ? "complete" : ""} ${overdue ? "overdue" : ""}`.trim();

  return (
    <div className={`trackerItem ${overdue ? "overdue" : ""}`}>
      <div className="trackerItemTop">
        <h4>{title}</h4>
        <span className={`trackerStatus ${overdue ? "overdue" : ""}`}>{remainingLabel(remainingMs)}</span>
      </div>

      <div className="trackerMeta">
        <span className="trackerClockFloatingWrap" aria-hidden="true">
          <span
            className={trackerClockClassName}
            style={{ "--tracker-progress": `${progressPercent}%` }}
          >
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 7.7v4.8l3 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
        </span>
        <p>
          <span>Last</span>
          <strong>{formatDate(lastServiceDateISO)}</strong>
        </p>
        <p>
          <span>Period</span>
          <strong>{formatMonths(intervalMonths)}</strong>
        </p>
        <p>
          <span>Interval</span>
          <strong>{formatMileage(intervalMiles)}</strong>
        </p>
      </div>

      <button type="button" className="trackerLogButton" onClick={onLog}>
        {actionLabel}
      </button>
    </div>
  );
}

export default function AutoTrackApp() {
  const [state, setState] = useState(createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [vehicleDetailId, setVehicleDetailId] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [flash, setFlash] = useState("");
  const [themePreference, setThemePreference] = useState("light");
  const [pwaSettings, setPwaSettings] = useState(DEFAULT_PWA_SETTINGS);
  const [settingsPage, setSettingsPage] = useState("main");
  const [devPasscodeInput, setDevPasscodeInput] = useState("");
  const [devPasscodeError, setDevPasscodeError] = useState("");
  const [vapidPublicKey, setVapidPublicKey] = useState(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "");
  const [prefersDark, setPrefersDark] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [isStandalone, setIsStandalone] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [odometerEditorOpen, setOdometerEditorOpen] = useState(false);
  const [odometerDraft, setOdometerDraft] = useState("");
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(null);
  const [calendarComposer, setCalendarComposer] = useState(null);
  const [calendarEventDraft, setCalendarEventDraft] = useState(createReminderDraft());
  const [calendarEvents, setCalendarEvents] = useState({});
  const [calendarEventDetail, setCalendarEventDetail] = useState(null);
  const [calendarEventEditMode, setCalendarEventEditMode] = useState(false);
  const [calendarEventEditDraft, setCalendarEventEditDraft] = useState(createReminderDraft());
  const [pushConnection, setPushConnection] = useState({
    swReady: false,
    pushSupported: false,
    subscribed: false,
    endpoint: "",
    error: ""
  });
  const [maintenanceNowMs, setMaintenanceNowMs] = useState(() => Date.now());
  const dashboardMenuRef = useRef(null);
  const shellRef = useRef(null);
  const pwaSettingsLoadedRef = useRef(false);
  const autoNotificationStateRef = useRef({});
  const autoNotificationStateLoadedRef = useRef(false);
  const persistSnapshotRef = useRef(() => {});

  const inspectPushConnection = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      setPushConnection({
        swReady: false,
        pushSupported: false,
        subscribed: false,
        endpoint: "",
        error: "Service worker not supported"
      });
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const pushSupported = "PushManager" in window;
      let subscription = null;

      if (registration && pushSupported) {
        subscription = await registration.pushManager.getSubscription();
      }

      setPushConnection({
        swReady: Boolean(registration),
        pushSupported,
        subscribed: Boolean(subscription),
        endpoint: subscription?.endpoint || "",
        error: ""
      });

      return { registration, subscription, pushSupported };
    } catch (error) {
      setPushConnection({
        swReady: false,
        pushSupported: "PushManager" in window,
        subscribed: false,
        endpoint: "",
        error: error?.message || "Unable to inspect push connection."
      });
      return null;
    }
  }, []);

  const scrollAppToTop = () => {
    if (shellRef.current?.scrollTo) {
      shellRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    const scroller = document.scrollingElement || document.documentElement;
    scroller?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const selectedVehicle = useMemo(() => getSelectedVehicle(state), [state]);
  const vehicleDetail = useMemo(
    () => state.vehicles.find((item) => item.id === vehicleDetailId) || null,
    [state.vehicles, vehicleDetailId]
  );
  const resolvedTheme = themePreference === "system" ? (prefersDark ? "dark" : "light") : themePreference;
  const currentIconSet = useMemo(() => resolveAppIconSet(pwaSettings.appIcon), [pwaSettings.appIcon]);
  const selectedAppIconSetId = currentIconSet.id;
  const maintenanceStatsOptions = useMemo(
    () => ({ honda2017TestMode: pwaSettings.honda2017TestMode }),
    [pwaSettings.honda2017TestMode]
  );

  const notify = (message) => setFlash(message);
  const updateState = (action) => setState((prev) => reducer(prev, action));

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      const defaultSnapshot = createDefaultStorageSnapshot();
      let snapshotToApply = defaultSnapshot;

      try {
        const response = await fetch("/api/storage", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load storage snapshot.");
        }

        const payload = await response.json();
        const loadedSnapshot =
          payload?.snapshot && typeof payload.snapshot === "object"
            ? payload.snapshot
            : defaultSnapshot;
        const legacy = readLegacySnapshotFromLocalStorage();
        const shouldMigrateLegacy = Boolean(payload?.meta?.isEmpty) && legacy.hasLegacyData;

        if (shouldMigrateLegacy) {
          const migrateResponse = await fetch("/api/storage", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ snapshot: legacy.snapshot })
          });
          if (migrateResponse.ok) {
            const migrated = await migrateResponse.json();
            snapshotToApply =
              migrated?.snapshot && typeof migrated.snapshot === "object"
                ? migrated.snapshot
                : legacy.snapshot;
            clearLegacyLocalStorage();
          } else {
            snapshotToApply = legacy.snapshot;
          }
        } else {
          snapshotToApply = loadedSnapshot;
        }
      } catch (error) {
        console.error("Storage load failed:", error);
      }

      if (cancelled) return;

      const nextState =
        snapshotToApply?.state && Array.isArray(snapshotToApply.state.vehicles)
          ? snapshotToApply.state
          : defaultSnapshot.state;
      const nextCalendarEvents =
        snapshotToApply?.calendarEvents &&
        typeof snapshotToApply.calendarEvents === "object" &&
        !Array.isArray(snapshotToApply.calendarEvents)
          ? snapshotToApply.calendarEvents
          : {};
      const nextSettings =
        snapshotToApply?.settings && typeof snapshotToApply.settings === "object"
          ? snapshotToApply.settings
          : defaultSnapshot.settings;

      setState(nextState);
      setCalendarEvents(nextCalendarEvents);
      setThemePreference(
        nextSettings.themePreference && THEME_OPTIONS.includes(nextSettings.themePreference)
          ? nextSettings.themePreference
          : "light"
      );
      setPwaSettings(normalizePwaSettings(nextSettings.pwaSettings));
      const envVapidPublicKey =
        typeof process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY === "string"
          ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY.trim()
          : "";
      const storedVapidPublicKey =
        typeof nextSettings.vapidPublicKey === "string" ? nextSettings.vapidPublicKey.trim() : "";
      setVapidPublicKey(storedVapidPublicKey || envVapidPublicKey);
      autoNotificationStateRef.current = normalizeAutoNotificationState(
        nextSettings.autoNotificationState
      );
      autoNotificationStateLoadedRef.current = true;
      pwaSettingsLoadedRef.current = true;
      setActiveTab("dashboard");
      setHydrated(true);
    };

    loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSnapshot = useCallback(async () => {
    if (!hydrated) return;
    if (!pwaSettingsLoadedRef.current || !autoNotificationStateLoadedRef.current) return;

    try {
      await fetch("/api/storage", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          snapshot: {
            state,
            calendarEvents,
            settings: {
              themePreference,
              pwaSettings,
              vapidPublicKey,
              autoNotificationState: autoNotificationStateRef.current,
              lastTab: isValidTab(activeTab) ? activeTab : "dashboard"
            }
          }
        })
      });
    } catch (error) {
      console.error("Storage save failed:", error);
    }
  }, [activeTab, calendarEvents, hydrated, pwaSettings, state, themePreference, vapidPublicKey]);

  useEffect(() => {
    persistSnapshotRef.current = persistSnapshot;
  }, [persistSnapshot]);

  useEffect(() => {
    if (!hydrated) return;
    if (!pwaSettingsLoadedRef.current || !autoNotificationStateLoadedRef.current) return;
    const timeout = window.setTimeout(() => {
      persistSnapshot();
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [activeTab, calendarEvents, hydrated, persistSnapshot, pwaSettings, state, themePreference, vapidPublicKey]);

  useEffect(() => {
    if (!hydrated) return;
    updateState({ type: "ensure-selected" });
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const frame = window.requestAnimationFrame(() => {
      scrollAppToTop();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, hydrated]);

  useEffect(() => {
    if (activeTab !== "vehicles" && vehicleDetailId) {
      setVehicleDetailId(null);
    }
  }, [activeTab, vehicleDetailId]);

  useEffect(() => {
    if (activeTab !== "settings" && settingsPage !== "main") {
      setSettingsPage("main");
    }
  }, [activeTab, settingsPage]);


  useEffect(() => {
    if (activeTab !== "vehicles" || !vehicleDetailId) return;
    if (shellRef.current?.scrollTo) {
      shellRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    const scroller = document.scrollingElement || document.documentElement;
    scroller?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeTab, vehicleDetailId]);

  useEffect(() => {
    const supportsVehicleMenu =
      activeTab === "dashboard" || activeTab === "history" || activeTab === "reminders";
    if (!supportsVehicleMenu && dashboardMenuOpen) {
      setDashboardMenuOpen(false);
    }
  }, [activeTab, dashboardMenuOpen]);

  useEffect(() => {
    if (activeTab !== "reminders" && calendarComposer) {
      setCalendarComposer(null);
    }
  }, [activeTab, calendarComposer]);

  useEffect(() => {
    if (activeTab !== "reminders" && calendarEventDetail) {
      setCalendarEventDetail(null);
      setCalendarEventEditMode(false);
    }
  }, [activeTab, calendarEventDetail]);

  useEffect(() => {
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(""), 2800);
    return () => clearTimeout(timeout);
  }, [flash]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMaintenanceNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!dashboardMenuOpen) return;
    const closeIfOutside = (event) => {
      if (!dashboardMenuRef.current || dashboardMenuRef.current.contains(event.target)) return;
      setDashboardMenuOpen(false);
    };

    document.addEventListener("mousedown", closeIfOutside);
    document.addEventListener("touchstart", closeIfOutside);
    return () => {
      document.removeEventListener("mousedown", closeIfOutside);
      document.removeEventListener("touchstart", closeIfOutside);
    };
  }, [dashboardMenuOpen]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (!pwaSettingsLoadedRef.current) return;

    if (!pwaSettings.offlineReady) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Service worker registration failed:", error);
    });
  }, [pwaSettings.offlineReady]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setPrefersDark(media.matches);
    sync();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (notificationPermission !== "denied" || !pwaSettings.pushAlerts) return;
    setPwaSettings((prev) => ({ ...prev, pushAlerts: false }));
  }, [notificationPermission, pwaSettings.pushAlerts]);

  useEffect(() => {
    if (!hydrated) return;
    inspectPushConnection();
  }, [hydrated, pwaSettings.offlineReady, notificationPermission, inspectPushConnection]);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const sync = () =>
      setIsStandalone(
        media.matches ||
          (typeof window.navigator.standalone !== "undefined" && window.navigator.standalone === true)
      );
    sync();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", sync);
      return () => media.removeEventListener("change", sync);
    }
    media.addListener(sync);
    return () => media.removeListener(sync);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", resolvedTheme === "dark" ? "#0a0a0a" : "#f7f7f7");
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const setLink = (rel, href, sizes) => {
      const selector = sizes
        ? `link[rel="${rel}"][sizes="${sizes}"]`
        : `link[rel="${rel}"]:not([sizes])`;
      let link = document.head.querySelector(selector);
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        if (sizes) link.setAttribute("sizes", sizes);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
    };

    setLink("apple-touch-icon", currentIconSet.appleTouch);
    setLink("icon", currentIconSet.icon192, "192x192");
    setLink("icon", currentIconSet.icon512, "512x512");
  }, [currentIconSet.appleTouch, currentIconSet.icon192, currentIconSet.icon512]);

  useEffect(() => {
    const installHandler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const installedHandler = () => {
      setInstallPrompt(null);
      notify("App installed.");
    };
    window.addEventListener("beforeinstallprompt", installHandler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", installHandler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleSaveOdometer = () => {
    if (!selectedVehicle) return;
    try {
      updateState({
        type: "update-odometer",
        vehicleId: selectedVehicle.id,
        odometer: odometerDraft
      });
      setOdometerEditorOpen(false);
    } catch (error) {
      window.alert(error.message || "Unable to update odometer.");
    }
  };

  const handleOpenOdometerEditor = () => {
    if (!selectedVehicle) return;
    setOdometerDraft(String(selectedVehicle.odometer));
    setOdometerEditorOpen(true);
  };

  const handleAskMaintenanceReset = (maintenanceType) => {
    if (!selectedVehicle) return;
    setMaintenanceConfirm({ maintenanceType });
  };

  const handleConfirmMaintenanceReset = () => {
    if (!selectedVehicle || !maintenanceConfirm) return;
    try {
      updateState({
        type: "log-maintenance",
        vehicleId: selectedVehicle.id,
        maintenanceType: maintenanceConfirm.maintenanceType
      });
      notify(
        maintenanceConfirm.maintenanceType === "oil_change"
          ? "Oil tracker reset from today."
          : "Tire tracker reset from today."
      );
      setMaintenanceConfirm(null);
    } catch (error) {
      window.alert(error.message || "Unable to log maintenance.");
    }
  };

  const handleOpenCalendarComposer = (year, monthIndex, day) => {
    setCalendarEventDetail(null);
    setCalendarEventEditMode(false);
    setCalendarComposer({ year, monthIndex, day });
    setCalendarEventDraft(createReminderDraft());
  };

  const handleCloseCalendarComposer = () => {
    setCalendarComposer(null);
  };

  const getEventsForDate = (year, monthIndex, day) => {
    if (!selectedVehicle) return [];
    return (calendarEvents[selectedVehicle.id] || []).filter((entry) => {
      const date = new Date(entry.dateISO);
      return date.getFullYear() === year && date.getMonth() === monthIndex && date.getDate() === day;
    });
  };

  const handleOpenCalendarEventDetail = (event) => {
    const eventDate = new Date(event.dateISO);
    setCalendarComposer(null);
    setCalendarEventEditMode(false);
    setCalendarEventEditDraft(
      createReminderDraft({
        title: event.title || "",
        location: event.location || "",
        serviceType: event.serviceType || "tire_rotation",
        time: `${String(eventDate.getHours()).padStart(2, "0")}:${String(eventDate.getMinutes()).padStart(2, "0")}`,
        remindLead: event.remindLead || "1d"
      })
    );
    setCalendarEventDetail({
      eventId: event.id,
      year: eventDate.getFullYear(),
      monthIndex: eventDate.getMonth(),
      day: eventDate.getDate()
    });
  };

  const handleCalendarDayPress = (year, monthIndex, day) => {
    const existingEvents = getEventsForDate(year, monthIndex, day);
    if (existingEvents.length > 0) {
      handleOpenCalendarEventDetail(existingEvents[0]);
      return;
    }
    handleOpenCalendarComposer(year, monthIndex, day);
  };

  const handleSaveCalendarEvent = () => {
    if (!selectedVehicle || !calendarComposer) return;
    const { year, monthIndex, day } = calendarComposer;
    const scheduledISO = toLocalDateISO(year, monthIndex, day, calendarEventDraft.time);
    const scheduledDate = new Date(scheduledISO);
    const lastServiceDate =
      calendarEventDraft.serviceType === "oil_change"
        ? new Date(selectedVehicle.lastOilChangeDateISO)
        : new Date(selectedVehicle.lastTireRotationDateISO);

    if (scheduledDate <= lastServiceDate) {
      notify("Pick a date after the last logged service for this item.");
      return;
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      vehicleId: selectedVehicle.id,
      dateISO: scheduledISO,
      title: calendarEventDraft.title.trim() || "Service Reminder",
      location: calendarEventDraft.location.trim() || "No location",
      serviceType: calendarEventDraft.serviceType,
      remindLead: calendarEventDraft.remindLead
    };

    setCalendarEvents((prev) => {
      const vehicleEvents = Array.isArray(prev[selectedVehicle.id]) ? prev[selectedVehicle.id] : [];
      return {
        ...prev,
        [selectedVehicle.id]: [entry, ...vehicleEvents].sort(
          (a, b) => Date.parse(a.dateISO) - Date.parse(b.dateISO)
        )
      };
    });

    try {
      updateState({
        type: "set-service-reminder",
        vehicleId: selectedVehicle.id,
        maintenanceType: calendarEventDraft.serviceType,
        dateISO: scheduledISO
      });
      notify(
        `${calendarEventDraft.serviceType === "oil_change" ? "Oil change" : "Tire rotation"} scheduled for ${scheduledDate.toLocaleString()}.`
      );
      setCalendarComposer(null);
    } catch (error) {
      window.alert(error.message || "Unable to save this calendar event.");
    }
  };

  const handleSaveEditedCalendarEvent = () => {
    if (!selectedVehicle || !calendarEventDetail) return;
    const scheduledISO = toLocalDateISO(
      calendarEventDetail.year,
      calendarEventDetail.monthIndex,
      calendarEventDetail.day,
      calendarEventEditDraft.time
    );
    const scheduledDate = new Date(scheduledISO);
    const lastServiceDate =
      calendarEventEditDraft.serviceType === "oil_change"
        ? new Date(selectedVehicle.lastOilChangeDateISO)
        : new Date(selectedVehicle.lastTireRotationDateISO);

    if (scheduledDate <= lastServiceDate) {
      notify("Pick a date after the last logged service for this item.");
      return;
    }

    setCalendarEvents((prev) => {
      const vehicleEvents = Array.isArray(prev[selectedVehicle.id]) ? prev[selectedVehicle.id] : [];
      return {
        ...prev,
        [selectedVehicle.id]: vehicleEvents.map((entry) =>
          entry.id === calendarEventDetail.eventId
            ? {
                ...entry,
                title: calendarEventEditDraft.title.trim() || "Service Reminder",
                location: calendarEventEditDraft.location.trim() || "No location",
                serviceType: calendarEventEditDraft.serviceType,
                dateISO: scheduledISO,
                remindLead: calendarEventEditDraft.remindLead
              }
            : entry
        )
      };
    });

    try {
      updateState({
        type: "set-service-reminder",
        vehicleId: selectedVehicle.id,
        maintenanceType: calendarEventEditDraft.serviceType,
        dateISO: scheduledISO
      });
      notify("Reminder updated.");
      setCalendarEventEditMode(false);
    } catch (error) {
      window.alert(error.message || "Unable to update this reminder.");
    }
  };

  const handleDeleteCalendarEvent = () => {
    if (!selectedVehicle || !calendarEventDetail || !selectedCalendarEvent) return;
    const reminderToDelete = selectedCalendarEvent;
    const reminderServiceType = reminderToDelete.serviceType;
    const currentOverrideISO = selectedVehicle.serviceOverrides?.[reminderServiceType] || null;
    const shouldClearOverride =
      Number.isFinite(Date.parse(currentOverrideISO)) &&
      Number.isFinite(Date.parse(reminderToDelete.dateISO)) &&
      Date.parse(currentOverrideISO) === Date.parse(reminderToDelete.dateISO);

    setCalendarEvents((prev) => {
      const vehicleEvents = Array.isArray(prev[selectedVehicle.id]) ? prev[selectedVehicle.id] : [];
      return {
        ...prev,
        [selectedVehicle.id]: vehicleEvents.filter((entry) => entry.id !== reminderToDelete.id)
      };
    });

    try {
      if (shouldClearOverride) {
        updateState({
          type: "clear-service-reminder",
          vehicleId: selectedVehicle.id,
          maintenanceType: reminderServiceType
        });
      }
      notify("Reminder deleted.");
      setCalendarEventEditMode(false);
      setCalendarEventDetail(null);
    } catch (error) {
      window.alert(error.message || "Unable to delete this reminder.");
    }
  };

  const handleCloseCalendarEventDetail = () => {
    setCalendarEventDetail(null);
    setCalendarEventEditMode(false);
  };

  const handleOpenEditCalendarEvent = () => {
    setCalendarEventEditMode(true);
  };

  const handleOpenNewReminderFromDetail = () => {
    if (!calendarEventDetail) return;
    handleOpenCalendarComposer(
      calendarEventDetail.year,
      calendarEventDetail.monthIndex,
      calendarEventDetail.day
    );
  };

  const handleSelectVehicle = (vehicleId) => {
    updateState({ type: "select-vehicle", vehicleId });
    setActiveTab("dashboard");
  };

  const handleSelectVehicleInCurrentTab = (vehicleId) => {
    updateState({ type: "select-vehicle", vehicleId });
  };

  const handleOpenVehicleDetail = (vehicleId) => {
    updateState({ type: "select-vehicle", vehicleId });
    setVehicleDetailId(vehicleId);
  };

  const handleVehiclesTabClick = () => {
    if (activeTab === "vehicles" && vehicleDetailId) {
      setVehicleDetailId(null);
    }
    scrollAppToTop();
  };

  const handlePrimaryTabClick = () => {
    scrollAppToTop();
  };

  const updatePwaSettings = (partial) => {
    setPwaSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleSetAppIconSet = (iconSetId) => {
    const iconSet = APP_ICON_SETS.find((item) => item.id === iconSetId) || DEFAULT_APP_ICON_SET;
    updatePwaSettings({ appIcon: iconSet.appleTouch });
    notify("App icon updated. Re-add the Home Screen icon if you want the installed icon to refresh.");
  };

  const fetchServerPushPublicKey = useCallback(async () => {
    try {
      const response = await fetch("/api/push/config", { cache: "no-store" });
      if (!response.ok) return "";
      const payload = await response.json();
      return typeof payload?.publicKey === "string" ? payload.publicKey.trim() : "";
    } catch {
      return "";
    }
  }, []);

  const syncPushSubscriptionToServer = useCallback(
    async (subscription, options = {}) => {
      const { silent = true } = options;
      if (!subscription) return false;

      try {
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscription })
        });
        if (!response.ok) {
          throw new Error("Subscription sync failed.");
        }
        return true;
      } catch (error) {
        if (!silent) {
          notify(error?.message || "Unable to sync push subscription to server.");
        }
        return false;
      }
    },
    []
  );

  const removePushSubscriptionFromServer = useCallback(async (endpoint) => {
    if (typeof endpoint !== "string" || !endpoint.trim()) return false;
    try {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: endpoint.trim() })
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const triggerServerPushSweep = useCallback(async () => {
    try {
      await fetch("/api/push/sweep", {
        method: "POST",
        cache: "no-store"
      });
    } catch {
      // Server sweeps can also be triggered by cron. Ignore transient failures here.
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      updatePwaSettings({ pushAlerts: false });
      notify("Notifications are not supported on this browser.");
      return "unsupported";
    }
    const context = getNotificationContextInfo();

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission !== "granted") {
      updatePwaSettings({ pushAlerts: false });
      if (permission === "default") {
        if (!context.secure) {
          notify("No permission prompt: this session is not secure. Use HTTPS and open from Home Screen.");
        } else if (context.appleMobile && !context.standalone) {
          notify("No permission prompt: open AutoTrack from Home Screen first, then try again.");
        } else {
          notify("Notification prompt was dismissed or unavailable in this session.");
        }
      } else {
        notify("Notification permission not granted.");
      }
      return permission;
    }
    return permission;
  };

  const handleConnectIPhoneNotifications = async () => {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") return;

    updatePwaSettings({ pushAlerts: true, offlineReady: true });

    if (!("serviceWorker" in navigator)) {
      notify("Service worker support is required for PWA notifications.");
      return;
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js");
    }
    await navigator.serviceWorker.ready;
    registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      notify("Service worker failed to register.");
      return;
    }

    try {
      await registration.showNotification(HIDDEN_NOTIFICATION_TITLE, {
        body: "Notifications connected. AutoTrack alerts are now enabled.",
        icon: currentIconSet.notification,
        badge: currentIconSet.notification,
        data: { url: "/" }
      });
    } catch {
      // Ignore notification display errors; permission/subscription checks continue below.
    }

    if ("PushManager" in window) {
      let subscription = await registration.pushManager.getSubscription();
      let activeVapidPublicKey = vapidPublicKey?.trim() || "";
      if (!activeVapidPublicKey) {
        activeVapidPublicKey = await fetchServerPushPublicKey();
        if (activeVapidPublicKey) {
          setVapidPublicKey(activeVapidPublicKey);
        }
      }

      if (!subscription && activeVapidPublicKey) {
        try {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(activeVapidPublicKey)
          });
        } catch (error) {
          notify(error?.message || "Unable to create push subscription with this VAPID key.");
        }
      }
      if (subscription) {
        await syncPushSubscriptionToServer(subscription, { silent: false });
      }
      await inspectPushConnection();
      if (subscription) {
        notify("iPhone notification connection ready. Background push is connected.");
        triggerServerPushSweep();
      } else {
        notify("Connected, but remote push is not configured. Set VAPID keys on the server.");
      }
      return;
    }

    await inspectPushConnection();
    notify("Connected. PushManager is not available on this browser.");
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const handleOpenDeveloperSettings = () => {
    setDevPasscodeInput("");
    setDevPasscodeError("");
    setSettingsPage("developer-auth");
    scrollAppToTop();
  };

  const handleBackToSettingsMain = () => {
    setDevPasscodeInput("");
    setDevPasscodeError("");
    setSettingsPage("main");
    scrollAppToTop();
  };

  const handleUnlockDeveloperSettings = () => {
    if (devPasscodeInput.trim() !== DEV_SETTINGS_PASSCODE) {
      setDevPasscodeError("Incorrect passcode.");
      return;
    }
    setDevPasscodeError("");
    setDevPasscodeInput("");
    setSettingsPage("developer");
    scrollAppToTop();
  };

  const handleResetVehicleTrackingData = (vehicleId) => {
    const vehicle = state.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return;
    const confirmed = window.confirm(
      `Reset ${vehicle.name} odometer/history and restart service trackers from now?`
    );
    if (!confirmed) return;

    updateState({ type: "reset-vehicle-data", vehicleId });
    const keyPrefix = `${vehicleId}:`;
    Object.keys(autoNotificationStateRef.current).forEach((key) => {
      if (key.startsWith(keyPrefix)) {
        delete autoNotificationStateRef.current[key];
      }
    });
    persistAutoNotificationState();
    notify(`${vehicle.name} was reset.`);
  };

  const buildVehicleServiceNotification = useCallback(
    (vehicle, maintenanceType, stage = "due_soon") => {
      const stats = getMaintenanceStats(vehicle, Date.now(), maintenanceStatsOptions);
      const isOil = maintenanceType === "oil_change";
      const remainingMs = isOil ? stats.oilRemainingMs : stats.tireRemainingMs;
      const dueDateISO = isOil ? stats.oilDueDateISO : stats.tireDueDateISO;
      const body =
        stage === "preview"
          ? `${getServiceLabel(maintenanceType)} due soon for ${vehicle.name}. Current schedule: ${remainingLabel(remainingMs)}.`
          : buildServiceNotificationBody({
              vehicleName: vehicle.name,
              maintenanceType,
              stage,
              remainingMs,
              dueDateISO
            });

      return {
        title: HIDDEN_NOTIFICATION_TITLE,
        body,
        icon: currentIconSet.notification,
        url: "/"
      };
    },
    [currentIconSet.notification, maintenanceStatsOptions]
  );

  const buildDevNotificationPayload = useCallback(
    (notificationType) => {
      if ((notificationType === "oil_change" || notificationType === "tire_rotation") && selectedVehicle) {
        return buildVehicleServiceNotification(selectedVehicle, notificationType, "preview");
      }

      const vehicleName = selectedVehicle?.name || "selected vehicle";
      if (notificationType === "connected") {
        return {
          title: HIDDEN_NOTIFICATION_TITLE,
          body: "Notifications connected successfully. You're ready to receive reminders.",
          icon: currentIconSet.notification,
          url: "/"
        };
      }

      if (notificationType === "odometer") {
        return {
          title: HIDDEN_NOTIFICATION_TITLE,
          body: `Reminder: update the odometer for ${vehicleName}.`,
          icon: currentIconSet.notification,
          url: "/"
        };
      }

      return {
        title: HIDDEN_NOTIFICATION_TITLE,
        body: "Test notification delivered. Alerts are working.",
        icon: currentIconSet.notification,
        url: "/"
      };
    },
    [selectedVehicle, currentIconSet.notification, buildVehicleServiceNotification]
  );

  const sendServiceWorkerNotification = async (payload, successMessage, options = {}) => {
    const { silent = false, ensurePermission = true } = options;
    if (!("serviceWorker" in navigator)) {
      if (!silent) notify("Service worker is not available.");
      return false;
    }
    if (!pwaSettings.offlineReady) {
      if (!silent) notify("Turn on Offline ready mode first to register the service worker.");
      return false;
    }
    if (!("Notification" in window) || Notification.permission !== "granted") {
      if (!ensurePermission) return false;
      await handleConnectIPhoneNotifications();
      if (!("Notification" in window) || Notification.permission !== "granted") return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const notificationPayload = {
        type: "DEV_TEST_NOTIFICATION",
        title: payload?.title ?? HIDDEN_NOTIFICATION_TITLE,
        body: payload?.body || "New maintenance reminder.",
        icon: payload?.icon || currentIconSet.notification,
        url: payload?.url || "/"
      };

      if (registration.active) {
        registration.active.postMessage(notificationPayload);
      } else if (typeof registration.showNotification === "function") {
        await registration.showNotification(notificationPayload.title, {
          body: notificationPayload.body,
          icon: notificationPayload.icon,
          badge: notificationPayload.icon,
          data: { url: notificationPayload.url }
        });
      } else {
        if (!silent) notify("Service worker is not active yet. Try again in a moment.");
        return false;
      }
      if (!silent) notify(successMessage || "Notification sent.");
      return true;
    } catch (error) {
      if (!silent) notify(error?.message || "Unable to send service worker notification.");
      return false;
    }
  };

  const persistAutoNotificationState = useCallback(() => {
    persistSnapshotRef.current();
  }, []);

  const handleSendServiceWorkerDevNotification = async (notificationType = "test") => {
    const payload = buildDevNotificationPayload(notificationType);
    const labels = {
      oil_change: "Oil change notification sent.",
      tire_rotation: "Tire rotation notification sent.",
      connected: "Connection-ready notification sent.",
      odometer: "Odometer reminder sent.",
      test: "Test notification sent."
    };
    await sendServiceWorkerNotification(payload, labels[notificationType] || "Notification sent.");
  };

  const handleSendVehicleServiceDevNotification = async (vehicleId, maintenanceType) => {
    const vehicle = state.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return;
    const payload = buildVehicleServiceNotification(vehicle, maintenanceType, "preview");
    await sendServiceWorkerNotification(
      payload,
      `${getServiceLabel(maintenanceType)} notification sent for ${vehicle.name}.`
    );
  };

  const handlePushAlertsToggle = async () => {
    if (pwaSettings.pushAlerts) {
      updatePwaSettings({ pushAlerts: false });
      if ("serviceWorker" in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && "PushManager" in window) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
              await removePushSubscriptionFromServer(subscription.endpoint);
              await subscription.unsubscribe();
            }
          }
        } catch {
          // Ignore disconnect failures and keep local settings update.
        }
      }
      notify("Push alerts turned off.");
      return;
    }
    await handleConnectIPhoneNotifications();
  };

  useEffect(() => {
    if (!hydrated) return;
    if (vapidPublicKey?.trim()) return;
    let cancelled = false;

    const loadRuntimePushConfig = async () => {
      const runtimeKey = await fetchServerPushPublicKey();
      if (!cancelled && runtimeKey) {
        setVapidPublicKey(runtimeKey);
      }
    };

    loadRuntimePushConfig();
    return () => {
      cancelled = true;
    };
  }, [hydrated, vapidPublicKey, fetchServerPushPublicKey]);

  useEffect(() => {
    if (!hydrated) return;
    if (!pwaSettings.pushAlerts || !pwaSettings.offlineReady) return;
    if (notificationPermission !== "granted") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let disposed = false;

    const syncServerPushState = async () => {
      if (disposed) return;
      try {
        const registration = await navigator.serviceWorker.ready;
        if (!registration) return;

        let subscription = await registration.pushManager.getSubscription();
        let activeVapidPublicKey = vapidPublicKey?.trim() || "";
        if (!activeVapidPublicKey) {
          activeVapidPublicKey = await fetchServerPushPublicKey();
          if (activeVapidPublicKey && !disposed) {
            setVapidPublicKey(activeVapidPublicKey);
          }
        }
        if (!subscription && activeVapidPublicKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(activeVapidPublicKey)
          });
        }
        if (!subscription || disposed) return;

        await syncPushSubscriptionToServer(subscription, { silent: true });
        if (!disposed) {
          await triggerServerPushSweep();
        }
      } catch {
        // Ignore background sync failures; manual connect + cron can still deliver push.
      }
    };

    syncServerPushState();
    const timer = window.setInterval(syncServerPushState, 60 * 1000);
    window.addEventListener("focus", syncServerPushState);
    window.addEventListener("pageshow", syncServerPushState);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", syncServerPushState);
      window.removeEventListener("pageshow", syncServerPushState);
    };
  }, [
    hydrated,
    pwaSettings.pushAlerts,
    pwaSettings.offlineReady,
    notificationPermission,
    vapidPublicKey,
    fetchServerPushPublicKey,
    syncPushSubscriptionToServer,
    triggerServerPushSweep
  ]);

  useEffect(() => {
    if (!hydrated) return;
    if (!autoNotificationStateLoadedRef.current) return;
    if (!pwaSettings.pushAlerts || !pwaSettings.offlineReady) return;
    if (notificationPermission !== "granted") return;

    let disposed = false;
    let sweepInProgress = false;

    const runAutoNotificationSweep = async () => {
      if (disposed) return;
      if (sweepInProgress) return;
      sweepInProgress = true;
      let stateChanged = false;

      try {
        for (const vehicle of state.vehicles) {
          if (disposed) return;
          const stats = getMaintenanceStats(vehicle, Date.now(), maintenanceStatsOptions);
          const checks = [
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

          for (const item of checks) {
            if (disposed) return;
            const stage = getNotificationStage(item.remainingMs, item.windowMs);
            const mapKey = `${vehicle.id}:${item.maintenanceType}`;

            if (!stage) {
              if (autoNotificationStateRef.current[mapKey]) {
                delete autoNotificationStateRef.current[mapKey];
                stateChanged = true;
              }
              continue;
            }

            const stageKey = getNotificationStageKey(stage, item.dueDateISO);
            if (autoNotificationStateRef.current[mapKey] === stageKey) {
              continue;
            }

            const payload = buildVehicleServiceNotification(vehicle, item.maintenanceType, stage);
            const sent = await sendServiceWorkerNotification(payload, "", {
              silent: true,
              ensurePermission: false
            });
            if (!sent || disposed) continue;

            autoNotificationStateRef.current[mapKey] = stageKey;
            stateChanged = true;
          }
        }
      } finally {
        sweepInProgress = false;
      }

      if (stateChanged) {
        persistAutoNotificationState();
      }
    };

    runAutoNotificationSweep();
    const timer = window.setInterval(runAutoNotificationSweep, AUTO_NOTIFICATION_POLL_MS);
    const runWhenVisible = () => {
      if (document.visibilityState === "visible") {
        runAutoNotificationSweep();
      }
    };

    window.addEventListener("focus", runAutoNotificationSweep);
    window.addEventListener("pageshow", runAutoNotificationSweep);
    document.addEventListener("visibilitychange", runWhenVisible);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", runAutoNotificationSweep);
      window.removeEventListener("pageshow", runAutoNotificationSweep);
      document.removeEventListener("visibilitychange", runWhenVisible);
    };
  }, [
    hydrated,
    pwaSettings.pushAlerts,
    pwaSettings.offlineReady,
    notificationPermission,
    state.vehicles,
    maintenanceStatsOptions,
    buildVehicleServiceNotification,
    sendServiceWorkerNotification,
    persistAutoNotificationState
  ]);

  const followSystem = themePreference === "system";
  const turnSystemMode = (enabled) => {
    if (enabled) {
      setThemePreference("system");
      return;
    }
    setThemePreference(resolvedTheme === "dark" ? "dark" : "light");
  };

  const historyEntries = selectedVehicle
    ? state.history.filter((entry) => entry.vehicleId === selectedVehicle.id)
    : [];

  const stats = selectedVehicle
    ? getMaintenanceStats(selectedVehicle, maintenanceNowMs, maintenanceStatsOptions)
    : null;
  const getVehicleImageStyle = (vehicle) =>
    vehicle?.imageScale || vehicle?.imageShiftX
      ? {
          "--vehicle-image-scale": vehicle.imageScale || 1,
          "--vehicle-image-shift-x": vehicle.imageShiftX || "0px"
        }
      : undefined;
  const formattedOdometer = selectedVehicle ? formatMileage(selectedVehicle.odometer) : "";
  const odometerSizeClass =
    formattedOdometer.length > 13 ? "xcompact" : formattedOdometer.length > 10 ? "compact" : "";
  const selectedVehicleEvents = selectedVehicle ? calendarEvents[selectedVehicle.id] || [] : [];
  const selectedDayEvents = useMemo(() => {
    if (!calendarComposer || !selectedVehicle) return [];
    const targetKey = `${calendarComposer.year}-${calendarComposer.monthIndex}-${calendarComposer.day}`;
    return selectedVehicleEvents.filter((entry) => {
      const date = new Date(entry.dateISO);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === targetKey;
    });
  }, [calendarComposer, selectedVehicle, selectedVehicleEvents]);
  const selectedCalendarEvent = useMemo(() => {
    if (!calendarEventDetail) return null;
    return (
      selectedVehicleEvents.find((entry) => entry.id === calendarEventDetail.eventId) || null
    );
  }, [calendarEventDetail, selectedVehicleEvents]);
  const upcomingTireSchedule = useMemo(() => {
    if (!selectedVehicle) return [];
    return getUpcomingServiceSchedule(
      selectedVehicle.lastTireRotationDateISO,
      selectedVehicle.odometer,
      selectedVehicle.tireIntervalMonths,
      selectedVehicle.tireInterval,
      selectedVehicle.serviceOverrides?.tire_rotation,
      { horizonMonths: 12, maxEntries: 4 }
    );
  }, [
    selectedVehicle?.id,
    selectedVehicle?.odometer,
    selectedVehicle?.lastTireRotationDateISO,
    selectedVehicle?.tireIntervalMonths,
    selectedVehicle?.tireInterval,
    selectedVehicle?.serviceOverrides?.tire_rotation
  ]);
  const upcomingOilSchedule = useMemo(() => {
    if (!selectedVehicle) return [];
    return getUpcomingServiceSchedule(
      selectedVehicle.lastOilChangeDateISO,
      selectedVehicle.odometer,
      selectedVehicle.oilIntervalMonths,
      selectedVehicle.oilInterval,
      selectedVehicle.serviceOverrides?.oil_change,
      { horizonMonths: 12, maxEntries: 2 }
    );
  }, [
    selectedVehicle?.id,
    selectedVehicle?.odometer,
    selectedVehicle?.lastOilChangeDateISO,
    selectedVehicle?.oilIntervalMonths,
    selectedVehicle?.oilInterval,
    selectedVehicle?.serviceOverrides?.oil_change
  ]);
  const isDashboardTab = activeTab === "dashboard";
  const isVehicleDetailView = activeTab === "vehicles" && Boolean(vehicleDetail);
  const isVehiclesTab = activeTab === "vehicles";
  const isHistoryTab = activeTab === "history";
  const isCalendarTab = activeTab === "reminders";
  const isSettingsTab = activeTab === "settings";
  const isSelectorHeaderTab = isDashboardTab || isHistoryTab || isCalendarTab;
  const selectorHeaderTitle = isDashboardTab ? "Dashboard" : isHistoryTab ? "History" : "Calendar";
  const isSimpleTitleTab = isSettingsTab;
  const simpleTabTitle = "Settings";
  const vehicleProfile = vehicleDetail ? VEHICLE_PROFILE_VALUES[vehicleDetail.id] || {} : {};
  const permissionLabel =
    notificationPermission === "granted"
      ? "Allowed"
      : notificationPermission === "denied"
        ? "Blocked"
        : notificationPermission === "unsupported"
          ? "Unsupported"
          : "Not Set";
  return (
    <div className="shell" ref={shellRef}>
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <header
          className={`appHeader ${
            isVehicleDetailView
              ? "vehicleSummaryHeader"
              : isVehiclesTab || isSimpleTitleTab
                ? "vehiclesHeader"
                : isSelectorHeaderTab
                  ? "dashboardHeader"
                  : ""
          }`}
        >
          {isVehicleDetailView ? (
            <>
              <button
                type="button"
                className="iconBackButton headerBackButton"
                onClick={() => setVehicleDetailId(null)}
                aria-label="Back to vehicles"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="m14.5 5.8-6.2 6.2 6.2 6.2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="vehicleSummaryHeaderTitle">
                <p className="eyebrow">Family Garage</p>
                <h1>Vehicle Summary</h1>
              </div>
            </>
          ) : isVehiclesTab ? (
            <div>
              <p className="eyebrow">Family Garage</p>
              <h1>Vehicles</h1>
            </div>
          ) : isSelectorHeaderTab ? (
            <>
              <div className="dashboardHeaderTitle">
                <p className="eyebrow">AutoTrack</p>
                <h1>{selectorHeaderTitle}</h1>
              </div>
              {state.vehicles.length > 0 && (
                <div className="dashboardVehicleControl" ref={dashboardMenuRef}>
                  <button
                    type="button"
                    className={`dashboardVehicleButton ${dashboardMenuOpen ? "open" : ""}`}
                    aria-haspopup="menu"
                    aria-expanded={dashboardMenuOpen}
                    aria-label="Open AutoTrack vehicle list"
                    onClick={() => setDashboardMenuOpen((prev) => !prev)}
                  >
                    <NavIcon type="vehicles" />
                  </button>

                  {dashboardMenuOpen && (
                    <div className="dashboardVehicleMenu" role="menu" aria-label="AutoTrack">
                      <p className="dashboardVehicleMenuTitle">AUTOTRACK</p>
                      <ul className="dashboardVehicleMenuList">
                        {state.vehicles.map((vehicle) => {
                          const active = state.selectedVehicleId === vehicle.id;
                          return (
                            <li key={vehicle.id}>
                              <button
                                type="button"
                                role="menuitemradio"
                                aria-checked={active}
                                className={`dashboardVehicleOption ${active ? "active" : ""}`}
                                onClick={() => {
                                  handleSelectVehicleInCurrentTab(vehicle.id);
                                  setDashboardMenuOpen(false);
                                }}
                              >
                                <span className="dashboardVehicleOptionName">{vehicle.name}</span>
                                {active && <span className="dashboardVehicleOptionMeta">Current</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : isSimpleTitleTab ? (
            <div>
              <p className="eyebrow">AutoTrack</p>
              <h1>{simpleTabTitle}</h1>
            </div>
          ) : (
            <>
              <div>
                <p className="eyebrow">Family Garage</p>
                <h1>AutoTrack</h1>
              </div>
              {state.vehicles.length > 0 && (
                <label className="picker">
                  Vehicle
                  <select
                    value={state.selectedVehicleId || ""}
                    onChange={(event) => handleSelectVehicle(event.target.value)}
                  >
                    {state.vehicles.map((vehicle) => (
                      <option value={vehicle.id} key={vehicle.id}>
                        {vehicle.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
        </header>

        {flash && <p className="flash">{flash}</p>}

        <Tabs.Content value="dashboard" className="view dashboardView">
          {selectedVehicle ? (
            <>
              <section className="card dashboardVehicleCard">
                <div className="vehicleImageFrame dashboardVehicleFrame">
                  <img
                    className="vehicleDetailImage"
                    src={selectedVehicle.image}
                    alt={`${selectedVehicle.name} horizontal side view`}
                    style={getVehicleImageStyle(selectedVehicle)}
                  />
                </div>
                <h2 className="vehicleDetailName dashboardVehicleName">{selectedVehicle.name}</h2>
              </section>

              <section className="card dashboardMileageCard">
                <button
                  type="button"
                  className="odometerEditButton"
                  onClick={handleOpenOdometerEditor}
                  aria-label="Edit odometer"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4.8 16.2v3h3l8.8-8.8-3-3-8.8 8.8Zm11.1-10.4 1.7-1.7a1.1 1.1 0 0 1 1.5 0l1 1a1.1 1.1 0 0 1 0 1.5l-1.7 1.7-2.5-2.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="dashboardSectionHead">
                  <div>
                    <p className="eyebrow">Current Mileage</p>
                    <h2>Odometer</h2>
                  </div>
                  <p className={`dashboardMileageValue ${odometerSizeClass}`}>{formattedOdometer}</p>
                </div>
              </section>

              <section className="card dashboardMaintenanceCard">
                <div className="dashboardMaintenanceHead">
                  <p className="eyebrow">Maintenance</p>
                  <h3>Service Tracker</h3>
                </div>
                <div className="dashboardMaintenanceList">
                  <MaintenanceMetric
                    title="Tire Rotation"
                    remainingMs={stats.tireRemainingMs}
                    progress={stats.tireProgress}
                    lastServiceDateISO={selectedVehicle.lastTireRotationDateISO}
                    intervalMonths={selectedVehicle.tireIntervalMonths}
                    intervalMiles={selectedVehicle.tireInterval}
                    actionLabel="Reset Tire Tracker"
                    onLog={() => handleAskMaintenanceReset("tire_rotation")}
                  />
                  <MaintenanceMetric
                    title="Oil Change"
                    remainingMs={stats.oilRemainingMs}
                    progress={stats.oilProgress}
                    lastServiceDateISO={selectedVehicle.lastOilChangeDateISO}
                    intervalMonths={selectedVehicle.oilIntervalMonths}
                    intervalMiles={selectedVehicle.oilInterval}
                    actionLabel="Reset Oil Tracker"
                    onLog={() => handleAskMaintenanceReset("oil_change")}
                  />
                </div>
              </section>

            </>
          ) : (
            <section className="card">
              <h2>No Vehicle Selected</h2>
              <p>Select a vehicle from the Vehicles tab to continue.</p>
            </section>
          )}
        </Tabs.Content>

        <Tabs.Content value="vehicles" className={`view ${isVehicleDetailView ? "vehiclesDetailView" : "vehiclesListView"}`}>
          {vehicleDetail ? (
            <section className="card vehiclesSection">
              <div className="vehicleDetailHero">
                <div className="vehicleImageFrame">
                  <img
                    className="vehicleDetailImage"
                    src={vehicleDetail.image}
                    alt={`${vehicleDetail.name} horizontal side view`}
                    style={getVehicleImageStyle(vehicleDetail)}
                  />
                </div>
                <h2 className="vehicleDetailName">{vehicleDetail.name}</h2>
                <div className="vehicleProfileSections">
                  {VEHICLE_PROFILE_SECTIONS.map((section) => (
                    <section className="vehicleProfileCard" key={section.title}>
                      <h3 className="vehicleProfileTitle">{section.title}</h3>
                      <ul className="vehicleProfileList">
                        {section.fields.map((field) => {
                          const rawProfileValue = vehicleProfile[field];
                          const displayValue = resolveVehicleProfileValue(vehicleDetail, vehicleProfile, field);
                          return (
                            <li
                              className={`vehicleProfileRow ${
                                isUserTrackedProfileField(field, rawProfileValue) ? "needsUserTracked" : ""
                              }`}
                              key={field}
                            >
                              <span className="vehicleProfileLabel">{field}</span>
                              <span className="vehicleProfileValue">{displayValue}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="card vehiclesSection">
              <p className="tiny vehiclesIntro">Select a vehicle to open its information page.</p>
              <div className="vehicleList">
                {state.vehicles.map((vehicle) => {
                  const active = state.selectedVehicleId === vehicle.id;
                  return (
                    <button
                      type="button"
                      className={`vehicleSelectCard ${active ? "active" : ""}`}
                      key={vehicle.id}
                      onClick={() => handleOpenVehicleDetail(vehicle.id)}
                    >
                      <div className="vehicleThumbFrame">
                        <img
                          className="vehicleThumb"
                          src={vehicle.image}
                          alt={`${vehicle.name} horizontal side view`}
                          style={getVehicleImageStyle(vehicle)}
                        />
                      </div>
                      <span className="vehicleSelectName">{vehicle.name}</span>
                      <span className="vehicleSelectHint">
                        {active ? "Current vehicle" : "Open details"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </Tabs.Content>

        <Tabs.Content value="history" className="view historyView">
          <section className="card historyPanel">
            <div className="historyHead">
              <h2>History</h2>
            </div>
            {historyEntries.length === 0 ? (
              <p className="tiny">No entries yet. Maintenance and mileage updates appear here.</p>
            ) : (
              <ul className="historyList">
                {historyEntries.map((entry) => {
                  const vehicleName =
                    state.vehicles.find((vehicle) => vehicle.id === entry.vehicleId)?.name ||
                    "Unknown vehicle";
                  return (
                    <li className="historyItem" key={entry.id}>
                      <div className="historyTop">
                        <strong>{EVENT_LABELS[entry.type] || entry.type}</strong>
                        <span>{formatDate(entry.dateISO)}</span>
                      </div>
                      <p>
                        {vehicleName} • {formatMileage(entry.mileage)}
                      </p>
                      <p className="tiny">{entry.details}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Tabs.Content>

        <Tabs.Content value="settings" className="view settingsView">
          {settingsPage === "main" ? (
            <>
              <section className="card settingsCard">
                <button
                  type="button"
                  className="installGuideToggle"
                  onClick={() => setInstallGuideOpen((prev) => !prev)}
                  aria-expanded={installGuideOpen}
                >
                  <div className="installGuideToggleText">
                    <h3 style={{ margin: 0 }}>Install on iPhone</h3>
                    <p className="tiny">Safari setup steps for PWA install and notifications.</p>
                  </div>
                  <svg
                    className={`installGuideChevron ${installGuideOpen ? "open" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {installGuideOpen && (
                  <div className="installGuideBody">
                    <ol className="installGuideList">
                      <li>Open AutoTrack in Safari, not Chrome or another browser.</li>
                      <li>Tap the Share button, then choose Add Bookmark (optional backup link).</li>
                      <li>Tap Share again, choose Add to Home Screen, turn on Open as Web App, then tap Add.</li>
                      <li>Open AutoTrack from your Home Screen icon to run in app mode.</li>
                      <li>Go to Settings in AutoTrack and turn Push alerts On.</li>
                      <li>When prompted, tap Allow notifications.</li>
                      <li>On iPhone, go to Settings &gt; Notifications &gt; AutoTrack and verify alerts are enabled.</li>
                    </ol>
                    <p className="tiny settingsHint">
                      If app icon or manifest settings change, remove the Home Screen icon and add it again.
                    </p>
                  </div>
                )}
              </section>

              <section className="card settingsCard">
                <div className="settingsHead">
                  <h2>Appearance</h2>
                  <p className="tiny">Keep the app readable in any environment.</p>
                </div>
                <div className="settingsBody">
                  <div className="settingRow">
                    <div>
                      <strong>Follow device theme</strong>
                      <p className="tiny">Automatically use your phone light or dark mode.</p>
                    </div>
                    <button
                      type="button"
                      className={`switchButton ${followSystem ? "active" : ""}`}
                      onClick={() => turnSystemMode(!followSystem)}
                    >
                      {followSystem ? "On" : "Off"}
                    </button>
                  </div>

                  <div className={`modeGroup ${followSystem ? "disabled" : ""}`}>
                    <p className="settingsLabel">Manual theme</p>
                    <div className="choiceGrid">
                      <button
                        type="button"
                        className={`optionButton ${themePreference === "light" ? "active" : ""}`}
                        onClick={() => setThemePreference("light")}
                        disabled={followSystem}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        className={`optionButton ${themePreference === "dark" ? "active" : ""}`}
                        onClick={() => setThemePreference("dark")}
                        disabled={followSystem}
                      >
                        Dark
                      </button>
                    </div>
                  </div>

                  <div className="modeGroup">
                    <p className="settingsLabel">App icon</p>
                    <div className="choiceGrid">
                      {APP_ICON_SETS.map((iconSet) => (
                        <button
                          key={iconSet.id}
                          type="button"
                          className={`optionButton ${selectedAppIconSetId === iconSet.id ? "active" : ""}`}
                          onClick={() => handleSetAppIconSet(iconSet.id)}
                        >
                          {iconSet.label}
                        </button>
                      ))}
                    </div>
                    <p className="tiny settingsHint">
                      If AutoTrack is already installed, remove and re-add it to Home Screen to apply icon changes.
                    </p>
                  </div>
                </div>
              </section>

              <section className="card settingsCard">
                <div className="settingsHead">
                  <h3>Notifications</h3>
                  <p className="tiny">Connect your installed PWA to iPhone notifications.</p>
                </div>
                <div className="settingsBody">
                  <div className="settingRow">
                    <div>
                      <strong>Push alerts</strong>
                      <p className="tiny">Send reminder notifications for upcoming service.</p>
                    </div>
                    <button
                      type="button"
                      className={`switchButton ${pwaSettings.pushAlerts ? "active" : ""}`}
                      onClick={handlePushAlertsToggle}
                    >
                      {pwaSettings.pushAlerts ? "On" : "Off"}
                    </button>
                  </div>

                  <div className="settingMetaRow">
                    <span>Permission</span>
                    <strong>{permissionLabel}</strong>
                  </div>
                  <div className="settingMetaRow">
                    <span>App Mode</span>
                    <strong>{isStandalone ? "Installed" : "Browser"}</strong>
                  </div>

                  <div className="buttonRow settingsActions">
                    <button type="button" className="optionButton active" onClick={handleConnectIPhoneNotifications}>
                      Connect Notifications
                    </button>
                    {installPrompt && (
                      <button type="button" className="optionButton" onClick={handleInstallApp}>
                        Install App
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="card settingsCard">
                <div className="settingsHead">
                  <h3>Developer</h3>
                  <p className="tiny">Open developer tools for notification testing (passcode required).</p>
                </div>
                <button type="button" className="optionButton active" onClick={handleOpenDeveloperSettings}>
                  Open Developer Settings
                </button>
              </section>
            </>
          ) : settingsPage === "developer-auth" ? (
            <section className="card settingsCard devSettingsPage">
              <div className="devSettingsTop">
                <button
                  type="button"
                  className="iconBackButton"
                  onClick={handleBackToSettingsMain}
                  aria-label="Back to settings"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="m14.5 5.8-6.2 6.2 6.2 6.2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="settingsHead">
                  <h2>Developer Access</h2>
                  <p className="tiny">Enter passcode to open developer settings.</p>
                </div>
              </div>

              <div className="settingsBody">
                <section className="devBlock">
                  <label className="modalInputWrap">
                    Passcode
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={8}
                      value={devPasscodeInput}
                      onChange={(event) => {
                        setDevPasscodeInput(event.target.value);
                        if (devPasscodeError) setDevPasscodeError("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleUnlockDeveloperSettings();
                        }
                      }}
                    />
                  </label>
                  {devPasscodeError ? <p className="tiny">{devPasscodeError}</p> : null}
                  <div className="buttonRow settingsActions">
                    <button
                      type="button"
                      className="optionButton active"
                      onClick={handleUnlockDeveloperSettings}
                    >
                      Unlock Developer Settings
                    </button>
                  </div>
                </section>
              </div>
            </section>
          ) : (
            <section className="card settingsCard devSettingsPage">
              <div className="devSettingsTop">
                <button
                  type="button"
                  className="iconBackButton"
                  onClick={handleBackToSettingsMain}
                  aria-label="Back to settings"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="m14.5 5.8-6.2 6.2 6.2 6.2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <div className="settingsHead">
                  <h2>Developer Settings</h2>
                  <p className="tiny">Test PWA notifications and icon behavior.</p>
                </div>
              </div>

              <div className="settingsBody">
                <section className="devBlock">
                  <h3>2017 Honda Test Timer</h3>
                  <p className="tiny">
                    Turn on 1-minute oil/tire due timing for the 2017 Honda Accord only. Turn off to use normal service intervals.
                  </p>
                  <div className="settingRow">
                    <div>
                      <strong>1-minute mode</strong>
                      <p className="tiny">Affects dashboard progress and due notifications for 2017 Honda only.</p>
                    </div>
                    <button
                      type="button"
                      className={`switchButton ${pwaSettings.honda2017TestMode ? "active" : ""}`}
                      onClick={() =>
                        updatePwaSettings({ honda2017TestMode: !pwaSettings.honda2017TestMode })
                      }
                    >
                      {pwaSettings.honda2017TestMode ? "On" : "Off"}
                    </button>
                  </div>
                </section>

                <section className="devBlock">
                  <h3>Reset Vehicle Data</h3>
                  <p className="tiny">
                    Reset odometer, clear history for that vehicle, and restart oil/tire date tracking from now.
                  </p>
                  <div className="devVehicleTestList">
                    {state.vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="devVehicleTestRow devVehicleResetRow">
                        <p>{vehicle.name}</p>
                        <div className="buttonRow settingsActions devVehicleResetButtons">
                          <button
                            type="button"
                            className="optionButton"
                            onClick={() => handleResetVehicleTrackingData(vehicle.id)}
                          >
                            Reset Odometer + History
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="devBlock">
                  <h3>Notification Templates</h3>
                  <p className="tiny">
                    Every test uses the app icon with no extra title and a formatted reminder message.
                  </p>
                  <div className="buttonRow settingsActions">
                    <button
                      type="button"
                      className="optionButton active"
                      onClick={() => handleSendServiceWorkerDevNotification("oil_change")}
                    >
                      Oil Change
                    </button>
                    <button
                      type="button"
                      className="optionButton"
                      onClick={() => handleSendServiceWorkerDevNotification("tire_rotation")}
                    >
                      Tire Rotation
                    </button>
                  </div>
                  <div className="buttonRow settingsActions">
                    <button
                      type="button"
                      className="optionButton"
                      onClick={() => handleSendServiceWorkerDevNotification("connected")}
                    >
                      First Connection
                    </button>
                    <button
                      type="button"
                      className="optionButton"
                      onClick={() => handleSendServiceWorkerDevNotification("odometer")}
                    >
                      Odometer Reminder
                    </button>
                  </div>
                  <div className="buttonRow settingsActions">
                    <button
                      type="button"
                      className="optionButton"
                      onClick={() => handleSendServiceWorkerDevNotification("test")}
                    >
                      Test Notification
                    </button>
                  </div>
                  <div className="devVehicleTestList">
                    {state.vehicles.map((vehicle) => (
                      <div key={vehicle.id} className="devVehicleTestRow">
                        <p>{vehicle.name}</p>
                        <div className="buttonRow settingsActions devVehicleButtons">
                          <button
                            type="button"
                            className="optionButton"
                            onClick={() =>
                              handleSendVehicleServiceDevNotification(vehicle.id, "oil_change")
                            }
                          >
                            Oil Change
                          </button>
                          <button
                            type="button"
                            className="optionButton"
                            onClick={() =>
                              handleSendVehicleServiceDevNotification(vehicle.id, "tire_rotation")
                            }
                          >
                            Tire Rotation
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="tiny">
                    Service worker tests are closest to production push behavior. Background delivery while app is closed requires the backend sweep endpoint to run on a schedule.
                  </p>
                </section>

              </div>
            </section>
          )}
        </Tabs.Content>

        <Tabs.Content value="reminders" className="view calendarView">
          <section className="serviceSchedule schedulePanel" aria-label="Service schedule">
            <section className="card serviceScheduleSection">
              <div className="serviceScheduleHead">
                <h3>Tire Rotation</h3>
              </div>

              {!selectedVehicle ? (
                <p className="tiny">Select a vehicle to view schedule details.</p>
              ) : (
                <div className="serviceScheduleList">
                  {upcomingTireSchedule.map((item, index) => (
                    <article key={`tire-${item.dateISO}-${item.targetMileage}-${index}`} className="serviceScheduleCard">
                      <p className="serviceScheduleDate">{formatScheduleDate(item.dateISO)}</p>
                      <dl className="serviceScheduleMeta">
                        <div>
                          <dt>Vehicle</dt>
                          <dd>{selectedVehicle.name}</dd>
                        </div>
                        <div>
                          <dt>Odometer</dt>
                          <dd className="serviceScheduleOdometerValue">
                            {formatMileage(selectedVehicle.odometer)}
                          </dd>
                        </div>
                        <div>
                          <dt>Last Tire Rotation</dt>
                          <dd>
                            {formatDate(selectedVehicle.lastTireRotationDateISO)} ·{" "}
                            {formatMileage(selectedVehicle.lastTireRotationOdometer)}
                          </dd>
                        </div>
                        <div>
                          <dt>Next Tire Rotation</dt>
                          <dd>
                            {formatScheduleDate(item.dateISO)} · {formatMileage(item.targetMileage)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="card serviceScheduleSection">
              <div className="serviceScheduleHead">
                <h3>Oil Change</h3>
              </div>

              {!selectedVehicle ? (
                <p className="tiny">Select a vehicle to view schedule details.</p>
              ) : (
                <div className="serviceScheduleList">
                  {upcomingOilSchedule.map((item, index) => (
                    <article key={`oil-${item.dateISO}-${item.targetMileage}-${index}`} className="serviceScheduleCard">
                      <p className="serviceScheduleDate">{formatScheduleDate(item.dateISO)}</p>
                      <dl className="serviceScheduleMeta">
                        <div>
                          <dt>Vehicle</dt>
                          <dd>{selectedVehicle.name}</dd>
                        </div>
                        <div>
                          <dt>Odometer</dt>
                          <dd className="serviceScheduleOdometerValue">
                            {formatMileage(selectedVehicle.odometer)}
                          </dd>
                        </div>
                        <div>
                          <dt>Last Oil Change</dt>
                          <dd>
                            {formatDate(selectedVehicle.lastOilChangeDateISO)} ·{" "}
                            {formatMileage(selectedVehicle.lastOilChangeOdometer)}
                          </dd>
                        </div>
                        <div>
                          <dt>Next Oil Change</dt>
                          <dd>
                            {formatScheduleDate(item.dateISO)} · {formatMileage(item.targetMileage)}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </Tabs.Content>

        {odometerEditorOpen && selectedVehicle && createPortal(
          <div className="modalOverlay" role="presentation">
            <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="odometer-modal-title">
              <h3 id="odometer-modal-title" className="modalTitle">Update Odometer</h3>
              <p className="modalMessage">Enter the current odometer reading for:</p>
              <p className="modalVehicleName">{selectedVehicle.name}</p>
              <label className="modalInputWrap">
                Current mileage
                <input
                  type="number"
                  min={selectedVehicle.odometer}
                  step="1"
                  value={odometerDraft}
                  onChange={(event) => setOdometerDraft(event.target.value)}
                  autoFocus
                />
              </label>
              <div className="modalActions">
                <button type="button" className="modalButton secondary" onClick={() => setOdometerEditorOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="modalButton primary" onClick={handleSaveOdometer}>
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {maintenanceConfirm && selectedVehicle && (
          <div className="modalOverlay" role="presentation">
            <div className="modalCard" role="dialog" aria-modal="true" aria-labelledby="maintenance-modal-title">
              <h3 id="maintenance-modal-title" className="modalTitle">
                {maintenanceConfirm.maintenanceType === "oil_change" ? "Confirm Oil Change" : "Confirm Tire Rotation"}
              </h3>
              <p className="modalMessage">
                {maintenanceConfirm.maintenanceType === "oil_change"
                  ? `Did you complete an oil change for ${selectedVehicle.name}?`
                  : `Did you complete a tire rotation for ${selectedVehicle.name}?`}
              </p>
              <p className="modalSubtext">Choosing Yes will reset this service tracker from today.</p>
              <div className="modalActions">
                <button
                  type="button"
                  className="modalButton secondary"
                  onClick={() => setMaintenanceConfirm(null)}
                >
                  No
                </button>
                <button type="button" className="modalButton primary" onClick={handleConfirmMaintenanceReset}>
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {calendarEventDetail && selectedVehicle && selectedCalendarEvent && (
          <div className="modalOverlay" role="presentation">
            <div
              className="modalCard calendarComposerCard calendarEventDetailCard"
              role="dialog"
              aria-modal="true"
              aria-labelledby="calendar-detail-title"
            >
              {!calendarEventEditMode ? (
                <>
                  <button
                    type="button"
                    className="odometerEditButton calendarEventEditButton"
                    aria-label="Edit reminder"
                    onClick={handleOpenEditCalendarEvent}
                  >
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M4.8 16.2v3h3l8.8-8.8-3-3-8.8 8.8Zm11.1-10.4 1.7-1.7a1.1 1.1 0 0 1 1.5 0l1 1a1.1 1.1 0 0 1 0 1.5l-1.7 1.7-2.5-2.5Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <h3 id="calendar-detail-title" className="modalTitle calendarEventTitlePad">Reminder Details</h3>
                  <p className="modalMessage">
                    {new Date(selectedCalendarEvent.dateISO).toLocaleString(undefined, {
                      weekday: "short",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit"
                    })}
                  </p>
                  <p className="modalSubtext">{selectedVehicle.name}</p>

                  <div className="calendarEventInfoList">
                    <p>
                      <span>Title</span>
                      <strong>{selectedCalendarEvent.title}</strong>
                    </p>
                    <p>
                      <span>Location</span>
                      <strong>{selectedCalendarEvent.location}</strong>
                    </p>
                    <p>
                      <span>Service</span>
                      <strong>
                        {selectedCalendarEvent.serviceType === "oil_change" ? "Oil Change" : "Tire Rotation"}
                      </strong>
                    </p>
                    <p>
                      <span>Remind me</span>
                      <strong>{reminderLabelFromValue(selectedCalendarEvent.remindLead)}</strong>
                    </p>
                  </div>

                  <button type="button" className="calendarAddReminderButton" onClick={handleOpenNewReminderFromDetail}>
                    Add New Reminder
                  </button>

                  <div className="modalActions single">
                    <button type="button" className="modalButton secondary" onClick={handleCloseCalendarEventDetail}>
                      Close
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 id="calendar-detail-title" className="modalTitle">Edit Reminder</h3>
                  <p className="modalSubtext">{selectedVehicle.name}</p>

                  <label className="modalInputWrap">
                    Title
                    <input
                      type="text"
                      placeholder="Service title"
                      value={calendarEventEditDraft.title}
                      onChange={(event) =>
                        setCalendarEventEditDraft((prev) => ({ ...prev, title: event.target.value }))
                      }
                    />
                  </label>

                  <label className="modalInputWrap">
                    Location
                    <input
                      type="text"
                      placeholder="Shop or address"
                      value={calendarEventEditDraft.location}
                      onChange={(event) =>
                        setCalendarEventEditDraft((prev) => ({ ...prev, location: event.target.value }))
                      }
                    />
                  </label>

                  <div className="calendarComposerRow">
                    <div className="modalInputWrap">
                      <span>Service</span>
                      <div className="calendarPickerList" role="radiogroup" aria-label="Service type">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={calendarEventEditDraft.serviceType === "tire_rotation"}
                          className={`calendarPickerOption ${
                            calendarEventEditDraft.serviceType === "tire_rotation" ? "active" : ""
                          }`}
                          onClick={() =>
                            setCalendarEventEditDraft((prev) => ({ ...prev, serviceType: "tire_rotation" }))
                          }
                        >
                          Tire Rotation
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={calendarEventEditDraft.serviceType === "oil_change"}
                          className={`calendarPickerOption ${
                            calendarEventEditDraft.serviceType === "oil_change" ? "active" : ""
                          }`}
                          onClick={() =>
                            setCalendarEventEditDraft((prev) => ({ ...prev, serviceType: "oil_change" }))
                          }
                        >
                          Oil Change
                        </button>
                      </div>
                    </div>

                <label className="modalInputWrap calendarTimeField">
                  Time
                  <input
                    type="time"
                    className="calendarTimeInput"
                    value={calendarEventEditDraft.time}
                    onChange={(event) =>
                      setCalendarEventEditDraft((prev) => ({ ...prev, time: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="modalInputWrap">
                    <span>Remind me</span>
                    <div className="calendarReminderList" role="radiogroup" aria-label="Reminder lead time">
                      {REMINDER_PRESETS.map((preset) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={calendarEventEditDraft.remindLead === preset.value}
                          className={`calendarReminderOption ${
                            calendarEventEditDraft.remindLead === preset.value ? "active" : ""
                          }`}
                          onClick={() =>
                            setCalendarEventEditDraft((prev) => ({ ...prev, remindLead: preset.value }))
                          }
                          key={`edit-${preset.value}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="modalActions">
                    <button
                      type="button"
                      className="modalButton secondary"
                      onClick={() => setCalendarEventEditMode(false)}
                    >
                      Cancel
                    </button>
                    <button type="button" className="modalButton primary" onClick={handleSaveEditedCalendarEvent}>
                      Save
                    </button>
                  </div>
                  <button type="button" className="modalDangerButton" onClick={handleDeleteCalendarEvent}>
                    Delete Reminder
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {calendarComposer && selectedVehicle && (
          <div className="modalOverlay" role="presentation">
            <div className="modalCard calendarComposerCard" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
              <h3 id="calendar-modal-title" className="modalTitle">Service Reminder</h3>
              <p className="modalMessage">
                {new Date(calendarComposer.year, calendarComposer.monthIndex, calendarComposer.day).toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "long", day: "numeric", year: "numeric" }
                )}
              </p>
              <p className="modalSubtext">{selectedVehicle.name}</p>

              <label className="modalInputWrap">
                Title
                <input
                  type="text"
                  placeholder="Service title"
                  value={calendarEventDraft.title}
                  onChange={(event) =>
                    setCalendarEventDraft((prev) => ({ ...prev, title: event.target.value }))
                  }
                />
              </label>

              <label className="modalInputWrap">
                Location
                <input
                  type="text"
                  placeholder="Shop or address"
                  value={calendarEventDraft.location}
                  onChange={(event) =>
                    setCalendarEventDraft((prev) => ({ ...prev, location: event.target.value }))
                  }
                />
              </label>

              <div className="calendarComposerRow">
                <div className="modalInputWrap">
                  <span>Service</span>
                  <div className="calendarPickerList" role="radiogroup" aria-label="Service type">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={calendarEventDraft.serviceType === "tire_rotation"}
                      className={`calendarPickerOption ${
                        calendarEventDraft.serviceType === "tire_rotation" ? "active" : ""
                      }`}
                      onClick={() =>
                        setCalendarEventDraft((prev) => ({ ...prev, serviceType: "tire_rotation" }))
                      }
                    >
                      Tire Rotation
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={calendarEventDraft.serviceType === "oil_change"}
                      className={`calendarPickerOption ${
                        calendarEventDraft.serviceType === "oil_change" ? "active" : ""
                      }`}
                      onClick={() =>
                        setCalendarEventDraft((prev) => ({ ...prev, serviceType: "oil_change" }))
                      }
                    >
                      Oil Change
                    </button>
                  </div>
                </div>

                <label className="modalInputWrap calendarTimeField">
                  Time
                  <input
                    type="time"
                    className="calendarTimeInput"
                    value={calendarEventDraft.time}
                    onChange={(event) =>
                      setCalendarEventDraft((prev) => ({ ...prev, time: event.target.value }))
                    }
                  />
                </label>
              </div>

              <div className="modalInputWrap">
                <span>Remind me</span>
                <div className="calendarReminderList" role="radiogroup" aria-label="Reminder lead time">
                  {REMINDER_PRESETS.map((preset) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={calendarEventDraft.remindLead === preset.value}
                      className={`calendarReminderOption ${
                        calendarEventDraft.remindLead === preset.value ? "active" : ""
                      }`}
                      onClick={() =>
                        setCalendarEventDraft((prev) => ({ ...prev, remindLead: preset.value }))
                      }
                      key={preset.value}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedDayEvents.length > 0 && (
                <div className="calendarComposerExisting">
                  <p className="tiny">Already scheduled on this date</p>
                  <ul>
                    {selectedDayEvents.map((entry) => (
                      <li key={entry.id}>
                        <strong>{entry.title}</strong>
                        <span>{entry.serviceType === "oil_change" ? "Oil change" : "Tire rotation"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="modalActions">
                <button type="button" className="modalButton secondary" onClick={handleCloseCalendarComposer}>
                  Cancel
                </button>
                <button type="button" className="modalButton primary" onClick={handleSaveCalendarEvent}>
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="tabbarUnderlay" aria-hidden="true" />
        <div className="tabbarDock">
          <Tabs.List className="tabbar" aria-label="Primary Navigation">
            <Tabs.Trigger className="tabTrigger" value="vehicles" onClick={handleVehiclesTabClick}>
              <NavIcon type="vehicles" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="history" onClick={handlePrimaryTabClick}>
              <NavIcon type="history" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="dashboard" onClick={handlePrimaryTabClick}>
              <NavIcon type="dashboard" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="reminders" onClick={handlePrimaryTabClick}>
              <NavIcon type="reminders" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="settings" onClick={handlePrimaryTabClick}>
              <NavIcon type="settings" />
            </Tabs.Trigger>
          </Tabs.List>
        </div>
      </Tabs.Root>
    </div>
  );
}
