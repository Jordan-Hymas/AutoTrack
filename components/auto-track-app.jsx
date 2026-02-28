"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Progress from "@radix-ui/react-progress";
import {
  createInitialState,
  getMaintenanceStats,
  getSelectedVehicle,
  loadState,
  reducer,
  saveState
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
    "Oil Change Interval (Miles)": "7,500-10,000 miles",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "32 PSI",
    "Tire Pressure (Rear PSI)": "32 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "7,500 miles",
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
    "Oil Change Interval (Miles)": "7,500-10,000 miles",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "33 PSI",
    "Tire Pressure (Rear PSI)": "33 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "7,500 miles",
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
    "Oil Change Interval (Miles)": "7,500-10,000 miles",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "33 PSI",
    "Tire Pressure (Rear PSI)": "33 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "7,500 miles",
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
    "Oil Change Interval (Miles)": "8,000 miles or 12 months",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Mopar Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "38 PSI",
    "Tire Pressure (Rear PSI)": "38 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "8,000 miles",
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
    "Oil Change Interval (Miles)": "7,500 miles or 12 months",
    "Last Oil Change Mileage": "User Tracked",
    "Oil Filter Type": "OEM Acura/Honda Full-Flow Filter",
    "Engine Air Filter Replacement Interval": "30,000 miles",
    "Tire Pressure (Front PSI)": "36 PSI",
    "Tire Pressure (Rear PSI)": "36 PSI",
    "Spare Tire Pressure": "See door placard",
    "Tire Rotation Interval (Miles)": "7,500 miles",
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

function remainingLabel(remaining) {
  if (remaining >= 0) return `${formatMileage(remaining)} remaining`;
  return `${formatMileage(Math.abs(remaining))} overdue`;
}

function NavIcon({ type }) {
  if (type === "dashboard") {
    return (
      <svg className="tabIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="4" y="4.8" width="16" height="14.4" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
        <line x1="7" y1="9.2" x2="17" y2="9.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "vehicles") {
    return (
      <svg className="tabIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5.2 13.4 6.6 9a2.4 2.4 0 0 1 2.3-1.7h6.2A2.4 2.4 0 0 1 17.4 9l1.4 4.4v3.3h-1.7a1.8 1.8 0 0 1-3.6 0h-3a1.8 1.8 0 0 1-3.6 0H5.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="8.7" cy="16.7" r="0.9" fill="currentColor" />
        <circle cx="15.3" cy="16.7" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  if (type === "history") {
    return (
      <svg className="tabIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7.6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8.1v4.1l2.8 1.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "reminders") {
    return (
      <svg className="tabIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8.2 10a3.8 3.8 0 1 1 7.6 0v2.3c0 .8.3 1.6.9 2.2l.8.8H6.5l.8-.8c.6-.6.9-1.4.9-2.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M10.5 17.1a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="tabIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7.1" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m12 4.2.2 2.2M19.8 12l-2.2.2M4.2 12l2.2.2M12 19.8l.2-2.2M17.4 6.6l-1.5 1.5M6.6 17.4l1.5-1.5M17.4 17.4l-1.5-1.5M6.6 6.6l1.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MaintenanceMetric({ title, remaining, progress, onLog, actionLabel }) {
  return (
    <div className="metric">
      <div className="metricTop">
        <strong>{title}</strong>
        <span>{remainingLabel(remaining)}</span>
      </div>
      <Progress.Root className="progressRoot" value={Math.round(progress * 100)}>
        <Progress.Indicator
          className="progressIndicator"
          style={{ transform: `translateX(-${100 - progress * 100}%)` }}
        />
      </Progress.Root>
      <button type="button" onClick={onLog}>
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
  const [historyScope, setHistoryScope] = useState("selected");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [flash, setFlash] = useState("");
  const [themePreference, setThemePreference] = useState("system");
  const [prefersDark, setPrefersDark] = useState(false);
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(false);
  const dashboardMenuRef = useRef(null);

  const selectedVehicle = useMemo(() => getSelectedVehicle(state), [state]);
  const vehicleDetail = useMemo(
    () => state.vehicles.find((item) => item.id === vehicleDetailId) || null,
    [state.vehicles, vehicleDetailId]
  );
  const resolvedTheme = themePreference === "system" ? (prefersDark ? "dark" : "light") : themePreference;

  const notify = (message) => setFlash(message);
  const updateState = (action) => setState((prev) => reducer(prev, action));

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
  }, [state, hydrated]);

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
    if (activeTab !== "dashboard" && dashboardMenuOpen) {
      setDashboardMenuOpen(false);
    }
  }, [activeTab, dashboardMenuOpen]);

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

  const handleUpdateOdometer = (event) => {
    event.preventDefault();
    if (!selectedVehicle) return;
    const data = new FormData(event.currentTarget);
    try {
      updateState({
        type: "update-odometer",
        vehicleId: selectedVehicle.id,
        odometer: data.get("odometer")
      });
      notify("Mileage updated.");
    } catch (error) {
      window.alert(error.message || "Unable to update odometer.");
    }
  };

  const handleLogMaintenance = (maintenanceType) => {
    if (!selectedVehicle) return;
    try {
      updateState({ type: "log-maintenance", vehicleId: selectedVehicle.id, maintenanceType });
      notify(maintenanceType === "oil_change" ? "Oil change logged." : "Tire rotation logged.");
    } catch (error) {
      window.alert(error.message || "Unable to log maintenance.");
    }
  };

  const handleSelectVehicle = (vehicleId) => {
    updateState({ type: "select-vehicle", vehicleId });
    setActiveTab("dashboard");
  };

  const handleOpenVehicleDetail = (vehicleId) => {
    updateState({ type: "select-vehicle", vehicleId });
    setVehicleDetailId(vehicleId);
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

  const historyEntries =
    historyScope === "all" || !selectedVehicle
      ? state.history
      : state.history.filter((entry) => entry.vehicleId === selectedVehicle.id);

  const stats = selectedVehicle ? getMaintenanceStats(selectedVehicle) : null;
  const isDashboardTab = activeTab === "dashboard";
  const isVehicleDetailView = activeTab === "vehicles" && Boolean(vehicleDetail);
  const isVehiclesTab = activeTab === "vehicles";
  const vehicleProfile = vehicleDetail ? VEHICLE_PROFILE_VALUES[vehicleDetail.id] || {} : {};

  return (
    <div className="shell">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <header
          className={`appHeader ${
            isVehicleDetailView ? "vehicleSummaryHeader" : isVehiclesTab ? "vehiclesHeader" : isDashboardTab ? "dashboardHeader" : ""
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
          ) : isDashboardTab ? (
            <>
              <div className="dashboardHeaderTitle">
                <p className="eyebrow">Family Garage</p>
                <h1>Dashboard</h1>
              </div>
              {state.vehicles.length > 0 && (
                <div className="dashboardVehicleControl" ref={dashboardMenuRef}>
                  <button
                    type="button"
                    className={`dashboardVehicleButton ${dashboardMenuOpen ? "open" : ""}`}
                    aria-haspopup="menu"
                    aria-expanded={dashboardMenuOpen}
                    aria-label="Open Family Garage vehicle list"
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
                    <div className="dashboardVehicleMenu" role="menu" aria-label="Family Garage">
                      <p className="dashboardVehicleMenuTitle">FAMILY GARAGE</p>
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
                                  handleSelectVehicle(vehicle.id);
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

        <Tabs.Content value="dashboard" className="view">
          {selectedVehicle ? (
            <>
              <section className="card dashboardVehicleCard">
                <div className="vehicleImageFrame dashboardVehicleFrame">
                  <img
                    className="vehicleDetailImage"
                    src={selectedVehicle.image}
                    alt={`${selectedVehicle.name} horizontal side view`}
                  />
                </div>
                <h2 className="vehicleDetailName dashboardVehicleName">{selectedVehicle.name}</h2>
              </section>

              <section className="card">
                <h2>Current Mileage</h2>
                <p className="eyebrow">Current Odometer</p>
                <p className="odometer">{formatMileage(selectedVehicle.odometer)}</p>
                <form className="inlineForm" onSubmit={handleUpdateOdometer}>
                  <label>
                    Update mileage
                    <input
                      name="odometer"
                      type="number"
                      min={selectedVehicle.odometer}
                      step="1"
                      defaultValue={selectedVehicle.odometer}
                      required
                    />
                  </label>
                  <button type="submit">Save Reading</button>
                </form>
              </section>

              <section className="card">
                <h3>Maintenance</h3>
                <MaintenanceMetric
                  title="Oil Change"
                  remaining={stats.oilRemaining}
                  progress={stats.oilProgress}
                  actionLabel="Log Oil Change"
                  onLog={() => handleLogMaintenance("oil_change")}
                />
                <MaintenanceMetric
                  title="Tire Rotation"
                  remaining={stats.tireRemaining}
                  progress={stats.tireProgress}
                  actionLabel="Log Tire Rotation"
                  onLog={() => handleLogMaintenance("tire_rotation")}
                />
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
              <label>
                Show
                <select value={historyScope} onChange={(event) => setHistoryScope(event.target.value)}>
                  <option value="selected">Active vehicle</option>
                  <option value="all">All vehicles</option>
                </select>
              </label>
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
        </Tabs.Content>

        <Tabs.Content value="reminders" className="view">
          <section className="card">
            <h2>Reminders</h2>
            <p className="tiny">Enable alerts so you can get future maintenance reminders.</p>
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
            <p className="tiny">iPhone install path: Safari Share menu → Add to Home Screen.</p>
          </section>
        </Tabs.Content>

        <div className="tabbarDock">
          <Tabs.List className="tabbar" aria-label="Primary Navigation">
            <Tabs.Trigger className="tabTrigger" value="vehicles">
              <NavIcon type="vehicles" />
              <span className="tabLabel">Vehicles</span>
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="history">
              <NavIcon type="history" />
              <span className="tabLabel">History</span>
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="dashboard">
              <NavIcon type="dashboard" />
              <span className="tabLabel">Dashboard</span>
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="reminders">
              <NavIcon type="reminders" />
              <span className="tabLabel">Reminders</span>
            </Tabs.Trigger>
            <Tabs.Trigger className="tabTrigger" value="settings">
              <NavIcon type="settings" />
              <span className="tabLabel">Settings</span>
            </Tabs.Trigger>
          </Tabs.List>
        </div>
      </Tabs.Root>
    </div>
  );
}
