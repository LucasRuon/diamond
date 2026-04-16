import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const adminPlans = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">PLANOS</h1>
                    <button id="add-plan-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                        <i class="ph ph-plus-circle" style="font-size: 20px;"></i>
                    </button>
                </div>

                <div id="plans-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando planos...</p>
                </div>
            </div>
        `;

        this.loadPlans();
        
        document.getElementById('add-plan-btn').addEventListener('click', () => this.showAddPlanForm());
    },

    async loadPlans() {
        const listContainer = document.getElementById('plans-list');
        
        const { data: plans, error } = await supabase
            .from('plans')
            .select('*')
            .order('category', { ascending: false })
            .order('price');

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar planos: ${error.message}</p>`;
            return;
        }

        if (plans.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhum plano cadastrado.</p>`;
            return;
        }

        listContainer.innerHTML = plans.map(plan => `
            <div class="card" style="border-left: 4px solid ${plan.category === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)'}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <p style="font-weight: 700; font-size: 16px;">${plan.name}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${plan.category === 'training' ? 'Treinamento' : 'Fisioterapia'}</p>
                    </div>
                    <p style="font-weight: 800; color: var(--dx-teal);">R$ ${parseFloat(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px;">
                    <span style="font-size: 12px; color: var(--dx-muted);">${plan.duration_days} dias • ${plan.sessions_per_week || 0}x/semana</span>
                    <span class="badge ${plan.active ? 'badge-active' : 'badge-cancelled'}">${plan.active ? 'ATIVO' : 'INATIVO'}</span>
                </div>
            </div>
        `).join('');
    },

    showAddPlanForm() {
        const formHtml = `
            <form id="new-plan-form">
                <div class="input-group">
                    <label>NOME DO PLANO</label>
                    <input type="text" name="name" class="input-control" placeholder="Ex: Mensal Basic" required>
                </div>
                <div class="input-group">
                    <label>CATEGORIA</label>
                    <select name="category" class="input-control" required>
                        <option value="training">Treinamento (Futebol)</option>
                        <option value="physio">Fisioterapia / Recovery</option>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                    <div class="input-group">
                        <label>VALOR (R$)</label>
                        <input type="number" step="0.01" name="price" class="input-control" placeholder="599.90" required>
                    </div>
                    <div class="input-group">
                        <label>VALIDADE (DIAS)</label>
                        <input type="number" name="duration_days" class="input-control" placeholder="30" required>
                    </div>
                </div>
                <div class="input-group">
                    <label>SESSÕES POR SEMANA (TREINO)</label>
                    <input type="number" name="sessions_per_week" class="input-control" placeholder="4">
                </div>
                <div class="input-group">
                    <label>PARCELAS MÁX. (CARTÃO)</label>
                    <input type="number" name="max_installments" class="input-control" value="1" required>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">CRIAR PLANO</button>
            </form>
        `;

        ui.bottomSheet.show('Novo Plano', formHtml, async (data) => {
            const { error } = await supabase.from('plans').insert([{
                ...data,
                price: parseFloat(data.price),
                duration_days: parseInt(data.duration_days),
                max_installments: parseInt(data.max_installments),
                sessions_per_week: data.sessions_per_week ? parseInt(data.sessions_per_week) : null,
                active: true
            }]);

            if (error) {
                toast.show('Erro ao criar plano: ' + error.message, 'error');
                throw error;
            }

            toast.show('Plano criado com sucesso!');
            this.loadPlans();
        });
    }
};