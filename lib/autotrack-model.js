export const STORAGE_KEY = "autotrack_state_v2";
export const DEFAULT_OIL_INTERVAL = 5000;
export const DEFAULT_TIRE_INTERVAL = 6000;
export const DEFAULT_OIL_INTERVAL_MONTHS = 12;
export const DEFAULT_TIRE_INTERVAL_MONTHS = 6;
const TEST_PROGRESS_VEHICLE_ID = "2017-honda-accord-special-edition";
const TEST_PROGRESS_WINDOW_MS = 1 * 60 * 1000;
export const STATIC_VEHICLES = [
  {
    id: "2023-acura-rdx-a-spec",
    name: "2023 Acura RDX (A-spec)",
    image: "/vehicles/Tint-2023-Acura-RDX.png",
    oilInterval: 9000,
    tireInterval: 5000,
    oilIntervalMonths: 12,
    tireIntervalMonths: 5
  },
  {
    id: "2021-ram-1500-rebel",
    name: "2021 Ram 1500 Rebel",
    image: "/vehicles/Tint-2021-Ram-Rebel.png",
    imageScale: 1.12,
    imageShiftX: "-8px",
    oilInterval: 9000,
    tireInterval: 4000,
    oilIntervalMonths: 12,
    tireIntervalMonths: 4.5
  },
  {
    id: "2020-honda-accord-sedan",
    name: "2020 Honda Accord (EX-L)",
    image: "/vehicles/Tint-2020-Honda-Accord.png",
    oilInterval: 9000,
    tireInterval: 6000,
    oilIntervalMonths: 12,
    tireIntervalMonths: 6
  },
  {
    id: "2018-honda-accord-ex-l",
    name: "2018 Honda Accord (EX-L)",
    image: "/vehicles/Tint-2018-Honda-Accord.png",
    oilInterval: 9000,
    tireInterval: 6000,
    oilIntervalMonths: 12,
    tireIntervalMonths: 6
  },
  {
    id: "2017-honda-accord-special-edition",
    name: "2017 Honda Accord (SE)",
    image: "/vehicles/Tint-2017-Honda-Accord.png",
    oilInterval: 9000,
    tireInterval: 6000,
    oilIntervalMonths: 12,
    tireIntervalMonths: 6
  }
];

const LEGACY_OIL_INTERVALS = {
  "2023-acura-rdx-a-spec": 7500,
  "2021-ram-1500-rebel": 8000,
  "2020-honda-accord-sedan": 7500,
  "2018-honda-accord-ex-l": 7500,
  "2017-honda-accord-special-edition": 7500
};

const LEGACY_TIRE_INTERVALS = {
  "2023-acura-rdx-a-spec": [7500, 6000],
  "2021-ram-1500-rebel": [8000, 3500],
  "2020-honda-accord-sedan": [7500],
  "2018-honda-accord-ex-l": [7500],
  "2017-honda-accord-special-edition": [7500]
};

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function stamp() {
  return new Date().toISOString();
}

function isValidDate(value) {
  return Number.isFinite(Date.parse(value));
}

function normalizeOverrides(overrides) {
  const next = { oil_change: null, tire_rotation: null };
  if (!overrides || typeof overrides !== "object") return next;
  if (isValidDate(overrides.oil_change)) next.oil_change = overrides.oil_change;
  if (isValidDate(overrides.tire_rotation)) next.tire_rotation = overrides.tire_rotation;
  return next;
}

function dueDateFromInterval(startDateISO, intervalMonths) {
  const started = new Date(startDateISO);
  if (!Number.isFinite(started.getTime())) {
    const fallback = new Date();
    return fallback.getTime();
  }
  const wholeMonths = Math.floor(intervalMonths);
  const fractionalMonths = intervalMonths - wholeMonths;
  const due = new Date(started);
  if (wholeMonths > 0) {
    due.setMonth(due.getMonth() + wholeMonths);
  }
  if (fractionalMonths > 0) {
    const extraDays = Math.round(fractionalMonths * 30);
    due.setDate(due.getDate() + extraDays);
  }
  return due.getTime();
}

