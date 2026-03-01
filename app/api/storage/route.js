import { getSnapshot, saveSnapshot } from "../../../lib/db/sqlite-storage.js";
import { ensurePushSweepScheduler } from "../../../lib/notifications/push-scheduler.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  ensurePushSweepScheduler();
  try {
    const payload = await getSnapshot();
    return Response.json(payload, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to load storage snapshot." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  ensurePushSweepScheduler();
  try {
    const body = await request.json();
    const nextSnapshot = await saveSnapshot(body?.snapshot);
    return Response.json({ snapshot: nextSnapshot }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to save storage snapshot." },
      { status: 500 }
    );
  }
}
