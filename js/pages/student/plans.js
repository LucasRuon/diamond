import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';

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

        const preDiamond = plans.filter(p => p.tier !== 'diamond_x');
        const diamondX = plans.filter(p => p.tier === 'diamond_x');

        let html = '';

        if (preDiamond.length > 0) {
            html += `<p style="font-size: 12px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 8px;">PRÉ DIAMOND</p>`;
            html += preDiamond.map(plan => `
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

        if (diamondX.length > 0) {
            html += `<p style="font-size: 12px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-top: 24px; margin-bottom: 8px;">DIAMOND X</p>`;
            html += diamondX.map(plan => `
                <div class="card" style="border-top: 4px solid var(--dx-border); opacity: 0.5; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <h3 style="font-family: var(--font-brand); font-weight: 400; font-size: 20px; color: var(--dx-muted);">${escapeHtml(plan.name)}</h3>
                            <p style="font-size: 12px; color: var(--dx-muted);">
                                ${plan.category === 'training' ? `${plan.duration_days} dias • ${plan.total_sessions} aulas` : 'Sessão Individual'}
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

    setupPurchaseEvents() {
        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', () => this.purchasePlan(btn.dataset.id, btn.dataset.name));
        });
    },

    async purchasePlan(planId, planName) {
        const userId = (await supabase.auth.getUser()).data.user.id;
        
        const confirmHtml = `
            <div style="text-align: center;">
                <p style="margin-bottom: 24px;">Deseja gerar a cobrança para <strong>${escapeHtml(planName)}</strong>?</p>
                <button id="confirm-purchase" class="btn btn-primary" style="background: ${this.currentCategory === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)'}; color: #000;">SIM, GERAR COBRANÇA</button>
            </div>
        `;

        ui.bottomSheet.show('Confirmar', confirmHtml, () => {});

        document.getElementById('confirm-purchase').addEventListener('click', async () => {
            const { error } = await supabase.from('student_plans').insert([{
                student_id: userId,
                plan_id: planId,
                purchased_by: userId,
                status: 'pending_payment'
            }]);

            if (error) toast.show(error.message, 'error');
            else {
                toast.show('Cobrança gerada com sucesso!');
                window.location.hash = '#dashboard';
            }
            document.getElementById('sheet-overlay').remove();
        });
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