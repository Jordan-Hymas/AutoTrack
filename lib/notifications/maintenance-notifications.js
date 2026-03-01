export const DAY_MS = 24 * 60 * 60 * 1000;

export function getServiceLabel(maintenanceType) {
  return maintenanceType === "oil_change" ? "Oil Change" : "Tire Rotation";
}

export function getNotificationStage(remainingMs, windowMs) {
  // Product requirement: notify when the timer is complete (or overdue), not before.
  if (remainingMs < -DAY_MS) return "overdue";
  if (remainingMs <= 0) return "service_due";
  return null;
}

export function getNotificationStageKey(stage, dueDateISO) {
  const dueDateKey = Number.isFinite(Date.parse(dueDateISO))
    ? new Date(dueDateISO).toISOString()
    : "unknown";
  return `${stage}:${dueDateKey}`;
}

function remainingLabelForNotification(remainingMs) {
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

function dueDateTimeLabel(dateISO) {
  const value = new Date(dateISO);
  if (!Number.isFinite(value.getTime())) return "soon";
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function buildServiceNotificationBody({ vehicleName, maintenanceType, stage, remainingMs, dueDateISO }) {
  const serviceLabel = getServiceLabel(maintenanceType);
  const remaining = remainingLabelForNotification(remainingMs);
  const dueAt = dueDateTimeLabel(dueDateISO);

  if (stage === "service_due") {
    return `${serviceLabel} is due now for ${vehicleName}.`;
  }
  if (stage === "time_to_service") {
    return `It's time for ${serviceLabel.toLowerCase()} on ${vehicleName}.`;
  }
  if (stage === "overdue") {
    return `${serviceLabel} is overdue for ${vehicleName}: ${remaining}.`;
  }

  return `${serviceLabel} due soon for ${vehicleName}: ${remaining}. Due ${dueAt}.`;
}
