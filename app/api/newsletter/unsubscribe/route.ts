import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";

  if (!UUID.test(token)) {
    return NextResponse.json({ error: "This link is not valid." }, { status: 400 });
  }

  const admin = createAdminClient();

  await admin
    .from("newsletter_subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("token", token)
    .is("unsubscribed_at", null);

  return NextResponse.json({ ok: true });
}