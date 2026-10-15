import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { z } from "npm:zod";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const adminClient = createClient(supabaseUrl, serviceRoleKey);

const BaseSchema = z.object({
  action: z.enum(["create", "update", "delete", "reset-password"]),
});

const CreateSchema = BaseSchema.extend({
  action: z.literal("create"),
  full_name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  role: z.enum(["OWNER", "STAFF"]),
});

const UpdateSchema = BaseSchema.extend({
  action: z.literal("update"),
  user_id: z.string().uuid(),
  full_name: z.string().trim().min(2).max(80).optional(),
  role: z.enum(["OWNER", "STAFF"]).optional(),
  is_active: z.boolean().optional(),
});

const DeleteSchema = BaseSchema.extend({
  action: z.literal("delete"),
  user_id: z.string().uuid(),
});

const ResetPasswordSchema = BaseSchema.extend({
  action: z.literal("reset-password"),
  user_id: z.string().uuid(),
  new_password: z.string().min(8).max(128),
});

async function requireOwner(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization header");
  const jwt = authHeader.replace("Bearer ", "");

  const { data: { user }, error } = await adminClient.auth.getUser(jwt);
  if (error || !user) throw new Error("Unauthorized");

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "OWNER" || profile.is_active === false) {
    throw new Error("Forbidden: owner only");
  }
  return user;
}

async function activeOwnerCount(excludeId?: string): Promise<number> {
  let q = adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "OWNER")
    .eq("is_active", true);
  if (excludeId) q = q.neq("id", excludeId);
  const { count } = await q;
  return count ?? 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireOwner(req);
    const payload = await req.json().catch(() => ({}));

    if (payload.action === "create") {
      const v = CreateSchema.safeParse(payload);
      if (!v.success) {
        return new Response(JSON.stringify({ error: v.error.flatten() }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await adminClient.auth.admin.createUser({
        email: v.data.email,
        password: v.data.password,
        email_confirm: true,
        user_metadata: { full_name: v.data.full_name, role: v.data.role },
      });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ success: true, user_id: data.user?.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "update") {
      const v = UpdateSchema.safeParse(payload);
      if (!v.success) {
        return new Response(JSON.stringify({ error: v.error.flatten() }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: target } = await adminClient
        .from("profiles")
        .select("role, is_active")
        .eq("id", v.data.user_id)
        .single();
      if (!target) throw new Error("User not found");

      const wasActiveOwner = target.role === "OWNER" && target.is_active !== false;
      const willDeactivate = v.data.is_active === false && target.is_active !== false;
      const willDemote = v.data.role === "STAFF" && target.role === "OWNER";
      if (wasActiveOwner && (willDeactivate || willDemote)) {
        const remaining = await activeOwnerCount(v.data.user_id);
        if (remaining < 1) {
          return new Response(
            JSON.stringify({ error: "Cannot deactivate or demote the last active owner." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const patch: Record<string, unknown> = {};
      if (v.data.full_name !== undefined) patch.full_name = v.data.full_name;
      if (v.data.role !== undefined) patch.role = v.data.role;
      if (v.data.is_active !== undefined) patch.is_active = v.data.is_active;
      if (Object.keys(patch).length === 0) throw new Error("Nothing to update");

      const { error } = await adminClient.from("profiles").update(patch).eq("id", v.data.user_id);
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "delete") {
      const v = DeleteSchema.safeParse(payload);
      if (!v.success) {
        return new Response(JSON.stringify({ error: v.error.flatten() }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: target } = await adminClient
        .from("profiles")
        .select("role, is_active")
        .eq("id", v.data.user_id)
        .single();
      if (target?.role === "OWNER" && target?.is_active !== false) {
        const remaining = await activeOwnerCount(v.data.user_id);
        if (remaining < 1) {
          return new Response(
            JSON.stringify({ error: "Cannot remove the last active owner." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
      // Deletes auth.users row; profiles row cascades. Fixes orphan-login bug.
      const { error } = await adminClient.auth.admin.deleteUser(v.data.user_id);
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (payload.action === "reset-password") {
      const v = ResetPasswordSchema.safeParse(payload);
      if (!v.success) {
        return new Response(JSON.stringify({ error: v.error.flatten() }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await adminClient.auth.admin.updateUserById(v.data.user_id, {
        password: v.data.new_password,
      });
      if (error) throw new Error(error.message);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = /Forbidden|Unauthorized/.test(message) ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
