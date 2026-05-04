import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';

export const adminReports = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400; margin: 0;">FREQUÊNCIA</h1>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                        <select id="month-filter" class="input-control" style="width: auto; padding: 6px 12px; font-size: 13px;">
                            <option value="all">Todo Período</option>
                            <option value="current" selected>Este Mês</option>
                        </select>
                    </div>
                </div>
                
                <div class="card card-highlight" style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="font-size: 12px; color: var(--dx-muted); font-weight: 700;">MÉDIA GERAL DA ESCOLA</p>
                        <p id="school-avg" style="font-weight: 800; font-size: 32px; color: var(--dx-teal);">--%</p>
                    </div>
                    <i class="ph-fill ph-chart-bar" style="font-size: 40px; color: var(--dx-teal-dim);"></i>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <div>
                            <p class="section-label">Volume</p>
                            <h2 id="school-chart-title" class="brand-title" style="font-size: 16px; margin-top: 4px;">PRESENÇAS POR SEMANA</h2>
                        </div>
                        <i class="ph ph-chart-bar" style="font-size: 28px; color: var(--dx-teal);"></i>
                    </div>
                    <div id="school-frequency-chart" class="chart-bars"></div>
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
        let attendanceQuery = supabase.from('attendance').select('student_id, checked_in_at, student:users!student_id (full_name)');

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
            this.renderSchoolChart([], period);
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
        this.renderSchoolChart(attendanceData, period);

        listContainer.innerHTML = sortedStats.map(stat => {
            const percent = Math.round((stat.count / totalSessions) * 100);
            const color = percent > 70 ? 'var(--dx-teal)' : (percent > 40 ? 'var(--dx-warn)' : 'var(--dx-danger)');

            return `
                <div class="card">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <p style="font-weight: 700; font-size: 15px;">${escapeHtml(stat.name)}</p>
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
    },

    renderSchoolChart(attendanceData, period) {
        const chartContainer = document.getElementById('school-frequency-chart');
        const title = document.getElementById('school-chart-title');
        const now = new Date();

        if (period === 'current') {
            title.textContent = 'PRESENÇAS POR SEMANA';
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
            const weeklyCounts = [0, 0, 0, 0, 0, 0];

            attendanceData.forEach(item => {
                const date = new Date(item.checked_in_at);
                const weekIndex = Math.floor((date.getDate() + firstDay - 1) / 7);
                weeklyCounts[weekIndex] += 1;
            });

            this.renderBars(chartContainer, weeklyCounts, index => `S${index + 1}`);
            return;
        }

        title.textContent = 'PRESENÇAS NOS ÚLTIMOS 6 MESES';
        const monthBuckets = [];

        for (let index = 5; index >= 0; index -= 1) {
            const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
            monthBuckets.push({
                key: `${date.getFullYear()}-${date.getMonth()}`,
                label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
                count: 0
            });
        }

        attendanceData.forEach(item => {
            const date = new Date(item.checked_in_at);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            const bucket = monthBuckets.find(entry => entry.key === key);
            if (bucket) bucket.count += 1;
        });

        this.renderBars(chartContainer, monthBuckets.map(bucket => bucket.count), index => monthBuckets[index].label);
    },

    renderBars(container, counts, getLabel) {
        const maxCount = Math.max(...counts, 1);
        container.innerHTML = counts.map((count, index) => {
            const height = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
            return `
                <div style="height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 8px;">
                    <div class="chart-bar" style="height: ${height}%; width: 100%;"></div>
                    <span style="font-size: 10px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">${getLabel(index)}</span>
                    <span style="font-size: 11px; color: var(--dx-teal); font-weight: 800;">${count}</span>
                </div>
            `;
        }).join('');
    }
};
