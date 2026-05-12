import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';
import { createCheckout } from '../../asaas.js';
import { checkoutPage } from '../checkout.js';

export const adminCharges = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header page-header--financeiro">
                    <h1 class="brand-title page-header-title">FINANCEIRO</h1>
                    <div class="page-header-actions page-header-actions--financeiro">
                        <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                        <button id="add-charge-btn" class="btn btn-primary finance-header-action" aria-label="Adicionar cobranca">
                            <i class="ph ph-plus-circle"></i>
                        </button>
                        <button id="refresh-charges-btn" class="btn finance-header-action" aria-label="Atualizar cobrancas">
                            <i class="ph ph-arrows-clockwise"></i>
                        </button>
                    </div>
                </div>

                <div class="input-group" style="margin-bottom: 16px;">
                    <input type="text" id="search-charge-input" class="input-control" placeholder="Buscar por nome do atleta..." style="padding: 10px 14px; font-size: 14px;">
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 8px;">
                    <button class="filter-btn active" data-status="all">Todas</button>
                    <button class="filter-btn" data-status="pending_payment">Pendentes</button>
                    <button class="filter-btn" data-status="active">Pagas</button>
                    <button class="filter-btn" data-status="expired">Vencidas</button>
                </div>

                <div id="admin-charges-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando financeiro...</p>
                </div>
            </div>
        `;

        this.loadCharges();
        this.setupFilters();
        this.setupSearch();
        document.getElementById('refresh-charges-btn').addEventListener('click', () => this.loadCharges());
        document.getElementById('add-charge-btn').addEventListener('click', () => this.showAddChargeForm());
    },

    setupSearch() {
        const input = document.getElementById('search-charge-input');
        input.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.charge-item-card');
            cards.forEach(card => {
                const name = card.querySelector('p').textContent.toLowerCase();
                card.style.display = name.includes(term) ? 'block' : 'none';
            });
        });
    },

    async showAddChargeForm() {
        toast.show('Carregando atletas...');
        const [{ data: students }, { data: plans }] = await Promise.all([
            supabase.from('users').select('id, full_name, email').eq('role', 'student').order('full_name'),
            supabase.from('plans').select('id, name, price, category').eq('active', true).order('name')
        ]);

        const formHtml = `
            <form id="manual-charge-form">
                <div class="input-group">
                    <label>ATLETA / CLIENTE</label>
                    <select name="student_id" class="input-control" required>
                        <option value="">Selecione um atleta...</option>
                        ${students?.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.full_name)} (${escapeHtml(s.email)})</option>`).join('')}
                    </select>
                </div>
                <div class="input-group">
                    <label>PLANO</label>
                    <select name="plan_id" class="input-control" required>
                        <option value="">Selecione um plano...</option>
                        ${plans?.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)} — R$ ${parseFloat(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>`).join('')}
                    </select>
                </div>

                <div class="input-group">
                    <label>MODO DE COBRANÇA</label>
                    <select name="mode" id="ac-mode" class="input-control">
                        <option value="asaas">Gerar cobrança Asaas</option>
                        <option value="manual">Marcar como pago manualmente</option>
                    </select>
                </div>

                <div id="ac-asaas-options">
                    <div class="input-group">
                        <label>MÉTODO</label>
                        <select name="payment_method" id="ac-method" class="input-control">
                            <option value="PIX">PIX</option>
                            <option value="CREDIT_CARD">Cartão de Crédito</option>
                        </select>
                    </div>
                    <div class="input-group" id="ac-installments-wrap" style="display:none;">
                        <label>PARCELAS</label>
                        <select name="installments" id="ac-installments" class="input-control">
                            ${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">${i + 1}x</option>`).join('')}
                        </select>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 8px;">CONFIRMAR</button>
            </form>
        `;

        ui.bottomSheet.show('Nova Cobrança', formHtml, async (data) => {
            const adminId = (await supabase.auth.getUser()).data.user.id;

            if (!data.student_id || !data.plan_id) throw new Error('Selecione atleta e plano.');

            if (data.mode === 'manual') {
                // Fluxo manual: insert + activate direto
                const { data: spRow, error: insErr } = await supabase
                    .from('student_plans')
                    .insert([{
                        student_id: data.student_id,
                        plan_id: data.plan_id,
                        purchased_by: adminId,
                        status: 'pending_payment'
                    }])
                    .select('id')
                    .single();
                if (insErr) throw insErr;

                const { error: rpcErr } = await supabase.rpc('activate_student_plan', {
                    p_student_plan_id: spRow.id
                });
                if (rpcErr) throw rpcErr;

                toast.show('Plano ativado manualmente!');
                this.loadCharges();
                return;
            }

            // Fluxo Asaas
            const paymentMethod = data.payment_method;
            const installments = paymentMethod === 'CREDIT_CARD' ? Number(data.installments || 1) : undefined;
            const result = await createCheckout({
                planId: data.plan_id,
                studentId: data.student_id,
                paymentMethod,
                installments
            });
            checkoutPage.cachedPix = { sp: result.studentPlanId, data: result.pix || null };
            toast.show('Cobrança Asaas criada!');
            window.location.hash = `#checkout?sp=${encodeURIComponent(result.studentPlanId)}`;
        });

        // Toggle de UI: modo asaas vs manual + parcelas
        setTimeout(() => {
            const mode = document.getElementById('ac-mode');
            const asaasBlock = document.getElementById('ac-asaas-options');
            const methodSel = document.getElementById('ac-method');
            const wrap = document.getElementById('ac-installments-wrap');
            const syncMode = () => { asaasBlock.style.display = mode.value === 'asaas' ? '' : 'none'; };
            const syncMethod = () => { wrap.style.display = methodSel.value === 'CREDIT_CARD' ? '' : 'none'; };
            mode?.addEventListener('change', syncMode);
            methodSel?.addEventListener('change', syncMethod);
            syncMode(); syncMethod();
        }, 50);
    },

    async loadCharges(statusFilter = 'all') {
        const listContainer = document.getElementById('admin-charges-list');
        
        let query = supabase
            .from('student_plans')
            .select(`
                id,
                status,
                created_at,
                expires_at,
                start_at,
                student:users!student_id (full_name),
                plan:plans (name, price, duration_days, total_sessions)
            `)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data: charges, error } = await query;

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar dados.</p>`;
            return;
        }

        if (charges.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhuma cobrança encontrada.</p>`;
            return;
        }

        listContainer.innerHTML = charges.map(charge => {
            const date = new Date(charge.created_at).toLocaleDateString('pt-BR');
            const statusLabel = this.getStatusLabel(charge.status);
            const statusClass = this.getStatusClass(charge.status);

            return `
                <div class="card charge-item-card" data-id="${escapeHtml(charge.id)}" style="cursor: pointer;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                        <div>
                            <p style="font-weight: 700; font-size: 15px;">${escapeHtml(charge.student?.full_name || 'Atleta Removido')}</p>
                            <p style="font-size: 12px; color: var(--dx-muted);">${escapeHtml(charge.plan?.name || 'Cobrança Avulsa')} • ${date}</p>
                        </div>
                        <span class="badge ${statusClass}">${statusLabel}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                        <p style="font-weight: 800; color: var(--dx-teal);">R$ ${parseFloat(charge.plan?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                            ${charge.status === 'active' && charge.expires_at ? `<p style="font-size: 11px; color: var(--dx-muted);">Válido até ${new Date(charge.expires_at).toLocaleDateString('pt-BR')}</p>` : ''}
                            <i class="ph ph-dots-three-vertical" style="color: var(--dx-muted);"></i>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.setupActionEvents(charges);
    },

    setupActionEvents(charges) {
        document.querySelectorAll('.charge-item-card').forEach(card => {
            card.addEventListener('click', () => {
                const chargeId = card.dataset.id;
                const charge = charges.find(c => c.id === chargeId);
                this.showChargeActions(charge);
            });
        });
    },

    showChargeActions(charge) {
        const validityLine = charge.status === 'active' && charge.expires_at
            ? `<p style="font-size: 13px; margin-top: 4px;">Válido até: <strong>${new Date(charge.expires_at).toLocaleDateString('pt-BR')}</strong></p>`
            : '';
        const quotaLine = charge.plan?.total_sessions
            ? `<p style="font-size: 13px;">${charge.plan.total_sessions} aulas no plano</p>`
            : '';

        const content = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <div class="card" style="margin-bottom: 12px; background: var(--dx-surface2);">
                    <p style="font-size: 12px; color: var(--dx-muted);">DETALHES DA COBRANÇA</p>
                    <p style="font-weight: 700; margin-top: 4px;">${escapeHtml(charge.student?.full_name || 'Atleta')}</p>
                    <p style="font-size: 14px;">${escapeHtml(charge.plan?.name || 'Cobrança Avulsa')} - R$ ${parseFloat(charge.plan?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    ${validityLine}
                    ${quotaLine}
                </div>
                
                ${charge.status === 'pending_payment' ? `
                    <button id="mark-paid-btn" class="btn btn-primary" style="background: var(--dx-success); color: #000;">
                        <i class="ph-bold ph-check-circle" style="margin-right: 8px;"></i> CONFIRMAR PAGAMENTO MANUAL
                    </button>
                ` : ''}
                
                <button id="cancel-charge-btn" class="btn" style="border: 1px solid var(--dx-border); color: var(--dx-danger);">
                    <i class="ph ph-x-circle" style="margin-right: 8px;"></i> CANCELAR COBRANÇA
                </button>
            </div>
        `;

        ui.bottomSheet.show('Gerenciar Cobrança', content, async () => {});

        const sheet = document.getElementById('sheet-overlay');
        
        sheet.querySelector('#mark-paid-btn')?.addEventListener('click', async () => {
            const { error } = await supabase.rpc('activate_student_plan', { p_student_plan_id: charge.id });
            if (error) toast.show(error.message, 'error');
            else {
                toast.show('Pagamento confirmado!');
                sheet.classList.add('closing');
                setTimeout(() => { sheet.remove(); this.loadCharges(); }, 300);
            }
        });

        sheet.querySelector('#cancel-charge-btn').addEventListener('click', async () => {
            const { error } = await supabase.from('student_plans').update({ status: 'cancelled' }).eq('id', charge.id);
            if (error) toast.show(error.message, 'error');
            else {
                toast.show('Cobrança cancelada.');
                sheet.classList.add('closing');
                setTimeout(() => { sheet.remove(); this.loadCharges(); }, 300);
            }
        });
    },

    getStatusLabel(status) {
        const labels = { 'active': 'PAGO', 'pending_payment': 'PENDENTE', 'expired': 'VENCIDO', 'cancelled': 'CANCELADA' };
        return labels[status] || status.toUpperCase();
    },

    getStatusClass(status) {
        const classes = { 'active': 'badge-active', 'pending_payment': 'badge-pending', 'expired': 'badge-overdue', 'cancelled': 'badge-cancelled' };
        return classes[status] || '';
    },

    setupFilters() {
        const filters = document.querySelectorAll('.filter-btn');
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                filters.forEach(f => f.classList.remove('active'));
                btn.classList.add('active');
                this.loadCharges(btn.dataset.status);
            });
        });
    }
};