function mergeVehicleState(template, existing, now) {
  const odometer = Math.max(0, toNumber(existing?.odometer, 0));
  const templateOilInterval = Math.max(1, toNumber(template.oilInterval, DEFAULT_OIL_INTERVAL));
  const templateTireInterval = Math.max(1, toNumber(template.tireInterval, DEFAULT_TIRE_INTERVAL));
  const templateOilIntervalMonths = Math.max(
    0.25,
    toNumber(template.oilIntervalMonths, DEFAULT_OIL_INTERVAL_MONTHS)
  );
  const templateTireIntervalMonths = Math.max(
    0.25,
    toNumber(template.tireIntervalMonths, DEFAULT_TIRE_INTERVAL_MONTHS)
  );
  const savedOilInterval = toNumber(existing?.oilInterval, Number.NaN);
  const savedTireInterval = toNumber(existing?.tireInterval, Number.NaN);
  const savedOilIntervalMonths = toNumber(existing?.oilIntervalMonths, Number.NaN);
  const savedTireIntervalMonths = toNumber(existing?.tireIntervalMonths, Number.NaN);
  const oilInterval =
    Number.isFinite(savedOilInterval) && savedOilInterval > 0
      ? savedOilInterval === DEFAULT_OIL_INTERVAL && templateOilInterval !== DEFAULT_OIL_INTERVAL
        ? templateOilInterval
        : savedOilInterval === LEGACY_OIL_INTERVALS[template.id] &&
            templateOilInterval !== LEGACY_OIL_INTERVALS[template.id]
          ? templateOilInterval
        : savedOilInterval
      : templateOilInterval;
  const tireInterval =
    Number.isFinite(savedTireInterval) && savedTireInterval > 0
      ? savedTireInterval === DEFAULT_TIRE_INTERVAL && templateTireInterval !== DEFAULT_TIRE_INTERVAL
        ? templateTireInterval
        : LEGACY_TIRE_INTERVALS[template.id]?.includes(savedTireInterval) &&
            templateTireInterval !== savedTireInterval
          ? templateTireInterval
        : savedTireInterval
      : templateTireInterval;
  const oilIntervalMonths =
    Number.isFinite(savedOilIntervalMonths) && savedOilIntervalMonths > 0
      ? savedOilIntervalMonths
      : templateOilIntervalMonths;
  const tireIntervalMonths =
    Number.isFinite(savedTireIntervalMonths) && savedTireIntervalMonths > 0
      ? savedTireIntervalMonths
      : templateTireIntervalMonths;
  const lastOilChangeDateISO = isValidDate(existing?.lastOilChangeDateISO)
    ? existing.lastOilChangeDateISO
    : now;
  const lastTireRotationDateISO = isValidDate(existing?.lastTireRotationDateISO)
    ? existing.lastTireRotationDateISO
    : now;
  const serviceOverrides = normalizeOverrides(existing?.serviceOverrides);
  return {
    ...template,
    odometer,
    oilInterval,
    tireInterval,
    oilIntervalMonths,
    tireIntervalMonths,
    lastOilChangeOdometer: Math.max(0, toNumber(existing?.lastOilChangeOdometer, odometer)),
    lastTireRotationOdometer: Math.max(0, toNumber(existing?.lastTireRotationOdometer, odometer)),
    lastOilChangeDateISO,
    lastTireRotationDateISO,
    serviceOverrides,
    createdAt: existing?.createdAt || now,
    updatedAt: existing?.updatedAt || now
  };
}

function logEntry({ vehicleId, type, mileage, details }) {
  return {
    id: makeId(),
    vehicleId,
    type,
    mileage,
    details,
    dateISO: stamp()
  };
}

