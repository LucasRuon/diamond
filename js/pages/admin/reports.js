import { supabase } from '../../supabase.js';

export const adminReports = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div style="padding: 24px 20px;">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">RELATÓRIO DE FREQUÊNCIA</h1>
                
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

        this.loadFrequencyData();
    },

    async loadFrequencyData() {
        const listContainer = document.getElementById('reports-list');

        // 1. Pegar total de treinos já realizados
        const { count: totalSessions } = await supabase
            .from('training_sessions')
            .select('*', { count: 'exact', head: true })
            .lte('scheduled_at', new Date().toISOString());

        if (!totalSessions || totalSessions === 0) {
            listContainer.innerHTML = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhum treino realizado ainda para gerar métricas.</p>`;
            return;
        }

        // 2. Pegar presenças agrupadas por aluno
        const { data: attendanceData, error } = await supabase
            .from('attendance')
            .select(`
                student_id,
                student:users!student_id (full_name)
            `);

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao processar dados.</p>`;
            return;
        }

        // 3. Processar métricas
        const stats = {};
        attendanceData.forEach(entry => {
            const id = entry.student_id;
            if (!stats[id]) stats[id] = { name: entry.student.full_name, count: 0 };
            stats[id].count++;
        });

        const sortedStats = Object.values(stats).sort((a, b) => b.count - a.count);
        
        // Média da escola
        const totalPresences = attendanceData.length;
        const totalPossible = (await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student')).count * totalSessions;
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