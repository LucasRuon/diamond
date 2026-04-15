import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const studentTrainings = {
    scanner: null,

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div style="padding: 24px 20px;">
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
                            <p style="font-size: 12px; color: var(--dx-muted);">${dateStr} às ${timeStr} • ${session.location}</p>
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
        await this.stopScanner();
        const overlay = document.getElementById('sheet-overlay');
        if (overlay) overlay.remove();

        toast.show('Validando token...', 'success');

        try {
            // 1. Find session by token
            const { data: session, error: sError } = await supabase
                .from('training_sessions')
                .select('id, title')
                .eq('qr_code_token', token)
                .single();

            if (sError || !session) throw new Error('Token inválido ou expirado.');

            // 2. Register attendance
            const { error: aError } = await supabase
                .from('attendance')
                .insert([{
                    session_id: session.id,
                    student_id: (await supabase.auth.getUser()).data.user.id,
                    method: 'qrcode'
                }]);

            if (aError) {
                if (aError.code === '23505') throw new Error('Presença já registrada para este treino.');
                throw aError;
            }

            toast.show(`Presença confirmada: ${session.title}! ✅`);
        } catch (err) {
            toast.show(err.message, 'error');
        }
    }
};