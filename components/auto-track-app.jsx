"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import {
  STORAGE_KEY,
  createInitialState,
  getMaintenanceStats,
  getSelectedVehicle,
  reducer
} from "../lib/autotrack-model";

const THEME_STORAGE_KEY = "autotrack_theme_pref_v1";
const THEME_OPTIONS = ["system", "light", "dark"];

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
const REMINDER_PRESETS = [
  { value: "0h", label: "At time of service" },
  { value: "1h", label: "1 hour before" },
  { value: "3h", label: "3 hours before" },
  { value: "6h", label: "6 hours before" },
  { value: "12h", label: "12 hours before" },
  { value: "1d", label: "1 day before" },
  { value: "2d", label: "2 days before" },
  { value: "3d", label: "3 days before" },
  { value: "7d", label: "7 days before" }
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

function formatMileage(miles) {
  return `${Math.round(Number(miles) || 0).toLocaleString()} mi`;
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

  return (
    <div className={`trackerItem ${overdue ? "overdue" : ""}`}>
      <div className="trackerItemTop">
        <h4>{title}</h4>
        <span className={`trackerStatus ${overdue ? "overdue" : ""}`}>{remainingLabel(remainingMs)}</span>
      </div>

      <div className="trackerMeta">
        <span className="trackerClockFloatingWrap" aria-hidden="true">
          <span
            className={`trackerClock ${overdue ? "overdue" : ""}`}
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
  const [themePreference, setThemePreference] = useState("system");
  const [prefersDark, setPrefersDark] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  const [odometerEditorOpen, setOdometerEditorOpen] = useState(false);
  const [odometerDraft, setOdometerDraft] = useState("");
  const [maintenanceConfirm, setMaintenanceConfirm] = useState(null);
  const [calendarComposer, setCalendarComposer] = useState(null);
  const [calendarEventDraft, setCalendarEventDraft] = useState({
    title: "",
    location: "",
    serviceType: "tire_rotation",
    time: "09:00",
    remindLead: "1d"
  });
  const [calendarEvents, setCalendarEvents] = useState({});
  const dashboardMenuRef = useRef(null);
  const calendarMonthRefs = useRef({});
  const shellRef = useRef(null);

  const selectedVehicle = useMemo(() => getSelectedVehicle(state), [state]);
  const vehicleDetail = useMemo(
    () => state.vehicles.find((item) => item.id === vehicleDetailId) || null,
    [state.vehicles, vehicleDetailId]
  );
  const resolvedTheme = themePreference === "system" ? (prefersDark ? "dark" : "light") : themePreference;

  const notify = (message) => setFlash(message);
  const updateState = (action) => setState((prev) => reducer(prev, action));

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors; app still runs in-memory.
    }
    setState(createInitialState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    updateState({ type: "ensure-selected" });
  }, [hydrated]);

  useEffect(() => {
    if (activeTab !== "vehicles" && vehicleDetailId) {
      setVehicleDetailId(null);
    }
  }, [activeTab, vehicleDetailId]);

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
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(""), 2800);
    return () => clearTimeout(timeout);
  }, [flash]);

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
    if (process.env.NODE_ENV !== "production") {
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
  }, []);

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
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && THEME_OPTIONS.includes(saved)) {
      setThemePreference(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themePreference);
  }, [themePreference]);

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
      notify("Mileage updated.");
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
    setCalendarComposer({ year, monthIndex, day });
    setCalendarEventDraft({
      title: "",
      location: "",
      serviceType: "tire_rotation",
      time: "09:00",
      remindLead: "1d"
    });
  };

  const handleCloseCalendarComposer = () => {
    setCalendarComposer(null);
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

  const handleJumpToToday = () => {
    const today = new Date();
    const key = `${today.getFullYear()}-${today.getMonth()}`;
    calendarMonthRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const scrollAppToTop = () => {
    if (shellRef.current?.scrollTo) {
      shellRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
    const scroller = document.scrollingElement || document.documentElement;
    scroller?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const handleVehiclesTabClick = () => {
    if (activeTab !== "vehicles" || !vehicleDetailId) return;
    setVehicleDetailId(null);
    scrollAppToTop();
  };

  const handleNotificationPermission = async () => {
    if (!("Notification" in window)) {
      notify("Notifications are not supported on this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      notify("Notification permission not granted.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      notify("Push APIs are not fully available on this browser.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    await registration.pushManager.getSubscription();
    notify("Notifications enabled. Next step: create backend subscription endpoint.");
  };

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  const followSystem = themePreference === "system";
  const turnSystemMode = (enabled) => {
    if (enabled) {
      setThemePreference("system");
      return;
    }
    setThemePreference(resolvedTheme === "dark" ? "dark" : "light");
  };

  const historyEntries = state.history;

  const stats = selectedVehicle ? getMaintenanceStats(selectedVehicle) : null;
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
  const rollingMonths = useMemo(() => getRollingMonths(CALENDAR_MONTH_COUNT), []);
  const selectedVehicleEvents = selectedVehicle ? calendarEvents[selectedVehicle.id] || [] : [];
  const selectedDayEvents = useMemo(() => {
    if (!calendarComposer || !selectedVehicle) return [];
    const targetKey = `${calendarComposer.year}-${calendarComposer.monthIndex}-${calendarComposer.day}`;
    return selectedVehicleEvents.filter((entry) => {
      const date = new Date(entry.dateISO);
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === targetKey;
    });
  }, [calendarComposer, selectedVehicle, selectedVehicleEvents]);

  const calendarServiceMap = useMemo(() => {
    const map = new Map();
    rollingMonths.forEach((monthMeta) => {
      if (!selectedVehicle) {
        map.set(monthMeta.key, { oil: new Set(), tire: new Set() });
        return;
      }
      map.set(monthMeta.key, {
        oil: getServiceDaysForMonth(
          selectedVehicle.lastOilChangeDateISO,
          selectedVehicle.oilIntervalMonths,
          monthMeta.year,
          monthMeta.monthIndex,
          selectedVehicle.serviceOverrides?.oil_change
        ),
        tire: getServiceDaysForMonth(
          selectedVehicle.lastTireRotationDateISO,
          selectedVehicle.tireIntervalMonths,
          monthMeta.year,
          monthMeta.monthIndex,
          selectedVehicle.serviceOverrides?.tire_rotation
        )
      });
    });
    return map;
  }, [rollingMonths, selectedVehicle]);

  const calendarEventMap = useMemo(() => {
    const map = new Map();
    selectedVehicleEvents.forEach((entry) => {
      const date = new Date(entry.dateISO);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      map.set(key, true);
    });
    return map;
  }, [selectedVehicleEvents]);
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
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M5.2 13.4 6.6 9a2.4 2.4 0 0 1 2.3-1.7h6.2A2.4 2.4 0 0 1 17.4 9l1.4 4.4v3.3h-1.7a1.8 1.8 0 0 1-3.6 0h-3a1.8 1.8 0 0 1-3.6 0H5.2Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                      <circle cx="8.7" cy="16.7" r="0.9" fill="currentColor" />
                      <circle cx="15.3" cy="16.7" r="0.9" fill="currentColor" />
                    </svg>
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

        <Tabs.Content value="vehicles" className={`view ${isVehicleDetailView ? "vehiclesDetailView" : ""}`}>
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
                        {section.fields.map((field) => (
                          <li
                            className={`vehicleProfileRow ${vehicleProfile[field] === "User Tracked" ? "needsUserTracked" : ""}`}
                            key={field}
                          >
                            <span className="vehicleProfileLabel">{field}</span>
                            <span className="vehicleProfileValue">{vehicleProfile[field] || "Add info"}</span>
                          </li>
                        ))}
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

        <Tabs.Content value="history" className="view">
          <section className="card">
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

        <Tabs.Content value="settings" className="view">
          <section className="card">
            <h2>Display</h2>
            <div className="settingRow">
              <div>
                <strong>Follow device appearance</strong>
                <p className="tiny">Use your phone theme automatically.</p>
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
              <p className="tiny">Manual theme</p>
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
          </section>

          <section className="card">
            <h3>App</h3>
            <p className="tiny">
              Current theme: <strong>{resolvedTheme}</strong>. This preference is saved on device.
            </p>
          </section>

          <section className="card">
            <h3>Reminders & Notifications</h3>
            <p className="tiny">Enable notifications to receive upcoming service alerts.</p>
            <div className="buttonRow">
              <button type="button" onClick={handleNotificationPermission}>
                Enable Notifications
              </button>
              {installPrompt && (
                <button type="button" onClick={handleInstallApp}>
                  Install App
                </button>
              )}
            </div>
            <p className="tiny">iPhone install path: Safari Share menu then Add to Home Screen.</p>
          </section>
        </Tabs.Content>

        <Tabs.Content value="reminders" className="view calendarView">
          <section className="calendarPlanner" aria-label="Calendar planner">
            <div className="calendarPlannerToolbar">
              <p className="calendarPlannerVehicle">{selectedVehicle ? selectedVehicle.name : "Select vehicle"}</p>
              <button type="button" className="calendarTodayButton" onClick={handleJumpToToday}>
                Today
              </button>
            </div>

            <div className="calendarMonthList" role="list" aria-label="Scrollable month calendar">
              {rollingMonths.map((monthMeta) => {
                const monthLabel = `${MONTH_NAMES_FULL[monthMeta.monthIndex]} ${monthMeta.year}`;
                const monthCells = getMonthGrid(monthMeta.year, monthMeta.monthIndex);
                const serviceDays = calendarServiceMap.get(monthMeta.key) || { oil: new Set(), tire: new Set() };
                return (
                  <article
                    key={monthMeta.key}
                    className="calendarMonthSection"
                    role="listitem"
                    ref={(node) => {
                      calendarMonthRefs.current[monthMeta.key] = node;
                    }}
                  >
                    <div className="calendarMonthHead">
                      <h3>{monthLabel}</h3>
                    </div>

                    <div className="calendarWeekdaysRow">
                      {WEEKDAY_LABELS.map((label) => (
                        <span key={`${monthMeta.key}-${label}`}>{label}</span>
                      ))}
                    </div>

                    <div className="calendarMonthGrid">
                      {monthCells.map((day, index) => {
                        if (!day) {
                          return <span key={`${monthMeta.key}-empty-${index}`} className="calendarDayGhost" aria-hidden="true" />;
                        }
                        const oilDue = serviceDays.oil.has(day);
                        const tireDue = serviceDays.tire.has(day);
                        const dayKey = `${monthMeta.year}-${monthMeta.monthIndex}-${day}`;
                        const hasCustom = calendarEventMap.has(dayKey);
                        const today = new Date();
                        const isToday =
                          monthMeta.year === today.getFullYear() &&
                          monthMeta.monthIndex === today.getMonth() &&
                          day === today.getDate();
                        return (
                          <button
                            key={`${monthMeta.key}-day-${day}`}
                            type="button"
                            className={`calendarDayCell ${isToday ? "today" : ""} ${
                              oilDue || tireDue || hasCustom ? "marked" : ""
                            }`}
                            onClick={() => handleOpenCalendarComposer(monthMeta.year, monthMeta.monthIndex, day)}
                          >
                            <span className="calendarDayNumber">{day}</span>
                            {(oilDue || tireDue || hasCustom) && (
                              <span className="calendarDayDots" aria-hidden="true">
                                {oilDue && <span className="calendarDot oil" />}
                                {tireDue && <span className="calendarDot tire" />}
                                {hasCustom && <span className="calendarDot custom" />}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </Tabs.Content>

        {odometerEditorOpen && selectedVehicle && (
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
          </div>
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
                <label className="modalInputWrap">
                  Service
                  <select
                    value={calendarEventDraft.serviceType}
                    onChange={(event) =>
                      setCalendarEventDraft((prev) => ({ ...prev, serviceType: event.target.value }))
                    }
                  >
                    <option value="tire_rotation">Tire Rotation</option>
                    <option value="oil_change">Oil Change</option>
                  </select>
                </label>

                <label className="modalInputWrap">
                  Time
                  <input
                    type="time"
                    value={calendarEventDraft.time}
                    onChange={(event) =>
                      setCalendarEventDraft((prev) => ({ ...prev, time: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="modalInputWrap">
                Remind me
                <select
                  value={calendarEventDraft.remindLead}
                  onChange={(event) =>
                    setCalendarEventDraft((prev) => ({ ...prev, remindLead: event.target.value }))
                  }
                >
                  {REMINDER_PRESETS.map((preset) => (
                    <option value={preset.value} key={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>

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

        <div className="tabbarDock">
          <Tabs.List className="tabbar" aria-label="Primary Navigation">
            <Tabs.Trigger className="tabTrigger" value="vehicles" onClick={handleVehiclesTabClick}>
              <NavIcon type="vehicles" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="history">
              <NavIcon type="history" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="dashboard">
              <NavIcon type="dashboard" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="reminders">
              <NavIcon type="reminders" />
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="settings">
              <NavIcon type="settings" />
            </Tabs.Trigger>
          </Tabs.List>
        </div>
      </Tabs.Root>
    </div>
  );
}