export function createInitialState() {
  const now = stamp();
  return {
    vehicles: STATIC_VEHICLES.map((template) => mergeVehicleState(template, null, now)),
    selectedVehicleId: STATIC_VEHICLES[0]?.id ?? null,
    history: []
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const persistedVehicles = Array.isArray(parsed.vehicles) ? parsed.vehicles : [];
    const byId = new Map(persistedVehicles.map((vehicle) => [vehicle.id, vehicle]));
    const now = stamp();
    const vehicles = STATIC_VEHICLES.map((template) =>
      mergeVehicleState(template, byId.get(template.id), now)
    );
    const hasSelected = vehicles.some((item) => item.id === parsed.selectedVehicleId);
    return {
      vehicles,
      selectedVehicleId: hasSelected ? parsed.selectedVehicleId : vehicles[0]?.id ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getSelectedVehicle(state) {
  return state.vehicles.find((item) => item.id === state.selectedVehicleId) || null;
}

export function getMaintenanceStats(vehicle, nowMs = Date.now()) {
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const oilDueMs = dueDateFromInterval(vehicle.lastOilChangeDateISO, vehicle.oilIntervalMonths);
  const tireDueMs = dueDateFromInterval(vehicle.lastTireRotationDateISO, vehicle.tireIntervalMonths);
  const oilStartMs = Date.parse(vehicle.lastOilChangeDateISO) || now;
  const tireStartMs = Date.parse(vehicle.lastTireRotationDateISO) || now;
  const manualOilDueMs = isValidDate(vehicle.serviceOverrides?.oil_change)
    ? Date.parse(vehicle.serviceOverrides.oil_change)
    : Number.NaN;
  const manualTireDueMs = isValidDate(vehicle.serviceOverrides?.tire_rotation)
    ? Date.parse(vehicle.serviceOverrides.tire_rotation)
    : Number.NaN;
  let effectiveOilDueMs =
    Number.isFinite(manualOilDueMs) && manualOilDueMs > oilStartMs ? manualOilDueMs : oilDueMs;
  let effectiveTireDueMs =
    Number.isFinite(manualTireDueMs) && manualTireDueMs > tireStartMs ? manualTireDueMs : tireDueMs;

  // Temporary test mode: compress the service countdown to 1 minute for this single vehicle.
  if (vehicle?.id === TEST_PROGRESS_VEHICLE_ID) {
    effectiveOilDueMs = oilStartMs + TEST_PROGRESS_WINDOW_MS;
    effectiveTireDueMs = tireStartMs + TEST_PROGRESS_WINDOW_MS;
  }

  const oilElapsed = Math.max(0, now - oilStartMs);
  const tireElapsed = Math.max(0, now - tireStartMs);
  const oilWindow = Math.max(1, effectiveOilDueMs - oilStartMs);
  const tireWindow = Math.max(1, effectiveTireDueMs - tireStartMs);
  return {
    oilRemainingMs: effectiveOilDueMs - now,
    tireRemainingMs: effectiveTireDueMs - now,
    oilProgress: Math.max(0, Math.min(1, oilElapsed / oilWindow)),
    tireProgress: Math.max(0, Math.min(1, tireElapsed / tireWindow)),
    oilWindowMs: oilWindow,
    tireWindowMs: tireWindow,
    oilDueDateISO: new Date(effectiveOilDueMs).toISOString(),
    tireDueDateISO: new Date(effectiveTireDueMs).toISOString(),
    oilManual: Number.isFinite(manualOilDueMs) && effectiveOilDueMs === manualOilDueMs,
    tireManual: Number.isFinite(manualTireDueMs) && effectiveTireDueMs === manualTireDueMs
  };
}

export function reducer(state, action) {
  if (action.type === "hydrate") {
    return action.payload;
  }

  if (action.type === "ensure-selected") {
    if (state.selectedVehicleId || state.vehicles.length === 0) return state;
    return { ...state, selectedVehicleId: state.vehicles[0].id };
  }

  if (action.type === "select-vehicle") {
    const exists = state.vehicles.some((item) => item.id === action.vehicleId);
    if (!exists) return state;
    return { ...state, selectedVehicleId: action.vehicleId };
  }

  if (action.type === "update-odometer") {
    const target = state.vehicles.find((item) => item.id === action.vehicleId);
    if (!target) throw new Error("Vehicle not found.");
    const nextOdometer = toNumber(action.odometer, target.odometer);
    if (nextOdometer < target.odometer) throw new Error("Odometer cannot go backwards.");

    const vehicles = state.vehicles.map((item) =>
      item.id === action.vehicleId
        ? { ...item, odometer: nextOdometer, updatedAt: stamp() }
        : item
    );

    return {
      ...state,
      vehicles,
      history: [
        logEntry({
          vehicleId: action.vehicleId,
          type: "odometer_update",
          mileage: nextOdometer,
          details: "Odometer reading updated"
        }),
        ...state.history
      ]
    };
  }

  if (action.type === "update-intervals") {
    const target = state.vehicles.find((item) => item.id === action.vehicleId);
    if (!target) throw new Error("Vehicle not found.");

    const oilInterval = Math.max(1, toNumber(action.oilInterval, target.oilInterval));
    const tireInterval = Math.max(1, toNumber(action.tireInterval, target.tireInterval));

    const vehicles = state.vehicles.map((item) =>
      item.id === action.vehicleId
        ? { ...item, oilInterval, tireInterval, updatedAt: stamp() }
        : item
    );

    return {
      ...state,
      vehicles,
      history: [
        logEntry({
          vehicleId: action.vehicleId,
          type: "settings_updated",
          mileage: target.odometer,
          details: `Intervals set to oil ${oilInterval} mi, tires ${tireInterval} mi`
        }),
        ...state.history
      ]
    };
  }

  if (action.type === "set-service-reminder") {
    const target = state.vehicles.find((item) => item.id === action.vehicleId);
    if (!target) throw new Error("Vehicle not found.");
    const serviceType = action.maintenanceType;
    if (serviceType !== "oil_change" && serviceType !== "tire_rotation") {
      throw new Error("Unknown maintenance type.");
    }
    if (!isValidDate(action.dateISO)) {
      throw new Error("Invalid reminder date.");
    }

    const vehicles = state.vehicles.map((item) =>
      item.id === action.vehicleId
        ? {
            ...item,
            serviceOverrides: { ...item.serviceOverrides, [serviceType]: action.dateISO },
            updatedAt: stamp()
          }
        : item
    );

    return {
      ...state,
      vehicles,
      history: [
        logEntry({
          vehicleId: action.vehicleId,
          type: "settings_updated",
          mileage: target.odometer,
          details: `${serviceType === "oil_change" ? "Oil change" : "Tire rotation"} reminder set for ${new Date(action.dateISO).toLocaleString()}`
        }),
        ...state.history
      ]
    };
  }

  if (action.type === "clear-service-reminder") {
    const target = state.vehicles.find((item) => item.id === action.vehicleId);
    if (!target) throw new Error("Vehicle not found.");
    const serviceType = action.maintenanceType;
    if (serviceType !== "oil_change" && serviceType !== "tire_rotation") {
      throw new Error("Unknown maintenance type.");
    }

    const vehicles = state.vehicles.map((item) =>
      item.id === action.vehicleId
        ? {
            ...item,
            serviceOverrides: { ...item.serviceOverrides, [serviceType]: null },
            updatedAt: stamp()
          }
        : item
    );

    return {
      ...state,
      vehicles,
      history: [
        logEntry({
          vehicleId: action.vehicleId,
          type: "settings_updated",
          mileage: target.odometer,
          details: `${serviceType === "oil_change" ? "Oil change" : "Tire rotation"} reminder removed`
        }),
        ...state.history
      ]
    };
  }

  if (action.type === "log-maintenance") {
    const target = state.vehicles.find((item) => item.id === action.vehicleId);
    if (!target) throw new Error("Vehicle not found.");

    const oil = action.maintenanceType === "oil_change";
    const tire = action.maintenanceType === "tire_rotation";
    if (!oil && !tire) throw new Error("Unknown maintenance type.");

    const vehicles = state.vehicles.map((item) => {
      if (item.id !== action.vehicleId) return item;
      if (oil) {
        return {
          ...item,
          lastOilChangeOdometer: item.odometer,
          lastOilChangeDateISO: stamp(),
          serviceOverrides: { ...item.serviceOverrides, oil_change: null },
          updatedAt: stamp()
        };
      }
      return {
        ...item,
        lastTireRotationOdometer: item.odometer,
        lastTireRotationDateISO: stamp(),
        serviceOverrides: { ...item.serviceOverrides, tire_rotation: null },
        updatedAt: stamp()
      };
    });

    return {
      ...state,
      vehicles,
      history: [
        logEntry({
          vehicleId: action.vehicleId,
          type: action.maintenanceType,
          mileage: target.odometer,
          details: oil ? "Oil change logged" : "Tire rotation logged"
        }),
        ...state.history
      ]
    };
  }

  return state;
}
