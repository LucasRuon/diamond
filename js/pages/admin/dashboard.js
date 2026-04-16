import { supabase } from '../../supabase.js';

export const adminDashboard = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 28px; font-weight: 800; color: var(--dx-teal); margin-bottom: 24px;">PAINEL GERAL</h1>
                
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