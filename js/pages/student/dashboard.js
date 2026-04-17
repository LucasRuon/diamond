import { supabase } from '../../supabase.js';

export const studentDashboard = {
    async render() {
        const mainContent = document.getElementById('main-content');
        const user = (await supabase.auth.getUser()).data.user;
        
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--dx-teal); margin-bottom: 4px;">OLÁ, ${user.user_metadata.full_name.split(' ')[0]}</h1>
                <p style="color: var(--dx-muted); font-size: 14px; margin-bottom: 24px;">Painel do Atleta</p>
                
                <div id="student-status-area" style="display: flex; flex-direction: column; gap: 16px;">
                    <p style="color: var(--dx-muted); text-align: center; padding: 20px;">Carregando informações...</p>
                </div>

                <div id="next-training-area" style="margin-top: 24px;">
                    <!-- Carregado via JS -->
                </div>

                <div id="responsible-area" style="margin-top: 24px; margin-bottom: 32px;">
                    <!-- Carregado via JS -->
                </div>
            </div>
        `;

        this.loadStatus();
        this.loadNextTraining();
        this.loadResponsible();
    },

    async loadStatus() {
        const container = document.getElementById('student-status-area');
        const userId = (await supabase.auth.getUser()).data.user.id;

        // 1. Buscar plano atual
        const { data: plans } = await supabase
            .from('student_plans')
            .select('status, created_at, plan:plans(name, duration_days)')
            .eq('student_id', userId)
            .order('created_at', { ascending: false })
            .limit(1);

        // 2. Buscar frequência do mês
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        const { count: presences } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', userId)
            .gte('checked_in_at', startOfMonth.toISOString());

        const currentPlan = plans?.[0];
        let validityStr = '--';
        
        if (currentPlan && currentPlan.status === 'active') {
            const date = new Date(currentPlan.created_at);
            date.setDate(date.getDate() + currentPlan.plan.duration_days);
            validityStr = date.toLocaleDateString('pt-BR');
        }

        container.innerHTML = `
            <div class="card card-highlight">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div>
                        <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">Plano Ativo</p>
                        <p style="font-weight: 800; font-size: 18px; margin-top: 4px;">${currentPlan ? currentPlan.plan.name : 'NENHUM PLANO'}</p>
                    </div>
                    ${currentPlan ? `<span class="badge ${currentPlan.status === 'active' ? 'badge-active' : 'badge-pending'}">${this.getPlanStatusLabel(currentPlan.status)}</span>` : ''}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <p style="font-size: 12px; color: var(--dx-muted);">Válido até: <span style="color: var(--dx-text); font-weight: 600;">${validityStr}</span></p>
                    <a href="#plans" style="font-size: 12px; color: var(--dx-teal); font-weight: 700; text-decoration: none;">VER OUTROS</a>
                </div>
            </div>

            <div class="card" style="display: flex; align-items: center; justify-content: space-between; background: var(--dx-surface2);">
                <div>
                    <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">Frequência (Mês)</p>
                    <p style="font-weight: 800; font-size: 22px; margin-top: 4px;">${presences || 0} <span style="font-size: 14px; color: var(--dx-muted); font-weight: 400;">treinos</span></p>
                </div>
                <a href="#attendance" style="background: var(--dx-teal-dim); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--dx-teal-border);">
                    <i class="ph ph-chart-bar" style="color: var(--dx-teal); font-size: 20px;"></i>
                </a>
            </div>
        `;
    },

    async loadNextTraining() {
        const container = document.getElementById('next-training-area');
        
        const { data: sessions } = await supabase
            .from('training_sessions')
            .select('*')
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at')
            .limit(1);

        const next = sessions?.[0];

        if (!next) return;

        const date = new Date(next.scheduled_at);
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        container.innerHTML = `
            <h3 style="font-size: 14px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 12px;">PRÓXIMO TREINO</h3>
            <div class="card" style="border-color: var(--dx-teal-border); position: relative; overflow: hidden;">
                <div style="position: absolute; right: -10px; top: -10px; opacity: 0.1;">
                    <i class="ph ph-soccer-ball" style="font-size: 80px;"></i>
                </div>
                <p style="color: var(--dx-teal); font-weight: 700; font-size: 12px;">${dateStr.toUpperCase()} • ${timeStr}</p>
                <p style="font-weight: 800; font-size: 20px; margin: 4px 0;">${next.title}</p>
                <p style="font-size: 13px; color: var(--dx-muted); display: flex; align-items: center; gap: 4px;">
                    <i class="ph ph-map-pin"></i> ${next.location}
                </p>
                <a href="#trainings" class="btn btn-primary" style="margin-top: 16px; padding: 10px; font-size: 13px;">CHECK-IN / DETALHES</a>
            </div>
        `;
    },

    getPlanStatusLabel(status) {
        const labels = {
            'active': 'ATIVO',
            'pending_payment': 'PENDENTE',
            'expired': 'VENCIDO',
            'cancelled': 'CANCELADO'
        };
        return labels[status] || status.toUpperCase();
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