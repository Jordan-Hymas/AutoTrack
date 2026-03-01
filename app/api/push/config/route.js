import { ensurePushSweepScheduler } from "../../../../lib/notifications/push-scheduler.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolvePublicKey() {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    ""
  ).trim();
}

export async function GET() {
  ensurePushSweepScheduler();
  const publicKey = resolvePublicKey();
  return Response.json(
    {
      publicKey,
      ready: Boolean(publicKey && (process.env.VAPID_PRIVATE_KEY || "").trim())
    },
    { status: 200 }
  );
}
