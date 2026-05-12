import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';
import { createCheckout } from '../../asaas.js';
import { checkoutPage } from '../checkout.js';

export const responsiblePlans = {
    currentCategory: 'training',

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">PLANOS E SERVIÇOS</h1>
                
                <div style="display: flex; gap: 8px; margin-bottom: 24px;">
                    <button class="cat-tab active" data-cat="training">Treinamento</button>
                    <button class="cat-tab" data-cat="physio">Fisioterapia</button>
                </div>

                <div id="plans-catalog" style="display: flex; flex-direction: column; gap: 16px;">
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
        const container = document.getElementById('plans-catalog');
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

        const preDiamond = plans.filter(p => p.tier !== 'diamond_x');
        const diamondX = plans.filter(p => p.tier === 'diamond_x');

        let html = '';

        if (preDiamond.length > 0) {
            html += `<p style="font-size: 12px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 8px;">PRÉ DIAMOND</p>`;
            html += preDiamond.map(plan => `
                <div class="card" style="border-top: 4px solid ${color};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <h3 style="font-weight: 800; font-size: 20px; color: ${color};">${escapeHtml(plan.name)}</h3>
                            <p style="font-size: 13px; color: var(--dx-muted);">
                                ${plan.category === 'training' ? `${plan.duration_days} dias • ${plan.total_sessions} aulas` : 'Sessão Individual / Pacote'}
                            </p>
                        </div>
                        <p style="font-weight: 800; font-size: 18px;">R$ ${parseFloat(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <p style="font-size: 14px; color: var(--dx-muted); margin-bottom: 20px;">${escapeHtml(plan.description || 'Acesso completo ao serviço selecionado.')}</p>
                    <button class="btn btn-primary buy-plan-btn" data-id="${escapeHtml(plan.id)}" data-name="${escapeHtml(plan.name)}" style="background: ${color}; color: #000;">
                        CONTRATAR AGORA
                    </button>
                </div>
            `).join('');
        }

        if (diamondX.length > 0) {
            html += `<p style="font-size: 12px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-top: 24px; margin-bottom: 8px;">DIAMOND X</p>`;
            html += diamondX.map(plan => `
                <div class="card" style="border-top: 4px solid var(--dx-border); opacity: 0.5;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <h3 style="font-weight: 800; font-size: 20px; color: var(--dx-muted);">${escapeHtml(plan.name)}</h3>
                            <p style="font-size: 13px; color: var(--dx-muted);">
                                ${plan.category === 'training' ? `${plan.duration_days} dias • ${plan.total_sessions} aulas` : 'Sessão Individual / Pacote'}
                            </p>
                        </div>
                        <p style="font-weight: 800; font-size: 18px; color: var(--dx-muted);">R$ ${parseFloat(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div class="btn" style="border: 1px solid var(--dx-border); color: var(--dx-muted); pointer-events: none;">
                        EM BREVE
                    </div>
                </div>
            `).join('');
        }

        container.innerHTML = html;

        this.setupPurchaseEvents();
    },

    async setupPurchaseEvents() {
        document.querySelectorAll('.buy-plan-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showPurchaseForm(btn.dataset.id, btn.dataset.name));
        });
    },

    async showPurchaseForm(planId, planName) {
        const userId = (await supabase.auth.getUser()).data.user.id;
        const { data: links } = await supabase
            .from('responsible_students')
            .select(`student_id, student:users!student_id (full_name)`)
            .eq('responsible_id', userId);

        const accent = this.currentCategory === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)';
        const installmentsOptions = Array.from({ length: 12 }, (_, i) => i + 1)
            .map(n => `<option value="${n}">${n}x</option>`).join('');

        const formHtml = `
            <form id="purchase-form">
                <p style="font-size: 14px; color: var(--dx-muted); margin-bottom: 20px;">Selecione o beneficiário e a forma de pagamento para <strong>${escapeHtml(planName)}</strong>.</p>

                <div class="input-group">
                    <label>PARA QUEM?</label>
                    <select name="student_id" class="input-control" required>
                        <option value="${userId}">Para mim mesmo</option>
                        ${links?.map(l => `<option value="${l.student_id}">${escapeHtml(l.student.full_name)} (Dependente)</option>`).join('') || ''}
                    </select>
                </div>

                <div class="input-group">
                    <label>FORMA DE PAGAMENTO</label>
                    <select name="payment_method" id="rp-method" class="input-control" required>
                        <option value="PIX">PIX</option>
                        <option value="CREDIT_CARD">Cartão de Crédito</option>
                    </select>
                </div>

                <div class="input-group" id="rp-installments-wrap" style="display:none;">
                    <label>PARCELAS</label>
                    <select name="installments" id="rp-installments" class="input-control">${installmentsOptions}</select>
                </div>

                <button type="submit" class="btn btn-primary" style="background:${accent}; color:#000;">GERAR COBRANÇA</button>
            </form>
        `;

        ui.bottomSheet.show('Contratação', formHtml, async (data) => {
            const studentName = links?.find(l => l.student_id === data.student_id)?.student?.full_name || 'o atleta';

            const { data: activePlans } = await supabase
                .from('student_plans')
                .select('expires_at, plan:plans(name, category)')
                .eq('student_id', data.student_id)
                .eq('status', 'active')
                .order('expires_at', { ascending: false })
                .limit(5);

            const activeOfSameCategory = activePlans?.find(sp => sp.plan?.category === this.currentCategory);
            if (activeOfSameCategory?.expires_at) {
                const expiresStr = new Date(activeOfSameCategory.expires_at).toLocaleDateString('pt-BR');
                const confirmed = confirm(`${studentName} já tem '${activeOfSameCategory.plan.name}' ativo até ${expiresStr}. O novo plano começará após essa data. Confirmar?`);
                if (!confirmed) throw new Error('Contratação cancelada.');
            }

            const paymentMethod = data.payment_method;
            const installments = paymentMethod === 'CREDIT_CARD' ? Number(data.installments || 1) : undefined;

            const result = await createCheckout({
                planId,
                studentId: data.student_id,
                paymentMethod,
                installments
            });
            checkoutPage.cachedPix = { sp: result.studentPlanId, data: result.pix || null };
            toast.show('Cobrança criada!');
            window.location.hash = `#checkout?sp=${encodeURIComponent(result.studentPlanId)}`;
        });

        setTimeout(() => {
            const methodSel = document.getElementById('rp-method');
            const wrap = document.getElementById('rp-installments-wrap');
            const sync = () => { wrap.style.display = methodSel.value === 'CREDIT_CARD' ? '' : 'none'; };
            if (methodSel) { methodSel.addEventListener('change', sync); sync(); }
        }, 50);
    }
};

// Estilos das abas
const style = document.createElement('style');
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
