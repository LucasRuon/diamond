import { supabase } from '../../supabase.js';

export const adminReports = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin: 0;">FREQUÊNCIA</h1>
                    <select id="month-filter" class="input-control" style="width: auto; padding: 6px 12px; font-size: 13px;">
                        <option value="all">Todo Período</option>
                        <option value="current" selected>Este Mês</option>
                    </select>
                </div>
                
                <div class="card card-highlight" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="font-size: 12px; color: var(--dx-muted); font-weight: 700;">MÉDIA GERAL DA ESCOLA</p>
                        <p id="school-avg" style="font-weight: 800; font-size: 32px; color: var(--dx-teal);">--%</p>
                    </div>
                    <i class="ph-fill ph-chart-bar" style="font-size: 40px; color: var(--dx-teal-dim);"></i>
                </div>

                <div style="margin-bottom: 20px;">
                    <h3 style="font-size: 14px; font-weight: 700; color: var(--dx-muted); text-transform: uppercase;">Ranking de Assiduidade</h3>
                </div>

                <div id="reports-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Gerando relatório...</p>
                </div>
            </div>
        `;

        this.loadFrequencyData('current');
        document.getElementById('month-filter').addEventListener('change', (e) => this.loadFrequencyData(e.target.value));
    },

    async loadFrequencyData(period = 'current') {
        const listContainer = document.getElementById('reports-list');

        // 1. Configurar queries base
        let sessionQuery = supabase.from('training_sessions').select('*', { count: 'exact', head: true }).lte('scheduled_at', new Date().toISOString());
        let attendanceQuery = supabase.from('attendance').select('student_id, student:users!student_id (full_name)');

        if (period === 'current') {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0,0,0,0);
            sessionQuery = sessionQuery.gte('scheduled_at', startOfMonth.toISOString());
            attendanceQuery = attendanceQuery.gte('checked_in_at', startOfMonth.toISOString());
        }

        const { count: totalSessions } = await sessionQuery;

        if (!totalSessions || totalSessions === 0) {
            document.getElementById('school-avg').textContent = '0%';
            listContainer.innerHTML = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhum treino realizado ${period === 'current' ? 'este mês' : ''}.</p>`;
            return;
        }

        const { data: attendanceData, error } = await attendanceQuery;

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao processar dados.</p>`;
            return;
        }

        // 2. Processar métricas
        const stats = {};
        attendanceData.forEach(entry => {
            const id = entry.student_id;
            if (entry.student) {
                if (!stats[id]) stats[id] = { name: entry.student.full_name, count: 0 };
                stats[id].count++;
            }
        });

        const sortedStats = Object.values(stats).sort((a, b) => b.count - a.count);
        
        // Média da escola
        const totalPresences = attendanceData.length;
        const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
        const totalPossible = (studentCount || 1) * totalSessions;
        const schoolAvg = totalPossible > 0 ? Math.round((totalPresences / totalPossible) * 100) : 0;
        document.getElementById('school-avg').textContent = `${schoolAvg}%`;

        listContainer.innerHTML = sortedStats.map(stat => {
            const percent = Math.round((stat.count / totalSessions) * 100);
            const color = percent > 70 ? 'var(--dx-teal)' : (percent > 40 ? 'var(--dx-warn)' : 'var(--dx-danger)');

            return `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <p style="font-weight: 700; font-size: 15px;">${stat.name}</p>
                        <p style="font-weight: 800; color: ${color};">${percent}%</p>
                    </div>
                    <div style="width: 100%; height: 6px; background: var(--dx-surface2); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${percent}%; height: 100%; background: ${color}; border-radius: 3px;"></div>
                    </div>
                    <p style="font-size: 11px; color: var(--dx-muted); margin-top: 8px;">
                        Presente em ${stat.count} de ${totalSessions} treinos realizados.
                    </p>
                </div>
            `;
        }).join('');
    }
};