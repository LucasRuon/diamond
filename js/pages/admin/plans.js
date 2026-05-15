import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';

export const adminPlans = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">GESTÃO DE PLANOS</h1>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                        <button id="add-plan-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                            <i class="ph ph-plus-circle" style="font-size: 20px;"></i>
                        </button>
                    </div>
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

        listContainer.innerHTML = plans.map(plan => {
            const isActive = plan.active !== false;
            return `
            <div class="card" style="border-left: 4px solid ${plan.category === 'training' ? 'var(--dx-teal)' : 'var(--dx-warn)'}; opacity: ${isActive ? '1' : '0.55'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                            <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">${plan.category === 'training' ? 'TREINAMENTO' : 'FISIOTERAPIA'}</p>
                            <span style="font-size: 9px; padding: 2px 6px; border-radius: var(--radius-full); font-weight: 700; background: ${plan.tier === 'diamond_x' ? 'var(--dx-teal-dim)' : 'var(--dx-surface2)'}; color: ${plan.tier === 'diamond_x' ? 'var(--dx-teal)' : 'var(--dx-muted)'}; border: 1px solid ${plan.tier === 'diamond_x' ? 'var(--dx-teal-border)' : 'var(--dx-border)'};">${plan.tier === 'diamond_x' ? 'DIAMOND X' : 'PRÉ DIAMOND'}</span>
                            ${isActive ? '' : '<span style="font-size: 9px; padding: 2px 6px; border-radius: var(--radius-full); font-weight: 700; background: rgba(248,113,113,0.12); color: var(--dx-danger); border: 1px solid rgba(248,113,113,0.35);">INATIVO</span>'}
                        </div>
                        <p style="font-family: var(--font-brand); font-weight: 400; font-size: 17px;">${escapeHtml(plan.name)}</p>
                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                            <span style="font-size: 9px; padding: 2px 6px; border-radius: var(--radius-full); font-weight: 700; background: var(--dx-surface2); color: var(--dx-teal); border: 1px solid var(--dx-teal-border); text-transform: uppercase;">${escapeHtml(plan.kind || 'custom')}</span>
                            <span style="font-size: 11px; color: var(--dx-muted);">${plan.max_installments || 1}x máx</span>
                        </div>
                        <p style="font-size: 12px; color: var(--dx-muted);">${plan.duration_days} dias${plan.total_sessions ? ` • ${plan.total_sessions} aulas` : ''}</p>
                    </div>
                    <p style="font-weight: 800; color: var(--dx-teal);">R$ ${plan.price}</p>
                </div>
                <p style="font-size: 13px; color: var(--dx-muted); margin-bottom: 16px;">${escapeHtml(plan.description || 'Sem descrição')}</p>
                <div style="display: flex; gap: 8px; align-items: stretch;">
                    <button class="btn toggle-plan-active" data-id="${escapeHtml(plan.id)}" data-active="${isActive ? '1' : '0'}" title="${isActive ? 'Desativar plano' : 'Ativar plano'}" style="padding: 10px 12px; font-size: 12px; background: ${isActive ? 'rgba(67,206,162,0.12)' : 'var(--dx-surface2)'}; color: ${isActive ? 'var(--dx-teal)' : 'var(--dx-muted)'}; border: 1px solid ${isActive ? 'var(--dx-teal-border)' : 'var(--dx-border)'}; border-radius: 8px; display: flex; align-items: center; gap: 6px;">
                        <i class="ph ${isActive ? 'ph-toggle-right' : 'ph-toggle-left'}" style="font-size: 18px;"></i>
                        <span style="font-weight: 700;">${isActive ? 'ATIVO' : 'INATIVO'}</span>
                    </button>
                    <button class="btn btn-diamond edit-plan" data-id="${escapeHtml(plan.id)}" style="flex: 1; padding: 10px; font-size: 12px;">
                        <i class="ph ph-pencil-simple" style="margin-right: 6px;"></i> EDITAR
                    </button>
                    <button class="btn delete-plan" data-id="${escapeHtml(plan.id)}" style="padding: 10px; color: var(--dx-danger); background: rgba(248,113,113,0.1); border-radius: 8px;">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `;}).join('');

        this.setupEvents(plans);
    },

    setupEvents(plans) {
        document.querySelectorAll('.edit-plan').forEach(btn => {
            btn.addEventListener('click', () => {
                const plan = plans.find(p => p.id === btn.dataset.id);
                this.showPlanForm(plan);
            });
        });

        document.querySelectorAll('.toggle-plan-active').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const nextActive = btn.dataset.active !== '1';
                btn.disabled = true;
                const { error } = await supabase.from('plans').update({ active: nextActive }).eq('id', id);
                btn.disabled = false;
                if (error) {
                    toast.show('Erro ao atualizar status: ' + error.message, 'error');
                    return;
                }
                toast.show(nextActive ? 'Plano ativado' : 'Plano desativado');
                this.loadPlans();
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
                <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
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
                <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
                    <div class="input-group">
                        <label>PREÇO (R$)</label>
                        <input type="number" step="0.01" name="price" class="input-control" value="${plan?.price || ''}" placeholder="0.00" required>
                    </div>
                    <div class="input-group">
                        <label>DURAÇÃO (DIAS)</label>
                        <input type="number" name="duration_days" class="input-control" value="${plan?.duration_days || '30'}" required>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px;">
                    <div class="input-group">
                        <label>TOTAL DE AULAS (0 = ilimitado)</label>
                        <input type="number" name="total_sessions" min="0" class="input-control" value="${plan?.total_sessions || '0'}" placeholder="0">
                    </div>
                    <div class="input-group">
                        <label>MÁX. PARCELAS</label>
                        <input type="number" name="max_installments" min="1" max="12" class="input-control" value="${plan?.max_installments || '1'}" required>
                    </div>
                </div>
                <div class="input-group">
                    <label>NÍVEL DO PLANO (KIND)</label>
                    <select name="kind" class="input-control" required>
                        <option value="custom" ${(plan?.kind || 'custom') === 'custom' ? 'selected' : ''}>Custom</option>
                        <option value="avulsa" ${plan?.kind === 'avulsa' ? 'selected' : ''}>Avulsa (10d / 1 aula / 1x)</option>
                        <option value="basic" ${plan?.kind === 'basic' ? 'selected' : ''}>Basic (30d / 4 aulas / 2x)</option>
                        <option value="plus" ${plan?.kind === 'plus' ? 'selected' : ''}>Plus (45d / 6 aulas / 2x)</option>
                        <option value="pro" ${plan?.kind === 'pro' ? 'selected' : ''}>Pro (60d / 8 aulas / 3x)</option>
                        <option value="elite" ${plan?.kind === 'elite' ? 'selected' : ''}>Elite (75d / 12 aulas / 4x)</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>DESCRIÇÃO</label>
                    <textarea name="description" class="input-control" rows="2">${escapeHtml(plan?.description || '')}</textarea>
                </div>
                <label style="display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border); border-radius: 8px; cursor: pointer; margin-top: 4px;">
                    <input type="checkbox" name="active" value="1" ${(plan?.active !== false) ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--dx-teal);">
                    <span>
                        <span style="font-weight: 700; font-size: 13px;">PLANO ATIVO</span>
                        <span style="display: block; font-size: 11px; color: var(--dx-muted); margin-top: 2px;">Quando desativado, não aparece nos catálogos de contratação.</span>
                    </span>
                </label>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">${plan ? 'ATUALIZAR' : 'CRIAR'} PLANO</button>
            </form>
        `;

        ui.bottomSheet.show(plan ? 'Editar Plano' : 'Novo Plano', formHtml, async (data) => {
            const planData = {
                ...data,
                price: parseFloat(data.price),
                duration_days: parseInt(data.duration_days),
                total_sessions: parseInt(data.total_sessions) || null,
                max_installments: Math.min(12, Math.max(1, parseInt(data.max_installments) || 1)),
                kind: data.kind || 'custom',
                active: data.active === '1'
            };

            const { error } = plan
                ? await supabase.from('plans').update(planData).eq('id', plan.id)
                : await supabase.from('plans').insert([planData]);

            if (error) throw error;
            toast.show(plan ? 'Plano atualizado!' : 'Plano criado!');
            this.loadPlans();
        });

        // Sugestões por kind (não trava — admin pode sobrescrever)
        setTimeout(() => {
            const form = document.getElementById('plan-form');
            if (!form) return;
            const kindSel = form.querySelector('[name="kind"]');
            const dur = form.querySelector('[name="duration_days"]');
            const sess = form.querySelector('[name="total_sessions"]');
            const inst = form.querySelector('[name="max_installments"]');
            const SUGGESTIONS = {
                avulsa: { duration_days: 10, total_sessions: 1, max_installments: 1 },
                basic:  { duration_days: 30, total_sessions: 4, max_installments: 2 },
                plus:   { duration_days: 45, total_sessions: 6, max_installments: 2 },
                pro:    { duration_days: 60, total_sessions: 8, max_installments: 3 },
                elite:  { duration_days: 75, total_sessions: 12, max_installments: 4 }
            };
            kindSel?.addEventListener('change', (e) => {
                const s = SUGGESTIONS[e.target.value];
                if (!s) return;
                if (dur) dur.value = s.duration_days;
                if (sess) sess.value = s.total_sessions;
                if (inst) inst.value = s.max_installments;
            });
        }, 0);
    }
};
