import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_ENV = (Deno.env.get("ASAAS_ENV") ?? "sandbox").toLowerCase();
const ASAAS_URL =
  ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const ALLOWED_METHODS = new Set(["PIX", "CREDIT_CARD", "DEBIT_CARD"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function asaasError(resp: any): string {
  if (Array.isArray(resp?.errors) && resp.errors.length > 0) {
    return resp.errors.map((e: any) => e.description || e.code).join("; ");
  }
  return resp?.message || "Erro upstream Asaas";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    // 1. Autenticar chamador
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "missing_bearer" }, 401);

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: authData, error: authErr } = await authClient.auth.getUser(token);
    if (authErr || !authData?.user) return json({ error: "invalid_token" }, 401);
    const callerId = authData.user.id;

    // 2. Validar input
    const body = await req.json().catch(() => ({}));
    const { planId, studentId, paymentMethod, installments } = body ?? {};
    if (!planId || !studentId || !paymentMethod) {
      return json({ error: "missing_fields" }, 400);
    }
    const method = String(paymentMethod).toUpperCase();
    if (!ALLOWED_METHODS.has(method)) {
      return json({ error: "invalid_payment_method" }, 400);
    }
    const asaasBillingType = method === "DEBIT_CARD" ? "CREDIT_CARD" : method;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Buscar caller (para checar permissão) e student/plan
    const [{ data: caller }, { data: student }, { data: plan }] = await Promise.all([
      supabase.from("users").select("id, role").eq("id", callerId).single(),
      supabase.from("users").select("*").eq("id", studentId).single(),
      supabase.from("plans").select("*").eq("id", planId).single(),
    ]);

    if (!student || !plan) return json({ error: "not_found" }, 404);

    const callerRole = caller?.role ?? "";
    const allowedForCaller =
      callerId === studentId ||
      callerRole === "admin" ||
      callerRole === "responsible" ||
      callerRole === "businessman";
    if (!allowedForCaller) return json({ error: "forbidden" }, 403);

    // 4. Customer Asaas (idempotente, com sincronização de dados)
    const customerPayload = {
      name: student.full_name,
      cpfCnpj: (student.cpf ?? "").replace(/\D/g, ""),
      email: student.email,
      phone: (student.phone ?? "").replace(/\D/g, ""),
    };

    let customerId: string | null = student.asaas_customer_id ?? null;
    if (!customerId) {
      const customerResp = await fetch(`${ASAAS_URL}/customers`, {
        method: "POST",
        headers: {
          access_token: ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerPayload),
      });
      const customerData = await customerResp.json();
      if (!customerResp.ok || !customerData?.id) {
        return json({ error: asaasError(customerData), code: "asaas_customer" }, 502);
      }
      customerId = customerData.id;
      await supabase
        .from("users")
        .update({ asaas_customer_id: customerId })
        .eq("id", student.id);
    } else {
      const updateResp = await fetch(`${ASAAS_URL}/customers/${customerId}`, {
        method: "POST",
        headers: {
          access_token: ASAAS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerPayload),
      });
      const updateData = await updateResp.json();
      if (!updateResp.ok || !updateData?.id) {
        return json(
          { error: asaasError(updateData), code: "asaas_customer_update" },
          502,
        );
      }
    }

    // 5. Criar payment
    const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const paymentPayload: Record<string, unknown> = {
      customer: customerId,
      billingType: asaasBillingType, // DEBIT_CARD usa a fatura de cartao do Asaas.
      value: plan.price,
      dueDate,
      description: `Plano ${plan.name} - Diamond X`,
      externalReference: studentId,
    };
    if (method === "CREDIT_CARD" && installments && installments > 1) {
      paymentPayload.installmentCount = installments;
      paymentPayload.totalValue = plan.price;
    }

    const paymentResp = await fetch(`${ASAAS_URL}/payments`, {
      method: "POST",
      headers: {
        access_token: ASAAS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentPayload),
    });
    const paymentData = await paymentResp.json();
    if (!paymentResp.ok || !paymentData?.id) {
      return json({ error: asaasError(paymentData), code: "asaas_payment" }, 502);
    }

    // 6. PIX QR Code (se aplicável)
    let pix: { encodedImage: string; payload: string; expirationDate: string } | null = null;
    if (method === "PIX") {
      const qrResp = await fetch(
        `${ASAAS_URL}/payments/${paymentData.id}/pixQrCode`,
        {
          method: "GET",
          headers: {
            access_token: ASAAS_API_KEY,
            "Content-Type": "application/json",
          },
        },
      );
      const qrData = await qrResp.json();
      if (qrResp.ok && qrData?.encodedImage) {
        pix = {
          encodedImage: qrData.encodedImage,
          payload: qrData.payload,
          expirationDate: qrData.expirationDate,
        };
      }
    }

    // 7. Persistir student_plan
    const invoiceUrl = paymentData.invoiceUrl ?? null;
    const { data: spRow, error: spErr } = await supabase
      .from("student_plans")
      .insert([
        {
          student_id: studentId,
          plan_id: planId,
          purchased_by: callerId,
          status: "pending_payment",
          asaas_payment_id: paymentData.id,
          asaas_status: "PENDING",
          asaas_invoice_url: invoiceUrl,
        },
      ])
      .select("id")
      .single();

    if (spErr || !spRow) {
      return json({ error: spErr?.message ?? "student_plan_insert_failed" }, 500);
    }

    return json({
      studentPlanId: spRow.id,
      paymentId: paymentData.id,
      invoiceUrl,
      pix,
      paymentMethod: method,
      asaasBillingType,
    });
  } catch (error) {
    console.error("[asaas-checkout] error", error);
    return json({ error: (error as Error).message ?? "internal_error" }, 500);
  }
});
