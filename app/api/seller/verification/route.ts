import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ID_TYPES = ["nin", "drivers_license", "passport", "voters_card"];

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function text(value: unknown, max = 300): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail("Please sign in.", 401);
    }

    const body = await request.json().catch(() => null);

    const storeId = text(body?.storeId, 80);
    const idType = text(body?.idType, 30);
    const idFrontPath = text(body?.idFrontPath);
    const idBackPath = text(body?.idBackPath);
    const selfiePath = text(body?.selfiePath);
    const addressProofPath = text(body?.addressProofPath);
    const cacPath = text(body?.cacPath);

    if (body?.consent !== true) {
      return fail("Please confirm the declaration to continue.");
    }

    if (!storeId || !ID_TYPES.includes(idType)) {
      return fail("Choose your ID type.");
    }

    if (!idFrontPath || !selfiePath) {
      return fail("Your ID and your selfie holding the ID are required.");
    }

    // Only the owner of the store can submit for it.
    const { data: store } = await admin
      .from("stores")
      .select("id, owner_id, is_verified")
      .eq("id", storeId)
      .maybeSingle();

    if (!store || store.owner_id !== user.id) {
      return fail("You do not have access to this store.", 403);
    }

    if (store.is_verified) {
      return fail("This store is already verified.");
    }

    // Every file must sit inside this store's own folder and really exist.
    const submitted = [
      idFrontPath,
      idBackPath,
      selfiePath,
      addressProofPath,
      cacPath,
    ].filter(Boolean);

    const { data: files } = await admin.storage
      .from("verification-docs")
      .list(storeId, { limit: 1000 });

    const existing = new Set((files ?? []).map((file) => file.name));

    for (const path of submitted) {
      const name = path.startsWith(`${storeId}/`)
        ? path.slice(storeId.length + 1)
        : "";

      if (
        !name ||
        path.includes("..") ||
        name.includes("/") ||
        !existing.has(name)
      ) {
        return fail("One of the uploaded files could not be found. Please try again.");
      }
    }

    const { error: insertError } = await admin
      .from("store_verifications")
      .insert({
        store_id: storeId,
        submitted_by: user.id,
        status: "pending",
        id_type: idType,
        id_front_path: idFrontPath,
        id_back_path: idBackPath || null,
        selfie_path: selfiePath,
        address_proof_path: addressProofPath || null,
        cac_path: cacPath || null,
      });

    if (insertError) {
      // 23505 = the unique rule: a pending or approved one already exists
      if (insertError.code === "23505") {
        return fail("This store already has a verification in progress.");
      }

      console.error("Verification insert error:", insertError.message);
      return fail("Could not save your submission. Please try again.", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verification submit error:", error);
    return fail("Something went wrong. Please try again.", 500);
  }
}