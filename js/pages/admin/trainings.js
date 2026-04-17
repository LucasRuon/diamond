import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui } from '../../ui.js';

export const adminTrainings = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">TREINOS</h1>
                    <button id="add-training-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                        <i class="ph ph-plus-circle" style="font-size: 20px;"></i>
                    </button>
                </div>

                <div id="trainings-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando agenda...</p>
                </div>
            </div>
        `;

        this.loadTrainings();
        document.getElementById('add-training-btn').addEventListener('click', () => this.showAddTrainingForm());
    },

    async loadTrainings() {
        const listContainer = document.getElementById('trainings-list');
        
        const { data: sessions, error } = await supabase
            .from('training_sessions')
            .select('*')
            .order('scheduled_at', { ascending: false });

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar treinos.</p>`;
            return;
        }

        if (sessions.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-calendar-blank" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted); font-size: 15px;">Nenhum treino agendado no momento.</p>
                    <p style="color: var(--dx-muted); font-size: 13px; margin-top: 8px;">Clique no botão "+" para criar a agenda.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = sessions.map(session => {
            const date = new Date(session.scheduled_at);
            const isPast = date < new Date();
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

            return `
                <div class="card training-card" style="border-left: 4px solid ${isPast ? 'var(--dx-border)' : 'var(--dx-teal)'}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                        <div>
                            <p style="font-size: 11px; color: ${isPast ? 'var(--dx-muted)' : 'var(--dx-teal)'}; font-weight: 700; text-transform: uppercase;">${dateStr} • ${timeStr}</p>
                            <p style="font-weight: 700; font-size: 17px;">${session.title}</p>
                            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(session.location)}" target="_blank" style="font-size: 12px; color: var(--dx-muted); display: flex; align-items: center; gap: 4px; text-decoration: none; margin-top: 4px;">
                                <i class="ph ph-map-pin"></i> ${session.location}
                            </a>
                        </div>
                        <button class="btn-qr" data-token="${session.qr_code_token}" style="color: var(--dx-teal); font-size: 20px;">
                            <i class="ph ph-qr-code"></i>
                        </button>
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-top: 16px;">
                        <button class="btn btn-attendance" data-id="${session.id}" data-title="${session.title}" style="flex: 1; padding: 10px; font-size: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border); color: var(--dx-text);">
                            <i class="ph ph-users-three" style="margin-right: 6px;"></i> PRESENÇAS
                        </button>
                        <button class="btn-delete-training" data-id="${session.id}" style="padding: 10px; color: var(--dx-danger); background: rgba(248, 113, 113, 0.1); border-radius: 8px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.setupEvents();
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

        const listContainer = document.getElementById('attendance-students-list');
        listContainer.innerHTML = students.map(s => `
            <div class="attendance-item card" data-student-id="${s.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: ${presentIds.has(s.id) ? 'var(--dx-teal-dim)' : 'var(--dx-surface2)'}; border-color: ${presentIds.has(s.id) ? 'var(--dx-teal)' : 'var(--dx-border)'}">
                <p style="font-weight: 600; font-size: 14px;">${s.full_name}</p>
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