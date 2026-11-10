import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

// Stops spreadsheet programs from running text as a formula.
function safeCell(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function GET(request: Request) {
  const adminUser = await requireAdmin();

  if (!adminUser) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const admin = createAdminClient();
  const format = new URL(request.url).searchParams.get("format");

  // ---- Download: active subscribers only ----
  if (format === "csv") {
    const { data } = await admin
      .from("newsletter_subscribers")
      .select("email, created_at")
      .is("unsubscribed_at", null)
      .order("created_at", { ascending: true })
      .limit(50000);

    const lines = ["email,subscribed_on"].concat(
      (data ?? []).map(
        (row) =>
          `"${safeCell(row.email).replace(/"/g, '""')}","${new Date(
            row.created_at
          )
            .toISOString()
            .slice(0, 10)}"`
      )
    );

    return new NextResponse("\uFEFF" + lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="spurax-subscribers.csv"',
      },
    });
  }

  // ---- Summary ----
  const { count: active } = await admin
    .from("newsletter_subscribers")
    .select("id", { count: "exact", head: true })
    .is("unsubscribed_at", null);

  const { count: unsubscribed } = await admin
    .from("newsletter_subscribers")
    .select("id", { count: "exact", head: true })
    .not("unsubscribed_at", "is", null);

  const { data: latest } = await admin
    .from("newsletter_subscribers")
    .select("email, created_at, unsubscribed_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    active: active ?? 0,
    unsubscribed: unsubscribed ?? 0,
    latest: latest ?? [],
  });
}