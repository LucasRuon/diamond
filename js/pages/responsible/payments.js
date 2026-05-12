import { supabase } from '../../supabase.js';
import { escapeHtml, safeUrl } from '../../ui.js';
import { getActivePlanUsage } from '../../planUsage.js';
import { translateAsaasStatus } from '../../asaas.js';

export const responsiblePayments = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">FATURAS E PAGAMENTOS</h1>
                
                <div id="payments-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Buscando faturas...</p>
                </div>
            </div>
        `;

        this.loadPayments();
    },

    async loadPayments() {
        const listContainer = document.getElementById('payments-list');
        const userId = (await supabase.auth.getUser()).data.user.id;

        const { data: payments, error } = await supabase
            .from('student_plans')
            .select(`
                id,
                created_at,
                status,
                expires_at,
                asaas_status,
                asaas_invoice_url,
                plan:plans(name, price),
                student:users!student_id(full_name)
            `)
            .eq('purchased_by', userId)
            .order('created_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar faturas.</p>`;
            return;
        }

        if (payments.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-receipt" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Você ainda não possui faturas geradas.</p>
                </div>
            `;
            return;
        }

        // Buscar quota de cada atleta distinto nos pagamentos ativos
        const studentIds = [...new Set(payments.filter(p => p.status === 'active').map(p => p.student?.full_name ? p : null).filter(Boolean).map(p => p.id))];
        const usageByStudent = {};

        await Promise.all(
            payments
                .filter((p, i, arr) => p.status === 'active' && arr.findIndex(x => x.student?.full_name === p.student?.full_name) === i)
                .map(async (p) => {
                    // Encontrar student_id via student_plans: usar o campo id do payment como student_plan_id
                    // Precisamos do student_id: buscar via supabase
                    const { data: sp } = await supabase
                        .from('student_plans')
                        .select('student_id')
                        .eq('id', p.id)
                        .maybeSingle();
                    if (sp?.student_id) {
                        usageByStudent[p.id] = await getActivePlanUsage(sp.student_id);
                    }
                })
        );

        listContainer.innerHTML = payments.map(p => {
            const date = new Date(p.created_at).toLocaleDateString('pt-BR');
            const statusLabel = this.getStatusLabel(p.status);
            const statusClass = this.getStatusClass(p.status);
            const usage = usageByStudent[p.id];
            const expiresAt = p.expires_at;
            const validityLine = p.status === 'active' && expiresAt
                ? `<p style="font-size: 12px; color: var(--dx-muted); margin-top: 4px;">Válido até: <strong>${new Date(expiresAt).toLocaleDateString('pt-BR')}</strong></p>`
                : '';
            const quotaLine = usage?.total
                ? `<p style="font-size: 12px; color: var(--dx-muted);">Aulas: <strong>${usage.used}/${usage.total}</strong></p>`
                : '';

            return `
                <div class="card" style="padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <p style="font-weight: 800; font-size: 16px;">${escapeHtml(p.plan.name)}</p>
                            <p style="font-size: 12px; color: var(--dx-muted);">Para: ${escapeHtml(p.student.full_name)} • ${date}</p>
                            ${validityLine}
                            ${quotaLine}
                        </div>
                        <p style="font-weight: 800; color: var(--dx-teal);">R$ ${parseFloat(p.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>

                    ${p.asaas_status ? `<p style="font-size: 12px; color: var(--dx-muted);">Asaas: <strong>${escapeHtml(translateAsaasStatus(p.asaas_status))}</strong></p>` : ''}

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 12px; border-top: 0.5px solid var(--dx-border); gap: 8px; flex-wrap: wrap;">
                        <span class="badge ${statusClass}">${statusLabel}</span>
                        <div style="display:flex; gap:8px; flex-wrap: wrap;">
                            ${p.status === 'pending_payment' ? `
                                <a class="btn" href="#checkout?sp=${encodeURIComponent(p.id)}" style="width:auto; padding:6px 14px; font-size:11px; background: var(--dx-teal); color:#000; text-decoration:none;">
                                    CONTINUAR PAGAMENTO
                                </a>
                            ` : ''}
                            ${p.asaas_invoice_url ? `
                                <a class="btn" href="${safeUrl(p.asaas_invoice_url)}" target="_blank" rel="noopener noreferrer" style="width:auto; padding:6px 14px; font-size:11px; border:1px solid var(--dx-border); text-decoration:none;">
                                    VER FATURA
                                </a>
                            ` : ''}
                            ${p.status === 'active' && !p.asaas_invoice_url ? `<p style="font-size: 11px; color: var(--dx-muted);">Recibo gerado</p>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    getStatusLabel(status) {
        const labels = {
            'active': 'PAGO',
            'pending_payment': 'AGUARDANDO',
            'expired': 'VENCIDO',
            'cancelled': 'CANCELADO'
        };
        return labels[status] || status.toUpperCase();
    },

    getStatusClass(status) {
        const classes = {
            'active': 'badge-active',
            'pending_payment': 'badge-pending',
            'expired': 'badge-overdue',
            'cancelled': 'badge-cancelled'
        };
        return classes[status] || '';
    }
};
