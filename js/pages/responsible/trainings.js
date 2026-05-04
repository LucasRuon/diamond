import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';
import { dateKey, formatMonthLabel, getMonthMatrix, getWeekdayLabels, groupByDate } from '../../calendar.js';
import { getReservationsLoadMessage } from '../../trainingReservations.js';

export const responsibleTrainings = {
    currentMonth: new Date(),

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <div>
                        <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">TREINOS</h1>
                        <p style="color: var(--dx-muted); font-size: 13px;">Reservas dos alunos vinculados</p>
                    </div>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>

                <div class="card calendar-shell" style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <button id="responsible-prev-training-month" class="icon-action" aria-label="Mês anterior">
                            <i class="ph ph-caret-left"></i>
                        </button>
                        <h2 id="responsible-training-month" class="brand-title" style="font-size: 16px; text-align: center; text-transform: uppercase;"></h2>
                        <button id="responsible-next-training-month" class="icon-action" aria-label="Próximo mês">
                            <i class="ph ph-caret-right"></i>
                        </button>
                    </div>
                    <div id="responsible-training-calendar" class="calendar-grid">
                        <p style="color: var(--dx-muted); grid-column: 1 / -1; text-align: center; padding: 20px;">Carregando calendário...</p>
                    </div>
                </div>

                <div id="responsible-trainings-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Buscando treinos...</p>
                </div>
            </div>
        `;

        document.getElementById('responsible-prev-training-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('responsible-next-training-month').addEventListener('click', () => this.changeMonth(1));
        this.loadTrainings();
    },

    async loadTrainings() {
        const listContainer = document.getElementById('responsible-trainings-list');
        const calendarContainer = document.getElementById('responsible-training-calendar');
        const monthTitle = document.getElementById('responsible-training-month');
        const { data: { user } } = await supabase.auth.getUser();

        monthTitle.textContent = formatMonthLabel(this.currentMonth);

        const { data: links, error: linksError } = await supabase
            .from('responsible_students')
            .select('student_id, student:users!student_id(id, full_name, email)')
            .eq('responsible_id', user.id);

        if (linksError) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar alunos vinculados.</p>`;
            calendarContainer.innerHTML = '';
            return;
        }

        if (!links?.length) {
            calendarContainer.innerHTML = '';
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-users-three" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Nenhum aluno vinculado.</p>
                    <a href="#students" class="btn btn-primary" style="margin-top: 16px; width: auto; text-decoration: none;">VINCULAR ALUNO</a>
                </div>
            `;
            return;
        }

        const linkedStudentIds = links.map(link => link.student_id);
        const studentsById = new Map(links.map(link => [
            link.student_id,
            link.student || { id: link.student_id, full_name: 'Aluno', email: '' }
        ]));
        const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);

        const { data: sessions, error: sessionsError } = await supabase
            .from('training_sessions')
            .select('*')
            .gte('scheduled_at', monthStart.toISOString())
            .lt('scheduled_at', monthEnd.toISOString())
            .order('scheduled_at', { ascending: true });

        if (sessionsError) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar treinos.</p>`;
            calendarContainer.innerHTML = '';
            return;
        }

        const safeSessions = sessions || [];
        const { data: reservations, error: reservationsError } = await supabase
            .from('training_reservations')
            .select('id, session_id, student_id, status')
            .in('student_id', linkedStudentIds)
            .eq('status', 'booked');

        let safeReservations = reservations || [];
        let reservationsUnavailable = false;
        let reservationsMessage = '';

        if (reservationsError) {
            console.error('Erro ao carregar reservas do responsável:', reservationsError);
            safeReservations = [];
            reservationsUnavailable = true;
            reservationsMessage = getReservationsLoadMessage(reservationsError);
        }

        const reservationsBySession = safeReservations.reduce((groups, reservation) => {
            if (!groups[reservation.session_id]) groups[reservation.session_id] = [];
            groups[reservation.session_id].push(reservation);
            return groups;
        }, {});

        this.renderCalendar(safeSessions, safeReservations);

        if (!safeSessions.length) {
            listContainer.innerHTML = `
                ${reservationsUnavailable ? `<div class="card" style="border-color: var(--dx-danger); color: var(--dx-danger); font-size: 13px;">${reservationsMessage}</div>` : ''}
                <p style="color: var(--dx-muted); text-align: center; margin-top: 24px;">Nenhum treino agendado neste mês.</p>
            `;
            return;
        }

        listContainer.innerHTML = `
            ${reservationsUnavailable ? `<div class="card" style="border-color: var(--dx-danger); color: var(--dx-danger); font-size: 13px;">${reservationsMessage}</div>` : ''}
            <h3 class="section-label" style="margin-bottom: 8px;">Agenda do Mês</h3>
            ${safeSessions.map(session => this.renderSessionCard(session, reservationsBySession[session.id] || [], studentsById)).join('')}
        `;
    },

    renderSessionCard(session, reservations, studentsById) {
        const date = new Date(session.scheduled_at);
        const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

        return `
            <div class="card" data-session-id="${escapeHtml(session.id)}" style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between; gap: 12px;">
                    <div>
                        <p style="font-weight: 700; font-size: 16px;">${escapeHtml(session.title)}</p>
                        <p style="font-size: 12px; color: var(--dx-muted); margin-top: 4px;">
                            <i class="ph ph-calendar"></i> ${dateStr} às ${timeStr}
                        </p>
                        <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location || '')}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: var(--dx-teal); display: flex; align-items: center; gap: 4px; text-decoration: none; margin-top: 4px;">
                            <i class="ph ph-map-pin"></i> ${escapeHtml(session.location || 'Local a definir')}
                        </a>
                    </div>
                    <span class="badge ${reservations.length ? 'badge-active' : 'badge-pending'}" style="height: fit-content;">${reservations.length ? 'RESERVADO' : 'SEM RESERVA'}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${reservations.length ? reservations.map(reservation => {
                        const student = studentsById.get(reservation.student_id) || { full_name: 'Aluno', email: '' };
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px; background: var(--dx-surface2); border: 1px solid var(--dx-border); border-radius: var(--radius-md);">
                                <div>
                                    <p style="font-weight: 700; font-size: 13px;">${escapeHtml(student.full_name)}</p>
                                    <p style="font-size: 11px; color: var(--dx-muted);">${escapeHtml(student.email || '')}</p>
                                </div>
                                <span class="badge badge-active">RESERVADO</span>
                            </div>
                        `;
                    }).join('') : '<p style="font-size: 12px; color: var(--dx-muted);">Sem reserva dos seus alunos.</p>'}
                </div>
            </div>
        `;
    },

    renderCalendar(sessions, reservations) {
        const calendarContainer = document.getElementById('responsible-training-calendar');
        const sessionsByDate = groupByDate(sessions, session => session.scheduled_at);
        const sessionsById = new Map(sessions.map(session => [session.id, session]));
        const reservationDates = new Set(reservations
            .map(reservation => sessionsById.get(reservation.session_id)?.scheduled_at)
            .filter(Boolean)
            .map(scheduledAt => dateKey(scheduledAt)));

        calendarContainer.innerHTML = `
            ${getWeekdayLabels().map(label => `<div class="calendar-weekday">${label}</div>`).join('')}
            ${getMonthMatrix(this.currentMonth).flat().map(day => {
                const hasTraining = Boolean(sessionsByDate[day.key]?.length);
                const hasReservation = reservationDates.has(day.key);
                return `
                    <button class="calendar-day ${day.isToday ? 'is-today' : ''} ${hasTraining ? 'has-training' : ''} ${hasReservation ? 'has-reservation' : ''} ${day.isCurrentMonth ? '' : 'is-disabled'}" data-day="${day.key}" type="button">
                        ${day.day}
                    </button>
                `;
            }).join('')}
        `;

        calendarContainer.querySelectorAll('.calendar-day.has-training').forEach(dayButton => {
            dayButton.addEventListener('click', () => {
                const card = document.querySelector(`[data-session-id="${sessionsByDate[dayButton.dataset.day][0].id}"]`);
                card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        });
    },

    changeMonth(direction) {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1);
        this.loadTrainings();
    }
};
