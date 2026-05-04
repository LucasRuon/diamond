import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';
import { dateKey, formatMonthLabel, getMonthMatrix, getWeekdayLabels, groupByDate } from '../../calendar.js';
import { getReservationsLoadMessage, isReservationsSchemaError } from '../../trainingReservations.js';

export const studentTrainings = {
    scanner: null,
    currentMonth: new Date(),

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">MEUS TREINOS</h1>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>
                
                <div id="checkin-card" class="card card-highlight" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; border-color: var(--dx-teal);">
                    <div>
                        <p style="font-weight: 700; font-size: 16px;">PRESENÇA NO TREINO</p>
                        <p style="font-size: 13px; color: var(--dx-muted);">Escanear QR Code para check-in</p>
                    </div>
                    <button id="start-scan-btn" class="btn btn-primary" style="width: auto; border-radius: 50%; width: 48px; height: 48px; padding: 0;">
                        <i class="ph-bold ph-qr-code" style="font-size: 24px;"></i>
                    </button>
                </div>

                <div class="card calendar-shell" style="margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <button id="prev-training-month" class="icon-action" aria-label="Mês anterior">
                            <i class="ph ph-caret-left"></i>
                        </button>
                        <h2 id="student-training-month" class="brand-title" style="font-size: 16px; text-align: center; text-transform: uppercase;"></h2>
                        <button id="next-training-month" class="icon-action" aria-label="Próximo mês">
                            <i class="ph ph-caret-right"></i>
                        </button>
                    </div>
                    <div id="student-training-calendar" class="calendar-grid">
                        <p style="color: var(--dx-muted); grid-column: 1 / -1; text-align: center; padding: 20px;">Carregando calendário...</p>
                    </div>
                </div>

                <div id="student-trainings-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Buscando treinos...</p>
                </div>
            </div>
        `;

        this.loadAvailableTrainings();
        document.getElementById('start-scan-btn').addEventListener('click', () => this.showScanner());
        document.getElementById('prev-training-month').addEventListener('click', () => this.changeMonth(-1));
        document.getElementById('next-training-month').addEventListener('click', () => this.changeMonth(1));
    },

    async loadAvailableTrainings() {
        const listContainer = document.getElementById('student-trainings-list');
        const calendarContainer = document.getElementById('student-training-calendar');
        const user = (await supabase.auth.getUser()).data.user;

        const monthStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const monthEnd = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
        const queryStart = monthStart < new Date() ? new Date() : monthStart;

        document.getElementById('student-training-month').textContent = formatMonthLabel(this.currentMonth);

        const sessionsQuery = supabase
            .from('training_sessions')
            .select('*')
            .gte('scheduled_at', queryStart.toISOString())
            .lt('scheduled_at', monthEnd.toISOString())
            .order('scheduled_at');

        const reservationsQuery = supabase
            .from('training_reservations')
            .select('*')
            .eq('student_id', user.id)
            .eq('status', 'booked');

        const activePlanQuery = supabase
            .from('student_plans')
            .select('id')
            .eq('student_id', user.id)
            .eq('status', 'active')
            .limit(1);

        const [
            { data: sessions, error: sessionsError },
            { data: reservations, error: reservationsError },
            { data: activePlans }
        ] = await Promise.all([sessionsQuery, reservationsQuery, activePlanQuery]);

        if (sessionsError) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar treinos.</p>`;
            calendarContainer.innerHTML = '';
            return;
        }

        let safeReservations = reservations || [];
        let reservationsUnavailable = false;
        let reservationsMessage = '';

        if (reservationsError) {
            console.error('Erro ao carregar reservas do aluno:', reservationsError);
            safeReservations = [];
            reservationsUnavailable = true;
            reservationsMessage = getReservationsLoadMessage(reservationsError);
        }

        const safeSessions = sessions || [];
        this.renderCalendar(safeSessions, safeReservations);

        if (safeSessions.length === 0) {
            listContainer.innerHTML = `
                ${reservationsUnavailable ? `<div class="card" style="border-color: var(--dx-danger); color: var(--dx-danger); font-size: 13px;">${reservationsMessage}</div>` : ''}
                <p style="color: var(--dx-muted); text-align: center; margin-top: 24px;">Nenhum treino disponível neste mês.</p>
            `;
            return;
        }

        const reservationsBySession = new Map(safeReservations.map(reservation => [reservation.session_id, reservation]));
        const hasActivePlan = Boolean(activePlans?.length);

        listContainer.innerHTML = `
            ${reservationsUnavailable ? `<div class="card" style="border-color: var(--dx-danger); color: var(--dx-danger); font-size: 13px;">${reservationsMessage}</div>` : ''}
            <h3 class="section-label" style="margin-bottom: 8px;">Agenda do Mês</h3>
            ${safeSessions.map(session => {
                const date = new Date(session.scheduled_at);
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const reservation = reservationsUnavailable ? null : reservationsBySession.get(session.id);
                const hoursUntilSession = (date.getTime() - Date.now()) / 36e5;
                const canReserve = hoursUntilSession >= 24;
                const canUseReservations = !reservationsUnavailable;
                const stateLabel = reservationsUnavailable ? 'Reservas indisponiveis' : (reservation ? 'Treino marcado' : (canReserve ? 'Disponível para marcar' : 'Encerrado para marcação'));

                return `
                    <div class="card" data-session-id="${escapeHtml(session.id)}" style="display: flex; flex-direction: column; gap: 14px;">
                        <div style="display: flex; justify-content: space-between; gap: 12px;">
                            <div>
                            <p style="font-weight: 600;">${escapeHtml(session.title)}</p>
                            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                                <p style="font-size: 12px; color: var(--dx-muted); display: flex; align-items: center; gap: 4px;">
                                    <i class="ph ph-calendar"></i> ${dateStr} às ${timeStr}
                                </p>
                                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location || '')}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: var(--dx-teal); display: flex; align-items: center; gap: 4px; text-decoration: none;">
                                    <i class="ph ph-map-pin"></i> ${escapeHtml(session.location || 'Local a definir')}
                                </a>
                            </div>
                        </div>
                            <span class="badge ${reservation ? 'badge-active' : (canReserve ? 'badge-pending' : 'badge-overdue')}" style="height: fit-content;">${stateLabel}</span>
                        </div>
                        ${reservation ? `
                            <button class="btn cancel-reservation-btn" data-reservation-id="${escapeHtml(reservation.id)}" style="padding: 10px; font-size: 12px; border: 1px solid var(--dx-border); color: var(--dx-danger);">
                                CANCELAR RESERVA
                            </button>
                        ` : `
                            <button class="btn reserve-training-btn" data-session-id="${escapeHtml(session.id)}" ${!canUseReservations || !canReserve || !hasActivePlan ? 'disabled' : ''} style="padding: 10px; font-size: 12px; border: 1px solid ${canUseReservations && canReserve && hasActivePlan ? 'var(--dx-teal)' : 'var(--dx-border)'}; color: ${canUseReservations && canReserve && hasActivePlan ? 'var(--dx-teal)' : 'var(--dx-muted)'}; opacity: ${canUseReservations && canReserve && hasActivePlan ? '1' : '0.55'};">
                                ${reservationsUnavailable ? 'RESERVAS INDISPONÍVEIS' : (!hasActivePlan ? 'PLANO ATIVO NECESSÁRIO' : (canReserve ? 'MARCAR TREINO' : 'RESERVAS ENCERRADAS'))}
                            </button>
                        `}
                    </div>
                `;
            }).join('')}
        `;

        this.setupReservationEvents();
    },

    renderCalendar(sessions, reservations = []) {
        const calendarContainer = document.getElementById('student-training-calendar');
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

    setupReservationEvents() {
        document.querySelectorAll('.reserve-training-btn').forEach(btn => {
            btn.addEventListener('click', () => this.reserveTraining(btn.dataset.sessionId));
        });

        document.querySelectorAll('.cancel-reservation-btn').forEach(btn => {
            btn.addEventListener('click', () => this.cancelReservation(btn.dataset.reservationId));
        });
    },

    changeMonth(direction) {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1);
        this.loadAvailableTrainings();
    },

    async reserveTraining(sessionId) {
        const user = (await supabase.auth.getUser()).data.user;
        const { error } = await supabase
            .from('training_reservations')
            .insert([{ session_id: sessionId, student_id: user.id }]);

        if (error) {
            const message = error.code === '23505'
                ? 'Você já marcou este treino.'
                : (isReservationsSchemaError(error)
                    ? getReservationsLoadMessage(error)
                    : 'Não foi possível marcar o treino. Verifique seu plano e o prazo de 24h.');
            toast.show(message, 'error');
            return;
        }

        toast.show('Treino marcado!');
        this.loadAvailableTrainings();
    },

    async cancelReservation(reservationId) {
        const { error } = await supabase
            .from('training_reservations')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
            .eq('id', reservationId);

        if (error) {
            toast.show(isReservationsSchemaError(error) ? getReservationsLoadMessage(error) : 'Não foi possível cancelar a reserva.', 'error');
            return;
        }

        toast.show('Reserva cancelada.');
        this.loadAvailableTrainings();
    },

    showScanner() {
        const scannerHtml = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div id="reader" style="width: 100%; max-width: 350px; border-radius: 12px; overflow: hidden; background: #000;"></div>
                <p style="margin-top: 20px; color: var(--dx-muted); text-align: center; font-size: 14px;">Centralize o QR Code do treino no quadrado acima.</p>
                <button id="stop-scan-btn" class="btn" style="margin-top: 24px; border: 1px solid var(--dx-border);">CANCELAR</button>
            </div>
        `;

        ui.bottomSheet.show('Escanear QR Code', scannerHtml, () => {});

        setTimeout(() => {
            this.scanner = new Html5Qrcode("reader");
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            this.scanner.start(
                { facingMode: "environment" }, 
                config,
                (decodedText) => this.handleScanSuccess(decodedText)
            ).catch(err => {
                toast.show('Erro ao acessar câmera: ' + err, 'error');
            });

            document.getElementById('stop-scan-btn').addEventListener('click', () => {
                this.stopScanner();
                const overlay = document.getElementById('sheet-overlay');
                if (overlay) overlay.classList.add('closing');
                setTimeout(() => overlay?.remove(), 300);
            });
        }, 100);
    },

    async stopScanner() {
        if (this.scanner && this.scanner.isScanning) {
            await this.scanner.stop();
        }
    },

    async handleScanSuccess(token) {
        console.log('Token lido:', token);
        await this.stopScanner();
        
        // Remover o bottom sheet imediatamente para feedback visual rápido
        const overlay = document.getElementById('sheet-overlay');
        if (overlay) overlay.remove();

        toast.show('Validando seu check-in...', 'success');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            // 1. Verificar se o aluno tem plano ativo (Regra de Negócio)
            const { data: plan, error: pError } = await supabase
                .from('student_plans')
                .select('status')
                .eq('student_id', user.id)
                .eq('status', 'active')
                .maybeSingle();

            if (!plan) {
                throw new Error('Você precisa de um plano ativo para registrar presença.');
            }

            // 2. Buscar a sessão pelo token e validar se é de hoje
            const startOfDay = new Date();
            startOfDay.setHours(0,0,0,0);
            const endOfDay = new Date();
            endOfDay.setHours(23,59,59,999);

            const { data: session, error: sError } = await supabase
                .from('training_sessions')
                .select('id, title, scheduled_at')
                .eq('qr_code_token', token)
                .gte('scheduled_at', startOfDay.toISOString())
                .lte('scheduled_at', endOfDay.toISOString())
                .single();

            if (sError || !session) {
                throw new Error('QR Code inválido ou treino não agendado para hoje.');
            }

            // 3. Registrar presença
            const { error: aError } = await supabase
                .from('attendance')
                .insert([{
                    session_id: session.id,
                    student_id: user.id,
                    method: 'qrcode'
                }]);

            if (aError) {
                if (aError.code === '23505') throw new Error('Sua presença já está confirmada neste treino!');
                throw aError;
            }

            toast.show(`Check-in realizado: ${session.title}! ⚽✅`);
            this.loadAvailableTrainings(); // Atualiza a lista
        } catch (err) {
            console.error('Erro no check-in:', err);
            toast.show(err.message, 'error');
        }
    }
};
