import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

// Mapeamento evento Asaas -> { asaas_status, side_effect }
type Action = {
  asaasStatus: string;
  activate?: boolean;
  cancel?: boolean;
};

const EVENT_MAP: Record<string, Action> = {
  PAYMENT_CONFIRMED: { asaasStatus: "CONFIRMED", activate: true },
  PAYMENT_RECEIVED: { asaasStatus: "RECEIVED", activate: true },
  PAYMENT_OVERDUE: { asaasStatus: "OVERDUE" },
  PAYMENT_REFUNDED: { asaasStatus: "REFUNDED", cancel: true },
  PAYMENT_DELETED: { asaasStatus: "CANCELLED", cancel: true },
};

function ok(body: unknown = { ok: true }) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    headers: { "Content-Type": "application/json" },
    status: 401,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "asaas-access-token, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return ok({ ignored: "method" });

  // 1. Auth via header asaas-access-token
  const tokenHeader = req.headers.get("asaas-access-token") ?? "";
  if (!WEBHOOK_TOKEN || tokenHeader !== WEBHOOK_TOKEN) {
    console.error("[asaas-webhook] invalid token");
    return unauthorized();
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    console.error("[asaas-webhook] invalid json");
    return ok({ ignored: "invalid_json" });
  }

  const event: string = body?.event ?? "";
  const payment = body?.payment ?? {};
  const paymentId: string = payment?.id ?? "";

  if (!event || !paymentId) {
    console.log("[asaas-webhook] missing fields", { event, paymentId });
    return ok({ ignored: "missing_fields" });
  }

  const action = EVENT_MAP[event];
  if (!action) {
    console.log("[asaas-webhook] unknown event", { event, paymentId });
    return ok({ ignored: "unknown_event" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 2. Localizar student_plan
  const { data: sp, error: selErr } = await supabase
    .from("student_plans")
    .select("id, status, asaas_status")
    .eq("asaas_payment_id", paymentId)
    .maybeSingle();

  if (selErr) {
    console.error("[asaas-webhook] select error", selErr);
    return ok({ ignored: "select_error" });
  }
  if (!sp) {
    console.log("[asaas-webhook] payment not found", { paymentId });
    return ok({ ignored: "not_found" });
  }

  // 3. Idempotência
  if (sp.asaas_status === action.asaasStatus) {
    console.log("[asaas-webhook] noop (already in target state)", {
      paymentId,
      asaasStatus: action.asaasStatus,
    });
    return ok({ noop: true });
  }

  // 4. Ações
  try {
    if (action.activate) {
      // Só ativa se ainda estiver pending_payment; RPC valida transições.
      if (sp.status === "pending_payment") {
        const { error: rpcErr } = await supabase.rpc("activate_student_plan", {
          p_student_plan_id: sp.id,
        });
        if (rpcErr) {
          console.error("[asaas-webhook] rpc error", rpcErr);
        }
      }
      await supabase
        .from("student_plans")
        .update({ asaas_status: action.asaasStatus })
        .eq("id", sp.id);
    } else if (action.cancel) {
      await supabase
        .from("student_plans")
        .update({
          asaas_status: action.asaasStatus,
          status: "cancelled",
        })
        .eq("id", sp.id);
    } else {
      await supabase
        .from("student_plans")
        .update({ asaas_status: action.asaasStatus })
        .eq("id", sp.id);
    }

    console.log("[asaas-webhook] applied", {
      event,
      paymentId,
      asaasStatus: action.asaasStatus,
    });
    return ok({ applied: true });
  } catch (error) {
    console.error("[asaas-webhook] action error", error);
    return ok({ ignored: "action_error" });
  }
});
