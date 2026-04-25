import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';

export const adminPlans = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">GESTÃO DE PLANOS</h1>
                    <button id="add-plan-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                        <i class="ph ph-plus-circle" style="font-size: 20px;"></i>
                    </button>
                </div>

                <div id="admin-plans-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando planos...</p>
                </div>
            </div>
        `;

        this.loadPlans();
        document.getElementById('add-plan-btn').addEventListener('click', () => this.showPlanForm());
    },

    async loadPlans() {
        const listContainer = document.getElementById('admin-plans-list');
        const { data: plans, error } = await supabase.from('plans').select('*').order('category').order('price');

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar planos.</p>`;
            return;
        }

        if (plans.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-clipboard-text" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Nenhum plano cadastrado.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = plans.map(plan => `
            <div class="card" style="border-left: 4px solid ${plan.category === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)'}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">${plan.category === 'training' ? 'TREINAMENTO' : 'FISIOTERAPIA'}</p>
                            <span style="font-size: 9px; padding: 2px 6px; border-radius: var(--radius-full); font-weight: 700; background: ${plan.tier === 'diamond_x' ? 'var(--dx-teal-dim)' : 'var(--dx-surface2)'}; color: ${plan.tier === 'diamond_x' ? 'var(--dx-teal)' : 'var(--dx-muted)'}; border: 1px solid ${plan.tier === 'diamond_x' ? 'var(--dx-teal-border)' : 'var(--dx-border)'};">${plan.tier === 'diamond_x' ? 'DIAMOND X' : 'PRÉ DIAMOND'}</span>
                        </div>
                        <p style="font-weight: 800; font-size: 17px;">${escapeHtml(plan.name)}</p>
                    </div>
                    <p style="font-weight: 800; color: var(--dx-teal);">R$ ${plan.price}</p>
                </div>
                <p style="font-size: 13px; color: var(--dx-muted); margin-bottom: 16px;">${escapeHtml(plan.description || 'Sem descrição')}</p>
                <div style="display: flex; gap: 8px;">
                    <button class="btn edit-plan" data-id="${escapeHtml(plan.id)}" style="flex: 1; padding: 10px; font-size: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border);">
                        EDITAR
                    </button>
                    <button class="btn delete-plan" data-id="${escapeHtml(plan.id)}" style="padding: 10px; color: var(--dx-danger); background: rgba(248,113,113,0.1); border-radius: 8px;">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        this.setupEvents(plans);
    },

    setupEvents(plans) {
        document.querySelectorAll('.edit-plan').forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = plans.find(p => p.id === btn.dataset.id);
                this.showPlanForm(plan);
            });
        });

        document.querySelectorAll('.delete-plan').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Deseja excluir este plano definitivamente?')) {
                    const { error } = await supabase.from('plans').delete().eq('id', btn.dataset.id);
                    if (error) toast.show('Erro ao excluir: ' + error.message, 'error');
                    else { toast.show('Plano excluído'); this.loadPlans(); }
                }
            });
        });
    },

    showPlanForm(plan = null) {
        const formHtml = `
            <form id="plan-form">
                <div class="input-group">
                    <label>NOME DO PLANO</label>
                    <input type="text" name="name" class="input-control" value="${escapeHtml(plan?.name || '')}" placeholder="Ex: Mensal Basic" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="input-group">
                        <label>CATEGORIA</label>
                        <select name="category" class="input-control" required>
                            <option value="training" ${plan?.category === 'training' ? 'selected' : ''}>Treinamento / Aulas</option>
                            <option value="physio" ${plan?.category === 'physio' ? 'selected' : ''}>Fisioterapia / Recovery</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label>TIER</label>
                        <select name="tier" class="input-control" required>
                            <option value="pre_diamond" ${plan?.tier !== 'diamond_x' ? 'selected' : ''}>Pré Diamond</option>
                            <option value="diamond_x" ${plan?.tier === 'diamond_x' ? 'selected' : ''}>Diamond X</option>
                        </select>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="input-group">
                        <label>PREÇO (R$)</label>
                        <input type="number" step="0.01" name="price" class="input-control" value="${plan?.price || ''}" placeholder="0.00" required>
                    </div>
                    <div class="input-group">
                        <label>DURAÇÃO (DIAS)</label>
                        <input type="number" name="duration_days" class="input-control" value="${plan?.duration_days || '30'}" required>
                    </div>
                </div>
                <div class="input-group">
                    <label>DESCRIÇÃO</label>
                    <textarea name="description" class="input-control" rows="2">${escapeHtml(plan?.description || '')}</textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">${plan ? 'ATUALIZAR' : 'CRIAR'} PLANO</button>
            </form>
        `;

        ui.bottomSheet.show(plan ? 'Editar Plano' : 'Novo Plano', formHtml, async (data) => {
            const planData = {
                ...data,
                price: parseFloat(data.price),
                duration_days: parseInt(data.duration_days)
            };

            const { error } = plan 
                ? await supabase.from('plans').update(planData).eq('id', plan.id)
                : await supabase.from('plans').insert([planData]);

            if (error) throw error;
            toast.show(plan ? 'Plano atualizado!' : 'Plano criado!');
            this.loadPlans();
        });
    }
};