import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';
import { dateKey, formatMonthLabel, getMonthMatrix, getWeekdayLabels, groupByDate } from '../../calendar.js';
import { getReservationsLoadMessage, isReservationsSchemaError, getActivePlanUsage } from '../../trainingReservations.js';
import { preTrainingQuestionnaire } from './preTrainingQuestionnaire.js';

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

        const interestsQuery = supabase
            .from('session_interests')
            .select('*')
            .eq('student_id', user.id)
            .in('status', ['waiting', 'offered']);

        const [
            { data: sessions, error: sessionsError },
            { data: reservations, error: reservationsError },
            { data: activePlans },
            planUsage,
            { data: interests }
        ] = await Promise.all([sessionsQuery, reservationsQuery, activePlanQuery, getActivePlanUsage(user.id), interestsQuery]);

        // Buscar contagem de reservas por sessão (RPC pública)
        const sessionIds = (sessions || []).map(s => s.id);
        let bookedBySession = new Map();
        if (sessionIds.length) {
            const { data: counts } = await supabase.rpc('session_booked_counts', { p_session_ids: sessionIds });
            (counts || []).forEach(row => bookedBySession.set(row.session_id, row.booked));
        }

        if (sessionsError) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar treinos.</p>`;
            calendarContainer.innerHTML = '';
            return;
        }

        let safeReservations = reservations || [];
        let reservationsUnavailable = false;
        let reservationsMessage = '';

        if (reservationsError) {
            console.error('Erro ao carregar reservas do atleta:', reservationsError);
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
        const interestsBySession = new Map((interests || []).map(i => [i.session_id, i]));
        const hasActivePlan = Boolean(activePlans?.length);

        // Banner de oferta ativa (T15)
        const sessionsById = new Map((sessions || []).map(s => [s.id, s]));
        const activeOffer = (interests || []).find(i =>
            i.status === 'offered' && i.expires_at && new Date(i.expires_at) > new Date()
        );
        let offerBanner = '';
        if (activeOffer) {
            const offSession = sessionsById.get(activeOffer.session_id);
            const expiresIn = Math.max(0, Math.round((new Date(activeOffer.expires_at) - Date.now()) / 60000));
            const sessionLabel = offSession
                ? `${escapeHtml(offSession.title)} — ${new Date(offSession.scheduled_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                : 'Treino';
            offerBanner = `
                <div class="card" style="border: 2px solid var(--dx-teal); background: var(--dx-teal-dim); display: flex; flex-direction: column; gap: 12px;">
                    <div>
                        <p style="font-weight: 800; color: var(--dx-teal); font-size: 14px;">VOCÊ FOI CONVOCADO</p>
                        <p style="font-size: 14px; margin-top: 4px;">${sessionLabel}</p>
                        <p style="font-size: 12px; color: var(--dx-muted); margin-top: 4px;">
                            <i class="ph ph-clock"></i> Aceitar em até ${expiresIn} min
                        </p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-primary offer-accept-btn" data-interest-id="${escapeHtml(activeOffer.id)}" data-session-id="${escapeHtml(activeOffer.session_id)}" style="flex: 1; padding: 10px; font-size: 12px;">ACEITAR</button>
                        <button class="btn offer-decline-btn" data-interest-id="${escapeHtml(activeOffer.id)}" style="flex: 1; padding: 10px; font-size: 12px; border: 1px solid var(--dx-border); color: var(--dx-danger);">RECUSAR</button>
                    </div>
                </div>
            `;
        }

        const quotaExhausted = planUsage?.total > 0 && planUsage?.remaining <= 0;
        const quotaBadge = planUsage?.total
            ? `<div class="card" style="background: var(--dx-surface2); padding: 10px 14px; display: flex; align-items: center; gap: 8px; margin-bottom: 4px; border-color: ${planUsage.remaining <= 2 ? 'var(--dx-danger)' : 'var(--dx-border)'};">
                <i class="ph ph-ticket" style="color: ${planUsage.remaining <= 2 ? 'var(--dx-danger)' : 'var(--dx-teal)'}; font-size: 18px;"></i>
                <p style="font-size: 13px; color: ${planUsage.remaining <= 2 ? 'var(--dx-danger)' : 'var(--dx-text)'};">
                    ${planUsage.remaining <= 0 ? 'Quota esgotada' : `Restam <strong>${planUsage.remaining}</strong> de ${planUsage.total} aulas`}
                </p>
               </div>`
            : '';

        listContainer.innerHTML = `
            ${reservationsUnavailable ? `<div class="card" style="border-color: var(--dx-danger); color: var(--dx-danger); font-size: 13px;">${reservationsMessage}</div>` : ''}
            ${offerBanner}
            ${quotaBadge}
            <h3 class="section-label" style="margin-bottom: 8px;">Agenda do Mês</h3>
            ${safeSessions.map(session => {
                const date = new Date(session.scheduled_at);
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                const reservation = reservationsUnavailable ? null : reservationsBySession.get(session.id);
                const minutesUntil = (date.getTime() - Date.now()) / 60000;
                const canBook = minutesUntil >= 60;
                const canCancel = minutesUntil >= 120;
                const capacity = Number(session.capacity || 0);
                const booked = bookedBySession.get(session.id) || 0;
                const isFull = capacity > 0 && booked >= capacity;
                const canUseReservations = !reservationsUnavailable;
                const interest = interestsBySession.get(session.id) || null;
                const isWaiting = interest && interest.status === 'waiting';

                let stateLabel;
                if (reservationsUnavailable) stateLabel = 'Reservas indisponíveis';
                else if (reservation) stateLabel = 'Treino marcado';
                else if (isFull) stateLabel = 'Turma cheia';
                else if (canBook) stateLabel = 'Disponível para marcar';
                else stateLabel = 'Encerrado para marcação';

                const cancelDisabled = !canCancel;
                const cancelTitle = cancelDisabled ? 'Cancelamento bloqueado (faltam menos de 2h)' : '';

                const reserveDisabled = !canUseReservations || !canBook || !hasActivePlan || isFull;
                let reserveLabel;
                if (reservationsUnavailable) reserveLabel = 'RESERVAS INDISPONÍVEIS';
                else if (!hasActivePlan) reserveLabel = 'PLANO ATIVO NECESSÁRIO';
                else if (isFull) reserveLabel = 'TURMA CHEIA';
                else if (canBook) reserveLabel = 'MARCAR TREINO';
                else reserveLabel = 'MARCAÇÃO ENCERRADA';
                const reserveTitle = !canBook && !isFull && hasActivePlan ? 'Marcação bloqueada (faltam menos de 1h)' : '';

                // Mostrar "tenho interesse" quando: sem reserva, com plano ativo, e (turma cheia OU dentro de 1h e sem vaga ainda).
                // Conforme spec REQ-WAIT-004: sempre disponível para alunos sem reserva (sessões futuras).
                const showInterest = !reservation && hasActivePlan && canUseReservations && minutesUntil > 0;

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
                                    ${capacity > 0 ? `<p style="font-size: 11px; color: var(--dx-muted);"><i class="ph ph-users"></i> ${booked}/${capacity} vagas</p>` : ''}
                                </div>
                            </div>
                            <span class="badge ${reservation ? 'badge-active' : (isFull ? 'badge-overdue' : (canBook ? 'badge-pending' : 'badge-overdue'))}" style="height: fit-content;">${stateLabel}</span>
                        </div>
                        ${reservation ? `
                            <button class="btn cancel-reservation-btn" data-reservation-id="${escapeHtml(reservation.id)}" ${cancelDisabled ? 'disabled' : ''} title="${escapeHtml(cancelTitle)}" style="padding: 10px; font-size: 12px; border: 1px solid var(--dx-border); color: ${cancelDisabled ? 'var(--dx-muted)' : 'var(--dx-danger)'}; opacity: ${cancelDisabled ? '0.55' : '1'};">
                                CANCELAR RESERVA
                            </button>
                        ` : `
                            ${isFull || !canBook ? '' : `
                                <button class="btn reserve-training-btn" data-session-id="${escapeHtml(session.id)}" ${reserveDisabled ? 'disabled' : ''} title="${escapeHtml(reserveTitle)}" style="padding: 10px; font-size: 12px; border: 1px solid ${!reserveDisabled ? 'var(--dx-teal)' : 'var(--dx-border)'}; color: ${!reserveDisabled ? 'var(--dx-teal)' : 'var(--dx-muted)'}; opacity: ${!reserveDisabled ? '1' : '0.55'};">
                                    ${reserveLabel}
                                </button>
                            `}
                            ${isFull && hasActivePlan ? `<p style="font-size: 12px; color: var(--dx-muted); text-align: center;">${reserveLabel}</p>` : ''}
                            ${showInterest ? `
                                <button class="btn toggle-interest-btn" data-session-id="${escapeHtml(session.id)}" data-interest-id="${interest ? escapeHtml(interest.id) : ''}" data-state="${isWaiting ? 'on' : 'off'}" style="padding: 10px; font-size: 12px; border: 1px solid ${isWaiting ? 'var(--dx-teal)' : 'var(--dx-border)'}; color: ${isWaiting ? 'var(--dx-teal)' : 'var(--dx-muted)'}; background: ${isWaiting ? 'var(--dx-teal-dim)' : 'transparent'};">
                                    <i class="ph ${isWaiting ? 'ph-bell-ringing' : 'ph-bell'}" style="margin-right: 6px;"></i>
                                    ${isWaiting ? 'SAIR DA LISTA DE INTERESSE' : 'TENHO INTERESSE'}
                                </button>
                            ` : ''}
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

        document.querySelectorAll('.toggle-interest-btn').forEach(btn => {
            btn.addEventListener('click', () => this.toggleInterest(btn.dataset.sessionId, btn.dataset.interestId, btn.dataset.state));
        });

        document.querySelectorAll('.offer-accept-btn').forEach(btn => {
            btn.addEventListener('click', () => this.acceptOffer(btn.dataset.interestId, btn.dataset.sessionId));
        });

        document.querySelectorAll('.offer-decline-btn').forEach(btn => {
            btn.addEventListener('click', () => this.declineOffer(btn.dataset.interestId));
        });
    },

    changeMonth(direction) {
        this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1);
        this.loadAvailableTrainings();
    },

    async reserveTraining(sessionId) {
        const user = (await supabase.auth.getUser()).data.user;

        // Verificar quota antes de inserir
        const usage = await getActivePlanUsage(user.id);
        if (usage?.total > 0 && usage?.remaining <= 0) {
            toast.show(`Quota de aulas esgotada (${usage.used}/${usage.total}). Aguarde renovação.`, 'error');
            return;
        }
        if (usage?.total > 0 && usage?.remaining <= 2) {
            toast.show(`Atenção: restam ${usage.remaining} aulas neste plano.`);
        }

        const { error } = await supabase
            .from('training_reservations')
            .insert([{ session_id: sessionId, student_id: user.id }]);

        if (error) {
            const message = error.code === '23505'
                ? 'Você já marcou este treino.'
                : (isReservationsSchemaError(error)
                    ? getReservationsLoadMessage(error)
                    : 'Não foi possível marcar o treino. Verifique seu plano e os prazos (1h para marcar / 2h para cancelar) e se a turma não está cheia.');
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
            const msg = isReservationsSchemaError(error)
                ? getReservationsLoadMessage(error)
                : 'Cancelamento bloqueado: faltam menos de 2h para o treino.';
            toast.show(msg, 'error');
            return;
        }

        toast.show('Reserva cancelada.');
        this.loadAvailableTrainings();
    },

    async toggleInterest(sessionId, interestId, state) {
        const user = (await supabase.auth.getUser()).data.user;
        if (state === 'on' && interestId) {
            // SAIR
            const { error } = await supabase
                .from('session_interests')
                .update({ status: 'cancelled' })
                .eq('id', interestId);
            if (error) {
                toast.show('Não foi possível sair da lista. Tente novamente.', 'error');
                return;
            }
            toast.show('Você saiu da lista de interesse.');
        } else {
            // ENTRAR
            const { error } = await supabase
                .from('session_interests')
                .insert([{ session_id: sessionId, student_id: user.id, status: 'waiting' }]);
            if (error) {
                const msg = error.code === '23505'
                    ? 'Você já está na lista desta sessão.'
                    : 'Não foi possível entrar na lista. Verifique seu plano ativo.';
                toast.show(msg, 'error');
                return;
            }
            toast.show('Você entrou na lista de interesse. Avisaremos se uma vaga abrir.');
        }
        this.loadAvailableTrainings();
    },

    async acceptOffer(interestId, sessionId) {
        const user = (await supabase.auth.getUser()).data.user;
        // Cria reserva booked; trigger/RLS valida janela e capacity
        const { error: resErr } = await supabase
            .from('training_reservations')
            .insert([{ session_id: sessionId, student_id: user.id }]);
        if (resErr) {
            // Falha (oferta expirada / sem vaga). Marca como cancelled para que o ciclo siga e re-promote.
            await supabase.from('session_interests').update({ status: 'cancelled' }).eq('id', interestId);
            toast.show('Não foi possível aceitar (oferta pode ter expirado). A vaga será oferecida ao próximo.', 'error');
            this.loadAvailableTrainings();
            return;
        }
        await supabase.from('session_interests').update({ status: 'accepted' }).eq('id', interestId);
        toast.show('Vaga aceita! Treino marcado.');
        this.loadAvailableTrainings();
    },

    async declineOffer(interestId) {
        const { error } = await supabase
            .from('session_interests')
            .update({ status: 'cancelled' })
            .eq('id', interestId);
        if (error) {
            toast.show('Não foi possível recusar.', 'error');
            return;
        }
        toast.show('Oferta recusada. Vamos oferecer ao próximo da fila.');
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

    async validateQrCheckin(token, userId) {
        const { data: plan, error: planError } = await supabase
            .from('student_plans')
            .select('status')
            .eq('student_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (planError) throw planError;

        if (!plan) {
            throw new Error('Você precisa de um plano ativo para registrar presença.');
        }

        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        const endOfDay = new Date();
        endOfDay.setHours(23,59,59,999);

        const { data: session, error: sessionError } = await supabase
            .from('training_sessions')
            .select('id, title, scheduled_at')
            .eq('qr_code_token', token)
            .gte('scheduled_at', startOfDay.toISOString())
            .lte('scheduled_at', endOfDay.toISOString())
            .single();

        if (sessionError || !session) {
            throw new Error('QR Code inválido ou treino não agendado para hoje.');
        }

        return session;
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
            const session = await this.validateQrCheckin(token, user.id);

            toast.show('Responda o pré-treino para concluir o check-in.', 'success');

            await preTrainingQuestionnaire.ensureCompleted({
                session,
                studentId: user.id,
                actorId: user.id,
                source: 'qrcode'
            });

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
            if (err.code === 'PRECHECK_CANCELLED') {
                toast.show('Check-in pausado. Responda o questionário para confirmar presença.', 'error');
                return;
            }
            toast.show(err.message, 'error');
        }
    }
};
