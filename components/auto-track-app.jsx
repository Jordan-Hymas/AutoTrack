"use client";

import { useEffect, useMemo, useState } from "react";
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
const VEHICLE_DISPLAY_SCALE = {
  "2017-honda-accord-special-edition": 1.1,
  "2021-ram-1500-rebel": 1.12,
  "2023-acura-rdx-a-spec": 1.12,
  "2020-honda-accord-sedan": 1.12,
  "2018-honda-accord-ex-l": 1
};

const EVENT_LABELS = {
  vehicle_created: "Vehicle Added",
  settings_updated: "Settings Updated",
  odometer_update: "Odometer Updated",
  oil_change: "Oil Change",
  tire_rotation: "Tire Rotation"
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
    if (!flash) return;
    const timeout = setTimeout(() => setFlash(""), 2800);
    return () => clearTimeout(timeout);
  }, [flash]);

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

  return (
    <div className="shell">
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <header className="appHeader">
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
        </header>

        {flash && <p className="flash">{flash}</p>}

        <Tabs.Content value="dashboard" className="view">
          {selectedVehicle ? (
            <>
              <section className="card">
                <h2>{selectedVehicle.name}</h2>
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

        <Tabs.Content value="vehicles" className="view">
          {vehicleDetail ? (
            <section className="card">
              <button type="button" className="inlineBackButton" onClick={() => setVehicleDetailId(null)}>
                Back to Vehicles
              </button>
              <div className="vehicleDetailHero">
                <div className="vehicleImageFrame">
                  <img
                    className="vehicleDetailImage"
                    src={vehicleDetail.image}
                    alt={`${vehicleDetail.name} horizontal side view`}
                    style={{ "--vehicle-scale": VEHICLE_DISPLAY_SCALE[vehicleDetail.id] || 1 }}
                  />
                </div>
                <h2 className="vehicleDetailName">{vehicleDetail.name}</h2>
                <p className="tiny">Vehicle profile details will be added here.</p>
              </div>
            </section>
          ) : (
            <section className="card">
              <h2>Vehicles</h2>
              <p className="tiny">Select a vehicle to open its information page.</p>
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
                          style={{ "--vehicle-scale": VEHICLE_DISPLAY_SCALE[vehicle.id] || 1 }}
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
