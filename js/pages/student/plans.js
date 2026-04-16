import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const studentPlans = {
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

        container.innerHTML = plans.map(plan => `
            <div class="card" style="border-top: 4px solid ${color};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <h3 style="font-weight: 800; font-size: 20px; color: ${color};">${plan.name}</h3>
                        <p style="font-size: 12px; color: var(--dx-muted);">
                            ${plan.category === 'training' ? `${plan.duration_days} dias • ${plan.total_sessions} aulas` : 'Sessão Individual'}
                        </p>
                    </div>
                    <p style="font-weight: 800; font-size: 18px;">R$ ${parseFloat(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <button class="btn btn-primary buy-btn" data-id="${plan.id}" data-name="${plan.name}" style="background: ${color}; color: #000;">
                    CONTRATAR AGORA
                </button>
            </div>
        `).join('');

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
                <p style="margin-bottom: 24px;">Deseja gerar a cobrança para <strong>${planName}</strong>?</p>
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