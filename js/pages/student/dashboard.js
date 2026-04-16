import { supabase } from '../../supabase.js';

export const studentDashboard = {
    async render() {
        const mainContent = document.getElementById('main-content');
        const user = (await supabase.auth.getUser()).data.user;
        
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--dx-teal); margin-bottom: 4px;">OLÁ, ${user.user_metadata.full_name.split(' ')[0]}</h1>
                <p style="color: var(--dx-muted); font-size: 14px; margin-bottom: 24px;">Painel do Atleta</p>
                
                <div id="student-status-area">
                    <p style="color: var(--dx-muted); text-align: center; padding: 20px;">Carregando informações...</p>
                </div>

                <div id="responsible-area" style="margin-top: 24px;">
                    <!-- Carregado via JS -->
                </div>
            </div>
        `;

        this.loadStatus();
        this.loadResponsible();
    },

    async loadStatus() {
        const container = document.getElementById('student-status-area');
        const userId = (await supabase.auth.getUser()).data.user.id;

        // Buscar plano atual
        const { data: plans } = await supabase
            .from('student_plans')
            .select('status, plan:plans(name)')
            .eq('student_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        const currentPlan = plans?.[0];

        container.innerHTML = `
            <div class="card card-highlight">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <p style="font-size: 12px; color: var(--dx-muted); font-weight: 600;">PLANO ATUAL</p>
                        <p style="font-weight: 800; font-size: 18px; margin-top: 4px;">${currentPlan ? currentPlan.plan.name : 'SEM PLANO ATIVO'}</p>
                    </div>
                    ${currentPlan ? `<span class="badge ${currentPlan.status === 'active' ? 'badge-active' : 'badge-pending'}">${currentPlan.status.toUpperCase()}</span>` : ''}
                </div>
                ${!currentPlan || currentPlan.status !== 'active' ? `
                    <a href="#plans" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 10px;">CONTRATAR PLANO</a>
                ` : `
                    <p style="font-size: 13px; color: var(--dx-muted);">Acesso liberado aos treinos.</p>
                `}
            </div>
        `;
    },

    async loadResponsible() {
        const container = document.getElementById('responsible-area');
        const userId = (await supabase.auth.getUser()).data.user.id;

        const { data: links } = await supabase
            .from('responsible_students')
            .select('responsible:users!responsible_id(full_name, phone, email)')
            .eq('student_id', userId)
            .single();

        if (links) {
            container.innerHTML = `
                <h3 style="font-size: 14px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 12px;">MEU RESPONSÁVEL</h3>
                <div class="card" style="display: flex; align-items: center; gap: 12px; background: var(--dx-surface2);">
                    <div style="background: var(--dx-teal-dim); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i class="ph-fill ph-shield-check" style="color: var(--dx-teal);"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700;">${links.responsible.full_name}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${links.responsible.email}</p>
                    </div>
                </div>
            `;
        }
    }
};