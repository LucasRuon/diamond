import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';
import { formatMonthLabel, getMonthMatrix, getWeekdayLabels, groupByDate } from '../../calendar.js';

export const studentAttendance = {
    async render(targetStudentId = null) {
        const mainContent = document.getElementById('main-content');
        const { data: { user } } = await supabase.auth.getUser();

        // Se targetStudentId for passado (por um responsável), usamos ele. Senão, usamos o do usuário logado.
        const studentId = targetStudentId || user.id;

        // Verificação de autorização: só permite acesso ao histórico de outro usuário
        // se o solicitante for admin ou responsável vinculado ao aluno.
        if (targetStudentId && targetStudentId !== user.id) {
            const { data: profile } = await supabase
                .from('users').select('role').eq('id', user.id).single();

            if (profile?.role !== 'admin') {
                const { data: link } = await supabase
                    .from('responsible_students')
                    .select('student_id')
                    .eq('responsible_id', user.id)
                    .eq('student_id', targetStudentId)
                    .single();

                if (!link) {
                    window.location.hash = '#dashboard';
                    return;
                }
            }
        }
        
        let title = "MINHA FREQUÊNCIA";
        if (targetStudentId) {
            const { data: student } = await supabase.from('users').select('full_name').eq('id', studentId).single();
            title = `FREQUÊNCIA: ${escapeHtml(student?.full_name.split(' ')[0].toUpperCase())}`;
        }

        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        ${targetStudentId ? `<a href="#students" style="color: var(--dx-muted); font-size: 24px;"><i class="ph ph-arrow-left"></i></a>` : ''}
                        <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400; margin: 0;">${title}</h1>
                    </div>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 32px;">
                    <div class="card" style="text-align: center;">
                        <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">Presenças</p>
                        <p id="stat-count" style="font-weight: 800; font-size: 28px; color: var(--dx-teal); margin-top: 4px;">--</p>
                    </div>
                    <div class="card" style="text-align: center;">
                        <p style="font-size: 11px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">Este Mês</p>
                        <p id="stat-month" style="font-weight: 800; font-size: 28px; color: var(--dx-text); margin-top: 4px;">--</p>
                    </div>
                </div>

                <div class="card calendar-shell" style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div>
                            <p class="section-label">Calendário</p>
                            <h2 class="brand-title" style="font-size: 16px; text-transform: uppercase; margin-top: 4px;">${formatMonthLabel(new Date())}</h2>
                        </div>
                        <i class="ph ph-calendar-check" style="font-size: 28px; color: var(--dx-teal);"></i>
                    </div>
                    <div id="attendance-calendar" class="calendar-grid">
                        <p style="color: var(--dx-muted); grid-column: 1 / -1; text-align: center; padding: 20px;">Carregando calendário...</p>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                        <div>
                            <p class="section-label">Gráfico</p>
                            <h2 class="brand-title" style="font-size: 16px; margin-top: 4px;">PRESENÇAS POR SEMANA</h2>
                        </div>
                        <i class="ph ph-chart-bar" style="font-size: 28px; color: var(--dx-teal);"></i>
                    </div>
                    <div id="attendance-chart" class="chart-bars"></div>
                </div>

                <h3 class="section-label" style="margin-bottom: 12px;">Histórico</h3>
                <div id="attendance-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando histórico...</p>
                </div>
            </div>
        `;

        this.loadAttendance(studentId);
    },

    async loadAttendance(studentId) {
        const listContainer = document.getElementById('attendance-list');
        
        const { data: history, error } = await supabase
            .from('attendance')
            .select(`
                checked_in_at,
                method,
                session:training_sessions (
                    title,
                    scheduled_at
                )
            `)
            .eq('student_id', studentId)
            .order('checked_in_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar histórico.</p>`;
            return;
        }

        document.getElementById('stat-count').textContent = history.length;
        
        const now = new Date();
        const thisMonth = history.filter(a => {
            const d = new Date(a.checked_in_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        document.getElementById('stat-month').textContent = thisMonth;
        this.renderVisuals(history);

        if (history.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 40px; padding: 20px;">
                    <i class="ph ph-calendar-x" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Nenhuma presença registrada ainda.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = history.map(item => {
            const date = new Date(item.checked_in_at);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="font-weight: 700; font-size: 15px;">${escapeHtml(item.session?.title || 'Treino')}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${dateStr} às ${timeStr} • ${item.method === 'qrcode' ? 'QR Code' : 'Manual'}</p>
                    </div>
                    <div style="background: var(--dx-teal-dim); color: var(--dx-teal); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
                        CONFIRMADO
                    </div>
                </div>
            `;
        }).join('');
    },

    renderVisuals(history) {
        const calendarContainer = document.getElementById('attendance-calendar');
        const chartContainer = document.getElementById('attendance-chart');
        const now = new Date();
        const currentMonthItems = history.filter(item => {
            const date = new Date(item.checked_in_at);
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        });
        const itemsByDate = groupByDate(currentMonthItems, item => item.checked_in_at);

        calendarContainer.innerHTML = `
            ${getWeekdayLabels().map(label => `<div class="calendar-weekday">${label}</div>`).join('')}
            ${getMonthMatrix(now).flat().map(day => `
                <div class="calendar-day ${day.isToday ? 'is-today' : ''} ${itemsByDate[day.key] ? 'has-attendance' : ''} ${day.isCurrentMonth ? '' : 'is-disabled'}">
                    ${day.day}
                </div>
            `).join('')}
        `;

        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
        const weeklyCounts = [0, 0, 0, 0, 0, 0];

        currentMonthItems.forEach(item => {
            const date = new Date(item.checked_in_at);
            const weekIndex = Math.floor((date.getDate() + firstDay - 1) / 7);
            weeklyCounts[weekIndex] += 1;
        });

        const maxCount = Math.max(...weeklyCounts, 1);
        chartContainer.innerHTML = weeklyCounts.map((count, index) => {
            const height = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
            return `
                <div style="height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 8px;">
                    <div class="chart-bar" style="height: ${height}%; width: 100%;"></div>
                    <span style="font-size: 10px; color: var(--dx-muted); font-weight: 700;">S${index + 1}</span>
                    <span style="font-size: 11px; color: var(--dx-teal); font-weight: 800;">${count}</span>
                </div>
            `;
        }).join('');
    }
};
