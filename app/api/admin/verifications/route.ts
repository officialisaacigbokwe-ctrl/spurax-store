import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";
import { button, emailLayout, esc, sendEmail } from "@/lib/email";
import { namesMatch } from "@/lib/names";

export const runtime = "nodejs";

function fail(error: string, status = 400, code?: string) {
  return NextResponse.json({ error, code }, { status });
}

const DOCS = [
  { key: "id_front_path", label: "ID, front" },
  { key: "id_back_path", label: "ID, back" },
  { key: "selfie_path", label: "Selfie holding ID" },
  { key: "address_proof_path", label: "Proof of address" },
  { key: "cac_path", label: "CAC document" },
] as const;

// List of submissions, or one submission with temporary document links
export async function GET(request: Request) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return fail("Not allowed.", 403);
  }

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  // ---- One submission ----
  if (id) {
    const { data: row } = await admin
      .from("store_verifications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!row) {
      return fail("Not found.", 404);
    }

    const { data: store } = await admin
      .from("stores")
      .select("name, slug, owner_id")
      .eq("id", row.store_id)
      .maybeSingle();

    const { data: owner } = store?.owner_id
      ? await admin.auth.admin.getUserById(store.owner_id)
      : { data: null };

    const { data: payout } = await admin
      .from("store_payout_accounts")
      .select("account_name, bank_name")
      .eq("store_id", row.store_id)
      .maybeSingle();

    const documents: { label: string; url: string; isPdf: boolean }[] = [];

    for (const doc of DOCS) {
      const path = row[doc.key] as string | null;

      if (!path) continue;

      // Links that stop working after 5 minutes
      const { data: signed } = await admin.storage
        .from("verification-docs")
        .createSignedUrl(path, 300);

      if (signed?.signedUrl) {
        documents.push({
          label: doc.label,
          url: signed.signedUrl,
          isPdf: path.toLowerCase().endsWith(".pdf"),
        });
      }
    }

    return NextResponse.json({
      verification: {
        id: row.id,
        status: row.status,
        id_type: row.id_type,
        rejection_reason: row.rejection_reason,
        created_at: row.created_at,
        store_name: store?.name ?? "",
        store_slug: store?.slug ?? "",
        owner_email: owner?.user?.email ?? "",
        id_name: row.id_name ?? null,
        approved_level: row.approved_level ?? null,
        has_cac: Boolean(row.cac_path),
        has_address: Boolean(row.address_proof_path),
        payout_account_name: payout?.account_name ?? null,
        payout_bank_name: payout?.bank_name ?? null,
      },
      documents,
    });
  }

  // ---- List ----
  const status = searchParams.get("status") || "pending";

  if (!["pending", "approved", "rejected"].includes(status)) {
    return fail("Invalid status.");
  }

  const { data: rows } = await admin
    .from("store_verifications")
    .select("id, store_id, status, id_type, created_at")
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(100);

  const storeIds = [...new Set((rows ?? []).map((row) => row.store_id))];

  const { data: stores } = storeIds.length
    ? await admin.from("stores").select("id, name").in("id", storeIds)
    : { data: [] };

  const names = new Map((stores ?? []).map((store) => [store.id, store.name]));

  return NextResponse.json({
    items: (rows ?? []).map((row) => ({
      id: row.id,
      status: row.status,
      id_type: row.id_type,
      created_at: row.created_at,
      store_name: names.get(row.store_id) || "Unknown store",
    })),
  });
}

