import {
  listPushSubscriptions,
  removePushSubscription,
  upsertPushSubscription
} from "../../../../lib/db/sqlite-storage.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveEndpointFromBody(body) {
  if (!body || typeof body !== "object") return "";
  if (typeof body.endpoint === "string" && body.endpoint.trim()) return body.endpoint.trim();
  if (
    body.subscription &&
    typeof body.subscription === "object" &&
    typeof body.subscription.endpoint === "string" &&
    body.subscription.endpoint.trim()
  ) {
    return body.subscription.endpoint.trim();
  }
  return "";
}

export async function GET() {
  try {
    const subscriptions = await listPushSubscriptions();
    return Response.json({ count: subscriptions.length }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to inspect push subscriptions." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const subscription = body?.subscription;
    const userAgent = request.headers.get("user-agent") || "";
    const saved = await upsertPushSubscription(subscription, { userAgent });

    if (!saved) {
      return Response.json({ error: "Invalid push subscription payload." }, { status: 400 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to save push subscription." },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const endpoint = resolveEndpointFromBody(body);
    if (!endpoint) {
      return Response.json({ error: "Missing subscription endpoint." }, { status: 400 });
    }

    await removePushSubscription(endpoint);
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Unable to remove push subscription." },
      { status: 500 }
    );
  }
}
