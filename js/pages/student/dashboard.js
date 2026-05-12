import { supabase } from '../../supabase.js';
import { escapeHtml, safeUrl } from '../../ui.js';
import { getActivePlanUsage } from '../../planUsage.js';
import { translateAsaasStatus } from '../../asaas.js';

export const studentDashboard = {
    async render() {
        const mainContent = document.getElementById('main-content');
        const user = (await supabase.auth.getUser()).data.user;
        
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <div>
                        <h1 style="font-family: var(--font-brand); font-size: 28px; font-weight: 400; color: var(--dx-teal); margin-bottom: 4px;">OLÁ, ${user.user_metadata.full_name.split(' ')[0]}</h1>
                        <p style="color: var(--dx-muted); font-size: 14px;">Painel do Atleta</p>
                    </div>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>

                <div id="pending-payment-banner-area"></div>
                
                <div id="student-status-area" style="display: flex; flex-direction: column; gap: 16px;">
                    <p style="color: var(--dx-muted); text-align: center; padding: 20px;">Carregando informações...</p>
                </div>

                <div id="next-training-area" style="margin-top: 24px;">
                    <!-- Carregado via JS -->
                </div>

                <div id="responsible-area" style="margin-top: 24px; margin-bottom: 32px;">
                    <!-- Carregado via JS -->
                </div>
            </div>
        `;

        this.loadPendingPaymentBanner();
        this.loadStatus();
        this.loadNextTraining();
        this.loadResponsible();
    },

    async loadPendingPaymentBanner() {
        const container = document.getElementById('pending-payment-banner-area');
        if (!container) return;

        const userId = (await supabase.auth.getUser()).data.user.id;
        const { data: pendingPayments, error, count } = await supabase
            .from('student_plans')
            .select(`
                id,
                created_at,
                asaas_status,
                asaas_invoice_url,
                plan:plans(name, price)
            `, { count: 'exact' })
            .eq('student_id', userId)
            .eq('status', 'pending_payment')
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) {
            console.error('[studentDashboard] pending payments error', error);
            container.innerHTML = '';
            return;
        }

        if (!pendingPayments || pendingPayments.length === 0) {
            container.innerHTML = '';
            return;
        }

        const mainPayment = pendingPayments[0];
        const paymentCount = count || pendingPayments.length;
        const title = paymentCount > 1
            ? `${paymentCount} faturas aguardando pagamento`
            : 'Fatura aguardando pagamento';
        const planName = mainPayment.plan?.name || 'Plano';
        const price = mainPayment.plan?.price != null
            ? `R$ ${parseFloat(mainPayment.plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : '';
        const createdAt = mainPayment.created_at
            ? new Date(mainPayment.created_at).toLocaleDateString('pt-BR')
            : '';
        const asaasLine = mainPayment.asaas_status
            ? `Asaas: ${translateAsaasStatus(mainPayment.asaas_status)}`
            : 'Pagamento ainda não confirmado';

        container.innerHTML = `
            <section class="pending-payment-banner" aria-label="Pendência financeira">
                <div class="pending-payment-banner__icon">
                    <i class="ph ph-warning-circle"></i>
                </div>
                <div class="pending-payment-banner__content">
                    <p class="pending-payment-banner__eyebrow">Pendência financeira</p>
                    <h2 class="pending-payment-banner__title">${escapeHtml(title)}</h2>
                    <p class="pending-payment-banner__text">
                        ${escapeHtml(planName)}${price ? ` · ${escapeHtml(price)}` : ''}${createdAt ? ` · ${escapeHtml(createdAt)}` : ''}
                    </p>
                    <p class="pending-payment-banner__meta">${escapeHtml(asaasLine)}</p>
                    <div class="pending-payment-banner__actions">
                        <a href="#checkout?sp=${encodeURIComponent(mainPayment.id)}" class="btn btn-primary pending-payment-banner__primary">
                            CONTINUAR PAGAMENTO
                        </a>
                        ${mainPayment.asaas_invoice_url ? `
                            <a href="${safeUrl(mainPayment.asaas_invoice_url)}" target="_blank" rel="noopener noreferrer" class="btn pending-payment-banner__secondary">
                                VER FATURA
                            </a>
                        ` : `
                            <a href="#payments" class="btn pending-payment-banner__secondary">
                                VER FATURAS
                            </a>
                        `}
                    </div>
                </div>
            </section>
        `;
    },

    async loadStatus() {
        const container = document.getElementById('student-status-area');
        const userId = (await supabase.auth.getUser()).data.user.id;

        // 1. Buscar plano atual e frequência do mês em paralelo
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const [planUsage, { count: presences }, { data: plans }] = await Promise.all([
            getActivePlanUsage(userId),
            supabase.from('attendance').select('*', { count: 'exact', head: true })
                .eq('student_id', userId)
                .gte('checked_in_at', startOfMonth.toISOString()),
            supabase.from('student_plans')
                .select('status, expires_at, plan:plans(name)')
                .eq('student_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
        ]);

        const currentPlan = plans?.[0];
        const expiresAt = currentPlan?.expires_at;
        let validityStr = '--';
        let expiringWarning = false;

        if (currentPlan && currentPlan.status === 'active' && expiresAt) {
            validityStr = new Date(expiresAt).toLocaleDateString('pt-BR');
            expiringWarning = (new Date(expiresAt).getTime() - Date.now()) < 7 * 86400000;
        }

        const quotaLine = planUsage?.total
            ? `<p style="font-size: 12px; color: var(--dx-muted); margin-top: 4px;">Aulas: <span style="color: var(--dx-text); font-weight: 600;">${planUsage.used}/${planUsage.total} usadas</span></p>`
            : '';

        container.innerHTML = `
            <div class="card card-highlight" style="${expiringWarning ? 'border-color: var(--dx-danger);' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">Plano Ativo</p>
                        <p style="font-weight: 800; font-size: 18px; margin-top: 4px;">${escapeHtml(currentPlan ? currentPlan.plan.name : 'NENHUM PLANO')}</p>
                    </div>
                    ${currentPlan ? `<span class="badge ${currentPlan.status === 'active' ? 'badge-active' : 'badge-pending'}">${this.getPlanStatusLabel(currentPlan.status)}</span>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <div>
                        <p style="font-size: 12px; color: ${expiringWarning ? 'var(--dx-danger)' : 'var(--dx-muted)'};">Válido até: <span style="color: ${expiringWarning ? 'var(--dx-danger)' : 'var(--dx-text)'}; font-weight: 600;">${validityStr}</span>${expiringWarning ? ' ⚠️' : ''}</p>
                        ${quotaLine}
                    </div>
                    <a href="#plans" style="font-size: 12px; color: var(--dx-teal); font-weight: 700; text-decoration: none;">VER OUTROS</a>
                </div>
            </div>

            <div class="card" style="display: flex; align-items: center; justify-content: space-between; background: var(--dx-surface2);">
                <div>
                    <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">Frequência (Mês)</p>
                    <p style="font-weight: 800; font-size: 22px; margin-top: 4px;">${presences || 0} <span style="font-size: 14px; color: var(--dx-muted); font-weight: 400;">treinos</span></p>
                </div>
                <a href="#attendance" style="background: var(--dx-teal-dim); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--dx-teal-border);">
                    <i class="ph ph-chart-bar" style="color: var(--dx-teal); font-size: 20px;"></i>
                </a>
            </div>
        `;
    },

    async loadNextTraining() {
        const container = document.getElementById('next-training-area');
        
        const { data: sessions } = await supabase
            .from('training_sessions')
            .select('*')
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at')
            .limit(1);

        const next = sessions?.[0];

        if (!next) return;

        const date = new Date(next.scheduled_at);
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        container.innerHTML = `
            <h3 style="font-size: 14px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 12px;">PRÓXIMO TREINO</h3>
            <div class="card" style="border-color: var(--dx-teal-border); position: relative; overflow: hidden;">
                <div style="position: absolute; right: -10px; top: -10px; opacity: 0.1;">
                    <i class="ph ph-soccer-ball" style="font-size: 80px;"></i>
                </div>
                <p style="color: var(--dx-teal); font-weight: 700; font-size: 12px;">${dateStr.toUpperCase()} • ${timeStr}</p>
                <p style="font-weight: 800; font-size: 20px; margin: 4px 0;">${escapeHtml(next.title)}</p>
                <p style="font-size: 13px; color: var(--dx-muted); display: flex; align-items: center; gap: 4px;">
                    <i class="ph ph-map-pin"></i> ${escapeHtml(next.location)}
                </p>
                <a href="#trainings" class="btn btn-primary" style="margin-top: 16px; padding: 10px; font-size: 13px;">CHECK-IN / DETALHES</a>
            </div>
        `;
    },

    getPlanStatusLabel(status) {
        const labels = {
            'active': 'ATIVO',
            'pending_payment': 'PENDENTE',
            'expired': 'VENCIDO',
            'cancelled': 'CANCELADO'
        };
        return labels[status] || status.toUpperCase();
    },

    async loadResponsible() {
        const container = document.getElementById('responsible-area');
        const userId = (await supabase.auth.getUser()).data.user.id;

        const { data: links } = await supabase
            .from('responsible_students')
            .select('responsible:users!responsible_id(full_name, phone, email)')
            .eq('student_id', userId)
            .single();

        if (links) {
            container.innerHTML = `
                <h3 style="font-size: 14px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 12px;">MEU RESPONSÁVEL</h3>
                <div class="card" style="display: flex; align-items: center; gap: 12px; background: var(--dx-surface2);">
                    <div style="background: var(--dx-teal-dim); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="ph-fill ph-shield-check" style="color: var(--dx-teal);"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700;">${escapeHtml(links.responsible.full_name)}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${escapeHtml(links.responsible.email)}</p>
                    </div>
                </div>
            `;
        }
    }
};
