import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const LIMIT = 50;

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

// The current founding stores, plus search results when ?q= is given.
export async function GET(request: Request) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return fail("Not allowed.", 403);
  }

  const admin = createAdminClient();
  const q = (new URL(request.url).searchParams.get("q") || "").trim().slice(0, 60);

  const { data: founding } = await admin
    .from("stores")
    .select("id, name, slug, founding_number, is_active")
    .not("founding_number", "is", null)
    .order("founding_number", { ascending: true });

  let results: unknown[] = [];

  if (q.length >= 2) {
    const escaped = q.replace(/[%_\\]/g, "\\$&");

    const { data } = await admin
      .from("stores")
      .select("id, name, slug, founding_number, is_verified, created_at")
      .ilike("name", `%${escaped}%`)
      .order("created_at", { ascending: true })
      .limit(10);

    results = data ?? [];
  }

  return NextResponse.json({ founding: founding ?? [], results, limit: LIMIT });
}

// Grant or revoke the badge
export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return fail("Not allowed.", 403);
    }

    const admin = createAdminClient();
    const body = await request.json().catch(() => null);

    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    const action = body?.action;

    if (!storeId || (action !== "grant" && action !== "revoke")) {
      return fail("Invalid request.");
    }

    if (action === "grant") {
      const { data, error } = await admin.rpc("grant_founding_store", {
        p_store_id: storeId,
      });

      if (error) {
        const message = error.message || "";

        if (message.includes("founding_full")) {
          return fail(`All ${LIMIT} founding spots are already taken.`);
        }

        if (message.includes("already_founding")) {
          return fail("This store is already a founding store.");
        }

        if (message.includes("store_not_found")) {
          return fail("Store not found.", 404);
        }

        console.error("Founding grant error:", message);
        return fail("Could not grant the badge.", 500);
      }

      return NextResponse.json({ ok: true, number: data });
    }

    const { error } = await admin
      .from("stores")
      .update({ founding_number: null })
      .eq("id", storeId);

    if (error) {
      return fail("Could not remove the badge.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Founding error:", error);
    return fail("Something went wrong.", 500);
  }
}