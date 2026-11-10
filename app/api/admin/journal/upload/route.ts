import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();

    if (!adminUser) {
      return fail("Not allowed.", 403);
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");

    if (!(file instanceof File)) {
      return fail("Choose an image.");
    }

    const extension = TYPES[file.type];

    if (!extension) {
      return fail("Please use a JPG, PNG or WebP image.");
    }

    if (file.size > 5 * 1024 * 1024) {
      return fail("The image must be 5 MB or smaller.");
    }

    const admin = createAdminClient();
    const path = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

    const { error } = await admin.storage
      .from("article-covers")
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Cover upload error:", error.message);
      return fail("Could not upload the image.", 500);
    }

    const { data } = admin.storage.from("article-covers").getPublicUrl(path);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("Cover upload error:", error);
    return fail("Something went wrong.", 500);
  }
}