// Approve or reject
export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return fail("Not allowed.", 403);
    }

    const admin = createAdminClient();
    const body = await request.json().catch(() => null);

    const id = typeof body?.id === "string" ? body.id : "";
    const decision = body?.decision;
    const reason =
      typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    const idName =
      typeof body?.idName === "string" ? body.idName.trim().slice(0, 120) : "";
    const level = body?.level;
    const confirmMismatch = body?.confirmMismatch === true;

    if (!id || (decision !== "approve" && decision !== "reject")) {
      return fail("Invalid request.");
    }

    if (decision === "reject" && reason.length < 5) {
      return fail("Please give a reason, so the seller knows what to fix.");
    }

    // Load the submission first, so every check happens before any change.
    const { data: row } = await admin
      .from("store_verifications")
      .select("id, store_id, status, cac_path, address_proof_path")
      .eq("id", id)
      .maybeSingle();

    if (!row || row.status !== "pending") {
      return fail("This submission was already reviewed.");
    }

    if (decision === "approve") {
      if (idName.length < 3) {
        return fail("Type the full name exactly as it appears on the ID.");
      }

      if (level !== "identity" && level !== "business") {
        return fail("Choose a verification level.");
      }

      if (level === "business" && (!row.cac_path || !row.address_proof_path)) {
        return fail(
          "Business level needs both a CAC document and a proof of address."
        );
      }

      // The name on the ID should match the name on the payout account.
      const { data: payout } = await admin
        .from("store_payout_accounts")
        .select("account_name")
        .eq("store_id", row.store_id)
        .maybeSingle();

      if (
        payout?.account_name &&
        !namesMatch(idName, payout.account_name) &&
        !confirmMismatch
      ) {
        return fail(
          `The name on the ID does not match the payout account name (${payout.account_name}). Check again, or confirm that the difference is fine.`,
          409,
          "name_mismatch"
        );
      }
    }

    const now = new Date().toISOString();

    // Only works while it is still pending
    const { data: updated } = await admin
      .from("store_verifications")
      .update({
        status: decision === "approve" ? "approved" : "rejected",
        rejection_reason: decision === "reject" ? reason : null,
        id_name: decision === "approve" ? idName : null,
        approved_level: decision === "approve" ? level : null,
        reviewed_by: adminUser.id,
        reviewed_at: now,
      })
      .eq("id", id)
      .eq("status", "pending")
      .select("store_id");

    if (!updated || updated.length === 0) {
      return fail("This submission was already reviewed.");
    }

    const storeId = updated[0].store_id;

    if (decision === "approve") {
      await admin
        .from("stores")
        .update({
          is_verified: true,
          verified_at: now,
          verification_level: level,
        })
        .eq("id", storeId);
    }

    // Tell the seller. A failed email never blocks the decision.
    try {
      const { data: store } = await admin
        .from("stores")
        .select("name, owner_id")
        .eq("id", storeId)
        .maybeSingle();

      const { data: owner } = store?.owner_id
        ? await admin.auth.admin.getUserById(store.owner_id)
        : { data: null };

      const email = owner?.user?.email;
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

      if (email && store) {
        const levelText =
          level === "business" ? "Business verified" : "Identity verified";

        const html =
          decision === "approve"
            ? emailLayout(
                "Your store is verified",
                `<p style="font-size:14px;line-height:1.6;">Good news. <strong>${esc(store.name)}</strong> has been verified and now shows the Spurax verified badge.</p>
                 <p style="font-size:14px;line-height:1.6;"><strong>Level:</strong> ${esc(levelText)}</p>
                 ${button(`${site}/seller/verification`, "View verification")}`
              )
            : emailLayout(
                "Your verification was not approved",
                `<p style="font-size:14px;line-height:1.6;">We could not verify <strong>${esc(store.name)}</strong> this time.</p>
                 <p style="font-size:14px;line-height:1.6;"><strong>Reason:</strong> ${esc(reason)}</p>
                 <p style="font-size:14px;line-height:1.6;">You can submit again with the corrected documents.</p>
                 ${button(`${site}/seller/verification`, "Submit again")}`
              );

        await sendEmail({
          to: email,
          subject:
            decision === "approve"
              ? "Your Spurax store is verified"
              : "Your Spurax verification was not approved",
          html,
        });
      }
    } catch (error) {
      console.error("Verification email error:", error);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verification decision error:", error);
    return fail("Something went wrong.", 500);
  }
}