import { createServerFn } from "@tanstack/react-start";

export const DEV_ADMIN_EMAIL = "dev-admin-1234@musee.local";
export const DEV_ADMIN_PASSWORD = "dev-admin-1234!";

/**
 * Dev-only: ensures a fixed admin account exists in auth + has the admin role.
 * Safe to call repeatedly. To be removed before production.
 */
export const ensureDevAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Try to find existing user by email
  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) throw listErr;
  let user = list.users.find((u) => u.email === DEV_ADMIN_EMAIL);

  if (!user) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: DEV_ADMIN_EMAIL,
      password: DEV_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: "Admin (dev)" },
    });
    if (createErr) throw createErr;
    user = created.user!;
  } else {
    // Ensure password is the expected one (in case it was changed)
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: DEV_ADMIN_PASSWORD,
      email_confirm: true,
    });
  }

  // Ensure admin role
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id,role" });
  if (roleErr) throw roleErr;

  return { ok: true };
});
