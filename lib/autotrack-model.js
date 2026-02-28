export const STORAGE_KEY = "autotrack_state_v2";
export const DEFAULT_OIL_INTERVAL = 5000;
export const DEFAULT_TIRE_INTERVAL = 6000;
export const STATIC_VEHICLES = [
  {
    id: "2017-honda-accord-special-edition",
    name: "2017 Honda Accord Sedan (Special Edition)",
    image: "/vehicles/2017-Honda-Accord-Sport_Special_Edition.avif"
  },
  {
    id: "2021-ram-1500-rebel",
    name: "2021 Ram 1500 Rebel",
    image: "/vehicles/2021-Ram-Rebel.png"
  },
  {
    id: "2023-acura-rdx-a-spec",
    name: "2023 Acura RDX (A-spec)",
    image: "/vehicles/2023-acura-RDX-A-spec.png"
  },
  {
    id: "2020-honda-accord-sedan",
    name: "2020 Honda Accord Sedan ()",
    image: "/vehicles/2020-Honda-Accord_Sedan-Sport.avif"
  },
  {
    id: "2018-honda-accord-ex-l",
    name: "2018 Honda Accord (EX-L)",
    image: "/vehicles/2018-Honda-Accord-ex-l.png"
  }
];

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

function mergeVehicleState(template, existing, now) {
  const odometer = Math.max(0, toNumber(existing?.odometer, 0));
  const oilInterval = Math.max(1, toNumber(existing?.oilInterval, DEFAULT_OIL_INTERVAL));
  const tireInterval = Math.max(1, toNumber(existing?.tireInterval, DEFAULT_TIRE_INTERVAL));
  return {
    ...template,
    odometer,
    oilInterval,
    tireInterval,
    lastOilChangeOdometer: Math.max(0, toNumber(existing?.lastOilChangeOdometer, odometer)),
    lastTireRotationOdometer: Math.max(0, toNumber(existing?.lastTireRotationOdometer, odometer)),
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

export function getMaintenanceStats(vehicle) {
  const oilUsed = vehicle.odometer - vehicle.lastOilChangeOdometer;
  const tireUsed = vehicle.odometer - vehicle.lastTireRotationOdometer;
  return {
    oilRemaining: vehicle.oilInterval - oilUsed,
    tireRemaining: vehicle.tireInterval - tireUsed,
    oilProgress: Math.max(0, Math.min(1, oilUsed / vehicle.oilInterval)),
    tireProgress: Math.max(0, Math.min(1, tireUsed / vehicle.tireInterval))
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

  if (action.type === "log-maintenance") {
    const target = state.vehicles.find((item) => item.id === action.vehicleId);
    if (!target) throw new Error("Vehicle not found.");

    const oil = action.maintenanceType === "oil_change";
    const tire = action.maintenanceType === "tire_rotation";
    if (!oil && !tire) throw new Error("Unknown maintenance type.");

    const vehicles = state.vehicles.map((item) => {
      if (item.id !== action.vehicleId) return item;
      if (oil) {
        return { ...item, lastOilChangeOdometer: item.odometer, updatedAt: stamp() };
      }
      return { ...item, lastTireRotationOdometer: item.odometer, updatedAt: stamp() };
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
