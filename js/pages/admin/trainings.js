import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';
import { formatMonthLabel, getMonthMatrix, getWeekdayLabels, groupByDate } from '../../calendar.js';
import { getReservationsLoadMessage } from '../../trainingReservations.js';

export const adminTrainings = {
    currentMonth: new Date(),

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">TREINOS</h1>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                        <button id="add-training-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                            <i class="ph ph-plus-circle" style="font-size: 20px;"></i>
                        </button>
                    </div>
                </div>

                <div class="card calendar-shell" style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <button id="admin-prev-training-month" class="icon-action" aria-label="Mês anterior">
                            <i class="ph ph-caret-left"></i>
                        </button>
                        <h2 id="admin-training-month" class="brand-title" style="font-size: 16px; text-align: center; text-transform: uppercase;"></h2>
                        <button id="admin-next-training-month" class="icon-action" aria-label="Próximo mês">
                            <i class="ph ph-caret-right"></i>
                        </button>
                    </div>
                    <div id="admin-training-calendar" class="calendar-grid">
                        <p style="color: var(--dx-muted); grid-column: 1 / -1; text-align: center; padding: 20px;">Carregando calendário...</p>
                    </div>
                </div>

                <div id="trainings-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando agenda...</p>
                </div>
            </div>
        `;

        this.loadTrainings();
        document.getElementById('add-training-btn').addEventListener('click', () => this.showAddTrainingForm());
        document.getElementById('admin-prev-training-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('admin-next-training-month').addEventListener('click', () => this.changeMonth(1));
    },

    async loadTrainings() {
        const listContainer = document.getElementById('trainings-list');
        const calendarContainer = document.getElementById('admin-training-calendar');
        const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
        document.getElementById('admin-training-month').textContent = formatMonthLabel(this.currentMonth);
        
        const { data: sessions, error } = await supabase
            .from('training_sessions')
            .select('*')
            .gte('scheduled_at', monthStart.toISOString())
            .lt('scheduled_at', monthEnd.toISOString())
            .order('scheduled_at', { ascending: true });

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar treinos.</p>`;
            calendarContainer.innerHTML = '';
            return;
        }

        const safeSessions = sessions || [];
        const sessionIds = safeSessions.map(session => session.id);
        const { data: reservations, error: reservationsError } = sessionIds.length
            ? await supabase
                .from('training_reservations')
                .select('id, session_id, status, student:users!student_id(id, full_name, email)')
                .in('session_id', sessionIds)
                .eq('status', 'booked')
            : { data: [], error: null };

        let safeReservations = reservations || [];
        let reservationsUnavailable = false;
        let reservationsMessage = '';

        if (reservationsError) {
            console.error('Erro ao carregar reservas admin:', reservationsError);
            safeReservations = [];
            reservationsUnavailable = true;
            reservationsMessage = getReservationsLoadMessage(reservationsError);
        }

        const reservationsBySession = safeReservations.reduce((groups, reservation) => {
            if (!groups[reservation.session_id]) groups[reservation.session_id] = [];
            groups[reservation.session_id].push(reservation);
            return groups;
        }, {});

        this.renderCalendar(safeSessions, reservationsBySession);

        if (safeSessions.length === 0) {
            listContainer.innerHTML = `
                ${reservationsUnavailable ? `<div class="card" style="border-color: var(--dx-danger); color: var(--dx-danger); font-size: 13px;">${reservationsMessage}</div>` : ''}
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-calendar-blank" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted); font-size: 15px;">Nenhum treino agendado neste mês.</p>
                    <p style="color: var(--dx-muted); font-size: 13px; margin-top: 8px;">Clique no botão "+" para criar a agenda.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = `
            ${reservationsUnavailable ? `<div class="card" style="border-color: var(--dx-danger); color: var(--dx-danger); font-size: 13px;">${reservationsMessage}</div>` : ''}
            ${safeSessions.map(session => {
            const date = new Date(session.scheduled_at);
            const isPast = date < new Date();
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const reservationCount = reservationsBySession[session.id]?.length || 0;
            const reservationLabel = reservationsUnavailable ? '-- reservas' : `${reservationCount} reserva${reservationCount === 1 ? '' : 's'}`;

            return `
                <div class="card training-card" data-session-id="${escapeHtml(session.id)}" style="border-left: 4px solid ${isPast ? 'var(--dx-border)' : 'var(--dx-teal)'}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <p style="font-size: 11px; color: ${isPast ? 'var(--dx-muted)' : 'var(--dx-teal)'}; font-weight: 700; text-transform: uppercase;">${dateStr} • ${timeStr}</p>
                            <p style="font-weight: 700; font-size: 17px;">${escapeHtml(session.title)}</p>
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}" target="_blank" style="font-size: 12px; color: var(--dx-muted); display: flex; align-items: center; gap: 4px; text-decoration: none; margin-top: 4px;">
                                <i class="ph ph-map-pin"></i> ${escapeHtml(session.location)}
                            </a>
                            <p style="font-size: 12px; color: var(--dx-muted); margin-top: 6px;">
                                <i class="ph ph-calendar-check"></i> ${reservationLabel}
                            </p>
                        </div>
                        <button class="btn-qr" data-token="${escapeHtml(session.qr_code_token)}" style="color: var(--dx-teal); font-size: 20px;">
                            <i class="ph ph-qr-code"></i>
                        </button>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 16px;">
                        <button class="btn btn-attendance" data-id="${escapeHtml(session.id)}" data-title="${escapeHtml(session.title)}" style="flex: 1; padding: 10px; font-size: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border); color: var(--dx-text);">
                            <i class="ph ph-users-three" style="margin-right: 6px;"></i> PRESENÇAS
                        </button>
                        <button class="btn-delete-training" data-id="${escapeHtml(session.id)}" style="padding: 10px; color: var(--dx-danger); background: rgba(248, 113, 113, 0.1); border-radius: 8px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('')}
        `;

        this.setupEvents();
    },

    renderCalendar(sessions, reservationsBySession = {}) {
        const calendarContainer = document.getElementById('admin-training-calendar');
        const sessionsByDate = groupByDate(sessions, session => session.scheduled_at);
        const reservedSessionIds = new Set(Object.keys(reservationsBySession));

        calendarContainer.innerHTML = `
            ${getWeekdayLabels().map(label => `<div class="calendar-weekday">${label}</div>`).join('')}
            ${getMonthMatrix(this.currentMonth).flat().map(day => {
                const daySessions = sessionsByDate[day.key] || [];
                const hasTraining = Boolean(daySessions.length);
                const hasReservation = daySessions.some(session => reservedSessionIds.has(session.id));
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
    },

    setupEvents() {
        document.querySelectorAll('.btn-qr').forEach(btn => {
            btn.addEventListener('click', () => this.showQrCode(btn.dataset.token));
        });

        document.querySelectorAll('.btn-attendance').forEach(btn => {
            btn.addEventListener('click', () => this.showAttendanceList(btn.dataset.id, btn.dataset.title));
        });

        document.querySelectorAll('.btn-delete-training').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Deseja excluir este treino?')) {
                    const { error } = await supabase.from('training_sessions').delete().eq('id', btn.dataset.id);
                    if (error) toast.show(error.message, 'error');
                    else { toast.show('Treino excluído'); this.loadTrainings(); }
                }
            });
        });
    },

    async showAttendanceList(sessionId, title) {
        const content = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <p style="font-size: 13px; color: var(--dx-muted); margin-bottom: 8px;">Selecione os alunos presentes nesta sessão.</p>
                <div id="reserved-students-list" class="card" style="background: var(--dx-surface2);">
                    <p class="section-label" style="margin-bottom: 8px;">Reservas</p>
                    <p style="text-align: center; padding: 12px; color: var(--dx-muted);">Carregando reservas...</p>
                </div>
                <div id="attendance-students-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto;">
                    <p style="text-align: center; padding: 20px; color: var(--dx-muted);">Carregando alunos...</p>
                </div>
            </div>
        `;

        ui.bottomSheet.show(`PRESENÇAS: ${title}`, content, () => {});

        // 1. Buscar todos os alunos
        const { data: students } = await supabase.from('users').select('id, full_name').eq('role', 'student').order('full_name');
        
        // 2. Buscar quem já tem presença marcada
        const { data: attendance } = await supabase.from('attendance').select('student_id').eq('session_id', sessionId);
        const presentIds = new Set(attendance.map(a => a.student_id));
        const { data: reservations, error: reservationsError } = await supabase
            .from('training_reservations')
            .select('student:users!student_id(id, full_name, email)')
            .eq('session_id', sessionId)
            .eq('status', 'booked');

        const reservedContainer = document.getElementById('reserved-students-list');
        if (reservationsError) {
            console.error('Erro ao carregar reservas admin:', reservationsError);
            reservedContainer.innerHTML = `
                <p class="section-label" style="margin-bottom: 8px;">Reservas</p>
                <p style="font-size: 12px; color: var(--dx-danger);">${getReservationsLoadMessage(reservationsError)}</p>
            `;
        } else {
            reservedContainer.innerHTML = `
                <p class="section-label" style="margin-bottom: 8px;">Reservas</p>
                ${(reservations || []).length ? reservations.map(reservation => `
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 0; border-top: 1px solid var(--dx-border);">
                        <div>
                            <p style="font-weight: 700; font-size: 13px;">${escapeHtml(reservation.student?.full_name || 'Aluno')}</p>
                            <p style="font-size: 11px; color: var(--dx-muted);">${escapeHtml(reservation.student?.email || '')}</p>
                        </div>
                        <span class="badge ${presentIds.has(reservation.student?.id) ? 'badge-active' : 'badge-pending'}">${presentIds.has(reservation.student?.id) ? 'PRESENTE' : 'RESERVADO'}</span>
                    </div>
                `).join('') : '<p style="font-size: 12px; color: var(--dx-muted);">Nenhuma reserva para este treino.</p>'}
            `;
        }

        const listContainer = document.getElementById('attendance-students-list');
        listContainer.innerHTML = students.map(s => `
            <div class="attendance-item card" data-student-id="${escapeHtml(s.id)}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${presentIds.has(s.id) ? 'var(--dx-teal-dim)' : 'var(--dx-surface2)'}; border-color: ${presentIds.has(s.id) ? 'var(--dx-teal)' : 'var(--dx-border)'}">
                <p style="font-weight: 600; font-size: 14px;">${escapeHtml(s.full_name)}</p>
                <div class="attendance-toggle" style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${presentIds.has(s.id) ? 'var(--dx-teal)' : 'var(--dx-muted)'}; display: flex; align-items: center; justify-content: center;">
                    ${presentIds.has(s.id) ? '<i class="ph-bold ph-check" style="color: var(--dx-teal); font-size: 14px;"></i>' : ''}
                </div>
            </div>
        `).join('');

        // 3. Lógica de clique para marcar/desmarcar
        listContainer.querySelectorAll('.attendance-item').forEach(item => {
            item.addEventListener('click', async () => {
                const studentId = item.dataset.studentId;
                const isPresent = presentIds.has(studentId);

                if (isPresent) {
                    // Remover presença
                    const { error } = await supabase.from('attendance').delete().eq('session_id', sessionId).eq('student_id', studentId);
                    if (!error) {
                        presentIds.delete(studentId);
                        item.style.background = 'var(--dx-surface2)';
                        item.style.borderColor = 'var(--dx-border)';
                        item.querySelector('.attendance-toggle').innerHTML = '';
                        item.querySelector('.attendance-toggle').style.borderColor = 'var(--dx-muted)';
                    }
                } else {
                    // Adicionar presença manual
                    const adminId = (await supabase.auth.getUser()).data.user.id;
                    const { error } = await supabase.from('attendance').insert([{
                        session_id: sessionId,
                        student_id: studentId,
                        method: 'manual',
                        marked_by: adminId
                    }]);
                    if (!error) {
                        presentIds.add(studentId);
                        item.style.background = 'var(--dx-teal-dim)';
                        item.style.borderColor = 'var(--dx-teal)';
                        item.querySelector('.attendance-toggle').innerHTML = '<i class="ph-bold ph-check" style="color: var(--dx-teal); font-size: 14px;"></i>';
                        item.querySelector('.attendance-toggle').style.borderColor = 'var(--dx-teal)';
                    }
                }
            });
        });
    },

    showAddTrainingForm() {
        const formHtml = `
            <form id="new-training-form">
                <div class="input-group">
                    <label>TÍTULO DO TREINO</label>
                    <input type="text" name="title" class="input-control" placeholder="Ex: Treino Técnico" required>
                </div>
                <div class="input-group">
                    <label>LOCAL</label>
                    <input type="text" name="location" class="input-control" value="Campo Principal" required>
                </div>
                <div class="input-group">
                    <label>DATA E HORA</label>
                    <input type="datetime-local" name="scheduled_at" class="input-control" required>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">AGENDAR TREINO</button>
            </form>
        `;

        ui.bottomSheet.show('Novo Treino', formHtml, async (data) => {
            const { error } = await supabase.from('training_sessions').insert([{
                ...data,
                scheduled_at: new Date(data.scheduled_at).toISOString(),
                qr_code_token: crypto.randomUUID(),
                created_by: (await supabase.auth.getUser()).data.user?.id
            }]);

            if (error) throw error;
            toast.show('Treino agendado!');
            this.loadTrainings();
        });
    },

    showQrCode(token) {
        const qrHtml = `<div style="display: flex; flex-direction: column; align-items: center; padding: 20px 0;"><div id="qrcode-container" style="background: white; padding: 20px; border-radius: 12px; margin-bottom: 24px;"></div><p style="color: var(--dx-muted); font-size: 14px;">Aponte a câmera para registrar.</p></div>`;
        ui.bottomSheet.show('Check-in via QR', qrHtml, () => {});
        setTimeout(() => {
            new QRCode(document.getElementById("qrcode-container"), { text: token, width: 256, height: 256, colorDark : "#0a0a0a", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H });
        }, 50);
    }
};
