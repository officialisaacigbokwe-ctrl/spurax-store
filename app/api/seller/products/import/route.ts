import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  BATCH_SIZE,
  MAX_PRODUCTS_PER_STORE,
  validateRow,
} from "@/lib/product-import";

export const runtime = "nodejs";

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function makeSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${base || "product"}-${crypto.randomUUID().slice(0, 8)}`;
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

    const storeId = typeof body?.storeId === "string" ? body.storeId : "";
    const makeActive = body?.makeActive !== false;
    const rows: unknown[] = Array.isArray(body?.rows) ? body.rows : [];

    if (!storeId) {
      return fail("Choose a store.");
    }

    if (rows.length === 0 || rows.length > BATCH_SIZE) {
      return fail(`Send between 1 and ${BATCH_SIZE} products at a time.`);
    }

    // The seller must belong to this store.
    const { data: membership } = await admin
      .from("store_memberships")
      .select("store_id")
      .eq("user_id", user.id)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!membership) {
      return fail("You do not have access to this store.", 403);
    }

    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);

    if ((count ?? 0) + rows.length > MAX_PRODUCTS_PER_STORE) {
      return fail(
        `A store can have up to ${MAX_PRODUCTS_PER_STORE} products. Please import fewer.`
      );
    }

    // Check every row again on the server.
    const failed: { index: number; error: string }[] = [];
    const toInsert: Record<string, unknown>[] = [];
    const insertIndexes: number[] = [];

    rows.forEach((raw, index) => {
      const result = validateRow(raw);

      if (!result.ok) {
        failed.push({ index, error: result.error });
        return;
      }

      const row = result.row;

      toInsert.push({
        store_id: storeId,
        name: row.name,
        slug: makeSlug(row.name),
        description: row.description,
        category: row.category,
        price: row.price,
        currency: "NGN",
        image_url: row.image_url,
        sizes: row.sizes,
        colors: row.colors,
        stock_quantity: row.stock,
        is_active: makeActive,
        is_featured: false,
      });

      insertIndexes.push(index);
    });

    let imported = 0;

    if (toInsert.length > 0) {
      const { error } = await admin.from("products").insert(toInsert);

      if (error) {
        console.error("Product import error:", error.message);

        insertIndexes.forEach((index) =>
          failed.push({ index, error: "Could not be saved. Please try again." })
        );
      } else {
        imported = toInsert.length;
      }
    }

    return NextResponse.json({ imported, failed });
  } catch (error) {
    console.error("Product import error:", error);
    return fail("Something went wrong. Please try again.", 500);
  }
}