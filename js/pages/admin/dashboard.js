import { supabase } from '../../supabase.js';

export const adminDashboard = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--dx-teal);">PAINEL GERAL</h1>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" style="width: 36px; height: 36px; opacity: 0.7;">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div class="card">
                        <p style="font-size: 12px; color: var(--dx-muted); text-transform: uppercase; font-weight: 600;">Alunos</p>
                        <p id="stat-students" style="font-weight: 800; font-size: 24px; margin-top: 4px;">--</p>
                    </div>
                    <div class="card">
                        <p style="font-size: 12px; color: var(--dx-muted); text-transform: uppercase; font-weight: 600;">Ativos</p>
                        <p id="stat-active" style="font-weight: 800; font-size: 24px; margin-top: 4px; color: var(--dx-teal);">--</p>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <h3 style="font-size: 13px; font-weight: 600; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 16px;">Faturamento Mensal (Estimado)</h3>
                    <div id="revenue-chart" style="display: flex; align-items: flex-end; gap: 8px; height: 120px; padding-top: 20px;">
                        <p style="color: var(--dx-muted); font-size: 12px; width: 100%; text-align: center;">Carregando gráfico...</p>
                    </div>
                </div>

                <div class="card card-highlight" style="margin-bottom: 24px;">
                    <h3 style="font-size: 13px; font-weight: 600; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 12px;">Próximos Treinos (Hoje)</h3>
                    <div id="today-trainings-summary">
                        <p style="color: var(--dx-muted); font-size: 14px;">Buscando agenda...</p>
                    </div>
                </div>

                <h3 style="font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; color: var(--dx-muted);">Cobranças Recentes</h3>
                <div id="recent-charges" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); font-size: 14px; text-align: center; padding: 20px;">Nenhuma cobrança encontrada.</p>
                </div>
            </div>
        `;

        this.loadStats();
        this.loadTodayTrainings();
        this.loadRevenueChart();
    },

    async loadRevenueChart() {
        const container = document.getElementById('revenue-chart');
        
        // Vamos estimar o faturamento baseado nos planos ativos
        const { data: activePlans, error } = await supabase
            .from('student_plans')
            .select('created_at, plan:plans(price)')
            .eq('status', 'active');

        if (error || !activePlans) {
            container.innerHTML = '<p style="color: var(--dx-muted); font-size: 12px; width: 100%; text-align: center;">Sem dados para o gráfico.</p>';
            return;
        }

        // Agrupar por mês (últimos 6 meses)
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const chartData = {};
        const now = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${months[d.getMonth()]}`;
            chartData[key] = 0;
        }

        activePlans.forEach(p => {
            const d = new Date(p.created_at);
            const key = `${months[d.getMonth()]}`;
            if (chartData[key] !== undefined) {
                chartData[key] += parseFloat(p.plan.price);
            }
        });

        const maxValue = Math.max(...Object.values(chartData), 1000);
        
        container.innerHTML = Object.entries(chartData).map(([month, value]) => {
            const height = (value / maxValue) * 100;
            return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                    <div style="width: 100%; background: var(--dx-teal-dim); border-radius: 4px 4px 0 0; height: ${height}%; min-height: 4px; position: relative;">
                        ${value > 0 ? `<div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 9px; font-weight: 700; color: var(--dx-teal);">R$${Math.round(value/1000)}k</div>` : ''}
                    </div>
                    <span style="font-size: 10px; color: var(--dx-muted); font-weight: 600;">${month}</span>
                </div>
            `;
        }).join('');
    },

    async loadStats() {
        // 1. Total Students
        const { count: totalStudents } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        
        document.getElementById('stat-students').textContent = totalStudents || 0;

        // 2. Active Plans
        const { count: activePlans } = await supabase
            .from('student_plans')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        document.getElementById('stat-active').textContent = activePlans || 0;
    },

    async loadTodayTrainings() {
        const container = document.getElementById('today-trainings-summary');
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date();
        endOfDay.setHours(23,59,59,999);

        const { data: sessions, error } = await supabase
            .from('training_sessions')
            .select('*')
            .gte('scheduled_at', startOfDay.toISOString())
            .lte('scheduled_at', endOfDay.toISOString())
            .order('scheduled_at');

        if (error || !sessions || sessions.length === 0) {
            container.innerHTML = `<p style="color: var(--dx-muted); font-size: 14px;">Nenhum treino agendado para hoje.</p>`;
            return;
        }

        container.innerHTML = sessions.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <p style="font-weight: 600; font-size: 15px;">${s.title}</p>
                <p style="color: var(--dx-teal); font-weight: 700;">${new Date(s.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        `).join('');
    }
};