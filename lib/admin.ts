import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Returns the signed-in user if they are a Spurax admin, otherwise null.
export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return null;
  }

  const admin = createAdminClient();

  const { data } = await admin
    .from("admin_emails")
    .select("email")
    .eq("email", user.email.toLowerCase())
    .maybeSingle();

  return data ? user : null;
}