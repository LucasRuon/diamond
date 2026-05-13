import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';
import { createCheckout } from '../../asaas.js';
import { checkoutPage } from '../checkout.js';

export const studentPlans = {
    currentCategory: 'training',

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">PLANOS E SERVIÇOS</h1>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>
                
                <div style="display: flex; gap: 8px; margin-bottom: 24px;">
                    <button class="cat-tab active" data-cat="training">Treinamento</button>
                    <button class="cat-tab" data-cat="physio">Fisioterapia</button>
                </div>

                <div id="student-plans-catalog" style="display: flex; flex-direction: column; gap: 16px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando...</p>
                </div>
            </div>
        `;

        this.setupTabs();
        this.loadPlans();
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.cat-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentCategory = tab.dataset.cat;
                this.loadPlans();
            });
        });
    },

    async loadPlans() {
        const container = document.getElementById('student-plans-catalog');
        const color = this.currentCategory === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)';
        
        const { data: plans, error } = await supabase
            .from('plans')
            .select('*')
            .eq('active', true)
            .eq('category', this.currentCategory)
            .order('price');

        if (error) {
            container.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar catálogo.</p>`;
            return;
        }

        const available = plans.filter(p => parseFloat(p.price) > 0);

        let html = '';

        if (available.length === 0) {
            html = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhum plano disponível no momento.</p>`;
        } else {
            html = available.map(plan => `
                <div class="card" style="border-top: 4px solid ${color};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <h3 style="font-family: var(--font-brand); font-weight: 400; font-size: 20px; color: ${color};">${escapeHtml(plan.name)}</h3>
                            <p style="font-size: 12px; color: var(--dx-muted);">
                                ${plan.category === 'training' ? `${plan.duration_days} dias • ${plan.total_sessions} aulas` : 'Sessão Individual'}
                            </p>
                        </div>
                        <p style="font-weight: 800; font-size: 18px;">R$ ${parseFloat(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <button class="btn btn-diamond buy-btn" data-id="${escapeHtml(plan.id)}" data-name="${escapeHtml(plan.name)}" style="border-color: ${color}; color: ${color};">
                        CONTRATAR AGORA
                    </button>
                </div>
            `).join('');
        }

        container.innerHTML = html;

        this.setupPurchaseEvents();
    },

    setupPurchaseEvents() {
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', () => this.purchasePlan(btn.dataset.id, btn.dataset.name));
        });
    },

    async purchasePlan(planId, planName) {
        const userId = (await supabase.auth.getUser()).data.user.id;

        const accent = this.currentCategory === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)';
        const { data: planRow } = await supabase.from('plans').select('max_installments').eq('id', planId).single();
        const maxInst = Math.min(12, Math.max(1, planRow?.max_installments || 1));
        const installmentsOptions = Array.from({ length: maxInst }, (_, i) => i + 1)
            .map(n => `<option value="${n}">${n}x</option>`).join('');

        const formHtml = `
            <form id="checkout-form">
                <p style="margin-bottom: 16px;">Plano: <strong>${escapeHtml(planName)}</strong></p>

                <div class="input-group">
                    <label>FORMA DE PAGAMENTO</label>
                    <select name="payment_method" id="cf-method" class="input-control" required>
                        <option value="PIX">PIX</option>
                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                    </select>
                </div>

                <div class="input-group" id="cf-installments-wrap" style="display:none;">
                    <label>PARCELAS</label>
                    <select name="installments" id="cf-installments" class="input-control">${installmentsOptions}</select>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top: 16px; background:${accent}; color:#000;">GERAR COBRANÇA</button>
            </form>
        `;

        ui.bottomSheet.show('Checkout', formHtml, async (data) => {
            // Avisar enfileiramento
            const { data: activePlans } = await supabase
                .from('student_plans')
                .select('expires_at, plan:plans(name, category)')
                .eq('student_id', userId)
                .eq('status', 'active')
                .order('expires_at', { ascending: false })
                .limit(5);

            const activeOfSameCategory = activePlans?.find(sp => sp.plan?.category === this.currentCategory);
            if (activeOfSameCategory?.expires_at) {
                const expiresStr = new Date(activeOfSameCategory.expires_at).toLocaleDateString('pt-BR');
                const confirmed = confirm(`Você já tem '${activeOfSameCategory.plan.name}' ativo até ${expiresStr}. O novo plano começará após essa data. Confirmar?`);
                if (!confirmed) throw new Error('Compra cancelada.');
            }

            const paymentMethod = data.payment_method;
            const installments = paymentMethod === 'CREDIT_CARD' ? Number(data.installments || 1) : undefined;

            try {
                const result = await createCheckout({
                    planId,
                    studentId: userId,
                    paymentMethod,
                    installments
                });
                if (result?.pix) checkoutPage.setPixForCurrent(result.pix);
                checkoutPage.cachedPix = { sp: result.studentPlanId, data: result.pix || null };
                toast.show('Cobrança criada!');
                window.location.hash = `#checkout?sp=${encodeURIComponent(result.studentPlanId)}`;
            } catch (err) {
                console.error(err);
                throw err;
            }
        });

        // Toggle parcelas quando método muda
        setTimeout(() => {
            const methodSel = document.getElementById('cf-method');
            const wrap = document.getElementById('cf-installments-wrap');
            const sync = () => { wrap.style.display = methodSel.value === 'CREDIT_CARD' ? '' : 'none'; };
            if (methodSel) { methodSel.addEventListener('change', sync); sync(); }
        }, 50);
    }
};

// Reutilizando os mesmos estilos de abas do responsável
if (!document.getElementById('cat-tabs-style')) {
    const style = document.createElement('style');
    style.id = 'cat-tabs-style';
    style.textContent = `
        .cat-tab {
            flex: 1;
            padding: 10px;
            background: var(--dx-surface2);
            border: 1px solid var(--dx-border);
            border-radius: 8px;
            color: var(--dx-muted);
            font-family: var(--font-display);
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            transition: all 0.2s ease;
        }
        .cat-tab.active[data-cat="training"] {
            background: var(--dx-teal-dim);
            border-color: var(--dx-teal);
            color: var(--dx-teal);
        }
        .cat-tab.active[data-cat="physio"] {
            background: rgba(250, 204, 21, 0.1);
            border-color: var(--dx-warn);
            color: var(--dx-warn);
        }
    `;
    document.head.appendChild(style);
}