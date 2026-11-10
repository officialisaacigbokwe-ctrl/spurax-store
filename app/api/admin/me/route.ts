import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

// Tells the site whether the signed-in user is an admin.
// It reveals nothing else to non-admins.
export async function GET() {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ isAdmin: false });
  }

  const admin = createAdminClient();

  const { count } = await admin
    .from("store_verifications")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return NextResponse.json({
    isAdmin: true,
    pendingVerifications: count ?? 0,
  });
}