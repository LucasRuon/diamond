import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

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

        const formHtml = `
            <form id="purchase-form">
                <p style="font-size: 14px; color: var(--dx-muted); margin-bottom: 20px;">Selecione o beneficiário e a forma de pagamento para <strong>${planName}</strong>.</p>
                
                <div class="input-group">
                    <label>PARA QUEM?</label>
                    <select name="student_id" class="input-control" required>
                        <option value="${userId}">Para mim mesmo</option>
                        ${links?.map(l => `<option value="${l.student_id}">${l.student.full_name} (Dependente)</option>`).join('') || ''}
                    </select>
                </div>

                <div class="input-group">
                    <label>FORMA DE PAGAMENTO</label>
                    <select name="payment_method" class="input-control" required>
                        <option value="pix">PIX</option>
                        <option value="credit_card">Cartão de Crédito</option>
                        <option value="boleto">Boleto Bancário</option>
                    </select>
                </div>

                <button type="submit" class="btn btn-primary" style="background: ${this.currentCategory === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)'}; color: #000;">GERAR COBRANÇA</button>
            </form>
        `;

        ui.bottomSheet.show('Contratação', formHtml, async (data) => {
            // 1. Verificar se o aluno já tem plano ativo da mesma categoria
            const { data: existing } = await supabase
                .from('student_plans')
                .select('id')
                .eq('student_id', data.student_id)
                .eq('status', 'active')
                .maybeSingle();

            if (existing && this.currentCategory === 'training') {
                throw new Error('Este aluno já possui um plano de treinamento ativo.');
            }

            // 2. Criar o registro de intenção de compra
            const { error } = await supabase.from('student_plans').insert([{
                student_id: data.student_id,
                plan_id: planId,
                purchased_by: userId,
                status: 'pending_payment',
                // Aqui no futuro enviaremos o payment_method para a Edge Function do Asaas
            }]);

            if (error) throw error;
            toast.show('Iniciando processamento do pagamento...');
            
            // Simular um delay para parecer que está gerando no Asaas
            setTimeout(() => {
                window.location.hash = '#payments';
            }, 1000);
        });
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