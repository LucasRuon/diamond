import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';

export const responsibleDashboard = {
    async render() {
        const mainContent = document.getElementById('main-content');
        const fullName = (await supabase.auth.getUser()).data.user.user_metadata.full_name || 'Responsável';
        
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <div>
                        <h1 style="font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--dx-teal); margin-bottom: 4px;">OLÁ, ${fullName.split(' ')[0]}</h1>
                        <p style="color: var(--dx-muted); font-size: 14px;">Visão geral dos seus atletas</p>
                    </div>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>
                
                <div id="students-summary" style="display: flex; flex-direction: column; gap: 16px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando dados...</p>
                </div>

                <div class="card" style="margin-top: 24px; background: var(--dx-surface2); border-style: dashed;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <i class="ph ph-info" style="font-size: 24px; color: var(--dx-warn);"></i>
                        <p style="font-size: 13px; color: var(--dx-muted);">Lembre-se: o acesso aos treinos é liberado apenas após a confirmação do pagamento.</p>
                    </div>
                </div>
            </div>
        `;

        this.loadStudentsSummary();
    },

    async loadStudentsSummary() {
        const container = document.getElementById('students-summary');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user.id;

            console.log('Buscando resumo para o responsável:', userId);

            // Fetch students linked to this responsible
            const { data: links, error: linkError } = await supabase
                .from('responsible_students')
                .select(`
                    student_id,
                    student:users!student_id (
                        full_name,
                        email
                    )
                `)
                .eq('responsible_id', userId);

            if (linkError) {
                console.error('Erro ao buscar links:', linkError);
                throw linkError;
            }

            if (!links || links.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <p style="color: var(--dx-muted);">Nenhum aluno vinculado.</p>
                        <a href="#students" class="btn btn-primary" style="margin-top: 16px; width: auto;">VINCULAR AGORA</a>
                    </div>
                `;
                return;
            }

            // For each student, let's try to get their latest plan
            let allPlans = [];
            try {
                const studentIds = links.map(l => l.student_id);
                const { data: plans, error: planError } = await supabase
                    .from('student_plans')
                    .select('student_id, status, plan:plans(name)')
                    .in('student_id', studentIds);
                
                if (!planError) allPlans = plans || [];
            } catch (pErr) {
                console.warn('Erro ao buscar planos, continuando sem eles:', pErr);
            }

            container.innerHTML = links.map(link => {
                const student = link.student || { full_name: 'Aluno sem nome', email: '' };
                const latestPlan = allPlans.find(p => p.student_id === link.student_id);
                
                const statusLabel = latestPlan ? this.getPlanStatusLabel(latestPlan.status) : 'SEM PLANO';
                const statusClass = latestPlan ? this.getPlanStatusClass(latestPlan.status) : 'badge-cancelled';

                return `
                    <div class="card" style="padding: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                            <div>
                                <p style="font-weight: 800; font-size: 18px;">${escapeHtml(student.full_name)}</p>
                                <p style="font-size: 12px; color: var(--dx-muted);">${escapeHtml(latestPlan ? latestPlan.plan.name : 'Nenhuma contratação ativa')}</p>
                            </div>
                            <span class="badge ${statusClass}">${statusLabel}</span>
                        </div>
                        
                        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                            <a href="#attendance?id=${link.student_id}" class="btn" style="flex: 1; padding: 10px; font-size: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border); color: var(--dx-text); text-align: center; text-decoration: none;">
                                VER FREQUÊNCIA
                            </a>
                            <a href="#trainings" class="btn" style="flex: 1; padding: 10px; font-size: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border); color: var(--dx-text); text-align: center; text-decoration: none;">
                                VER TREINOS
                            </a>
                            ${!latestPlan || latestPlan.status !== 'active' ? `
                                <a href="#plans" class="btn btn-primary" style="flex: 1; padding: 10px; font-size: 12px; text-align: center; text-decoration: none;">
                                    PLANOS
                                </a>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');

        } catch (err) {
            console.error('Erro geral no Dashboard:', err);
            container.innerHTML = `<p style="color: var(--dx-danger); text-align: center;">Erro ao carregar dados do dashboard.</p>`;
        }
    },

    getPlanStatusLabel(status) {
        const labels = {
            'active': 'ATIVO',
            'pending_payment': 'AGUARDANDO',
            'expired': 'VENCIDO',
            'cancelled': 'CANCELADO'
        };
        return labels[status] || status.toUpperCase();
    },

    getPlanStatusClass(status) {
        const classes = {
            'active': 'badge-active',
            'pending_payment': 'badge-pending',
            'expired': 'badge-overdue',
            'cancelled': 'badge-cancelled'
        };
        return classes[status] || '';
    }
};
