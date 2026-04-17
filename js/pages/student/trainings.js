import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const studentTrainings = {
    scanner: null,

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">MEUS TREINOS</h1>
                
                <div id="checkin-card" class="card card-highlight" style="margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; border-color: var(--dx-teal);">
                    <div>
                        <p style="font-weight: 700; font-size: 16px;">PRESENÇA NO TREINO</p>
                        <p style="font-size: 13px; color: var(--dx-muted);">Escanear QR Code para check-in</p>
                    </div>
                    <button id="start-scan-btn" class="btn btn-primary" style="width: auto; border-radius: 50%; width: 48px; height: 48px; padding: 0;">
                        <i class="ph-bold ph-qr-code" style="font-size: 24px;"></i>
                    </button>
                </div>

                <div id="student-trainings-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Buscando treinos...</p>
                </div>
            </div>
        `;

        this.loadAvailableTrainings();
        document.getElementById('start-scan-btn').addEventListener('click', () => this.showScanner());
    },

    async loadAvailableTrainings() {
        const listContainer = document.getElementById('student-trainings-list');
        
        // Get sessions from today onwards
        const { data: sessions, error } = await supabase
            .from('training_sessions')
            .select('*')
            .gte('scheduled_at', new Date().toISOString())
            .order('scheduled_at')
            .limit(5);

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar treinos.</p>`;
            return;
        }

        if (sessions.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhum treino agendado para hoje.</p>`;
            return;
        }

        listContainer.innerHTML = `
            <h3 style="font-size: 13px; font-weight: 600; color: var(--dx-muted); text-transform: uppercase; margin-bottom: 8px;">Agenda da Semana</h3>
            ${sessions.map(session => {
                const date = new Date(session.scheduled_at);
                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

                return `
                    <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <p style="font-weight: 600;">${session.title}</p>
                            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                                <p style="font-size: 12px; color: var(--dx-muted); display: flex; align-items: center; gap: 4px;">
                                    <i class="ph ph-calendar"></i> ${dateStr} às ${timeStr}
                                </p>
                                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}" target="_blank" style="font-size: 12px; color: var(--dx-teal); display: flex; align-items: center; gap: 4px; text-decoration: none;">
                                    <i class="ph ph-map-pin"></i> ${session.location}
                                </a>
                            </div>
                        </div>
                        <i class="ph ph-caret-right" style="color: var(--dx-border);"></i>
                    </div>
                `;
            }).join('')}
        `;
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