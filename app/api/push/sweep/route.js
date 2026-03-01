import { runPushNotificationSweep } from "../../../../lib/notifications/push-sweep.js";
import { ensurePushSweepScheduler } from "../../../../lib/notifications/push-scheduler.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request) {
  const configured = process.env.AUTOTRACK_CRON_SECRET?.trim();
  if (!configured) return true;

  const direct = request.headers.get("x-autotrack-cron-secret") || "";
  if (direct && direct === configured) return true;

  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim() === configured;
  }

  return false;
}

function parseDryRun(request) {
  const { searchParams } = new URL(request.url);
  const value = (searchParams.get("dryRun") || "").toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

async function handleSweep(request) {
  ensurePushSweepScheduler();
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await runPushNotificationSweep({ dryRun: parseDryRun(request) });
    return Response.json(payload, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to execute push sweep." },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return handleSweep(request);
}

export async function POST(request) {
  return handleSweep(request);
}
