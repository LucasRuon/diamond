import { supabase } from './supabase.js';
import { toast } from './auth.js';

/**
 * Invoca a Edge Function asaas-checkout para criar uma cobrança Asaas.
 * Retorna { studentPlanId, paymentId, invoiceUrl, pix }.
 *
 * @param {object} params
 * @param {string} params.planId
 * @param {string} params.studentId
 * @param {'PIX'|'CREDIT_CARD'} params.paymentMethod
 * @param {number} [params.installments]
 */
export async function createCheckout({ planId, studentId, paymentMethod, installments }) {
    if (!planId || !studentId || !paymentMethod) {
        throw new Error('Parâmetros incompletos para o checkout.');
    }

    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
        body: {
            planId,
            studentId,
            paymentMethod,
            installments: installments && installments > 1 ? installments : undefined
        }
    });

    if (error) {
        // Edge Function retorna corpo JSON com { error }
        let message = error.message || 'Erro ao criar cobrança.';
        try {
            const ctx = error.context;
            if (ctx && typeof ctx.json === 'function') {
                const payload = await ctx.json();
                if (payload?.error) message = payload.error;
            }
        } catch (_) { /* noop */ }
        toast.show(message, 'error');
        throw new Error(message);
    }

    if (data?.error) {
        toast.show(data.error, 'error');
        throw new Error(data.error);
    }

    return data;
}

/**
 * Consulta o status atual de uma student_plan (lê asaas_status e status).
 * Retorna a row ou null.
 */
export async function getPaymentStatus(studentPlanId) {
    if (!studentPlanId) return null;
    const { data, error } = await supabase
        .from('student_plans')
        .select('id, status, asaas_status, asaas_invoice_url, asaas_payment_id, plan_id, student_id')
        .eq('id', studentPlanId)
        .single();

    if (error) {
        console.error('[asaas] getPaymentStatus error', error);
        throw error;
    }
    return data;
}

/**
 * Traduz constantes Asaas para o usuário final.
 */
export function translateAsaasStatus(asaasStatus) {
    const map = {
        PENDING: 'Aguardando pagamento',
        CONFIRMED: 'Pagamento confirmado',
        RECEIVED: 'Pagamento recebido',
        OVERDUE: 'Em atraso',
        REFUNDED: 'Reembolsado',
        CANCELLED: 'Cancelado'
    };
    return map[asaasStatus] || asaasStatus || '—';
}
