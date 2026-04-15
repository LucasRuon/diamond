import { supabase } from '../../supabase.js';

export const studentAttendance = {
    async render(targetStudentId = null) {
        const mainContent = document.getElementById('main-content');
        const currentUserId = (await supabase.auth.getUser()).data.user.id;
        const studentId = targetStudentId || currentUserId;
        
        let title = "MINHA FREQUÊNCIA";
        
        // If viewing as a responsible, get the student's name
        if (targetStudentId && targetStudentId !== currentUserId) {
            const { data: student } = await supabase
                .from('users')
                .select('full_name')
                .eq('id', studentId)
                .single();
            if (student) title = `FREQUÊNCIA: ${student.full_name.toUpperCase()}`;
        }

        mainContent.innerHTML = `
            <div style="padding: 24px 20px;">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                    ${targetStudentId ? `<a href="#students" style="color: var(--dx-muted); font-size: 24px;"><i class="ph ph-arrow-left"></i></a>` : ''}
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">${title}</h1>
                </div>
                
                <div class="card card-highlight" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
                    <div>
                        <p style="font-size: 13px; color: var(--dx-muted); font-weight: 600;">TOTAL DE PRESENÇAS</p>
                        <p id="total-presence" style="font-weight: 800; font-size: 28px; color: var(--dx-teal);">--</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-size: 13px; color: var(--dx-muted); font-weight: 600;">STATUS</p>
                        <span class="badge badge-active">REGULAR</span>
                    </div>
                </div>

                <h3 style="font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; color: var(--dx-muted);">Histórico de Treinos</h3>
                <div id="attendance-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando histórico...</p>
                </div>
            </div>
        `;

        this.loadAttendance(studentId);
    },

    async loadAttendance(studentId) {
        const container = document.getElementById('attendance-list');

        const { data: records, error } = await supabase
            .from('attendance')
            .select(`
                checked_in_at,
                method,
                session:training_sessions (title, location)
            `)
            .eq('student_id', studentId)
            .order('checked_in_at', { ascending: false });

        if (error) {
            container.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar histórico.</p>`;
            return;
        }

        document.getElementById('total-presence').textContent = records.length;

        if (records.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; margin-top: 40px;">
                    <i class="ph ph-calendar-x" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Nenhuma presença registrada ainda.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = records.map(record => {
            const date = new Date(record.checked_in_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
            const time = new Date(record.checked_in_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <p style="font-weight: 700; font-size: 15px;">${record.session.title}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${date} às ${time} • ${record.session.location}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 10px; color: var(--dx-teal); font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px;">
                            ${record.method === 'qrcode' ? 'QR CODE' : 'MANUAL'}
                        </span>
                        <i class="ph-fill ph-check-circle" style="color: var(--dx-teal); font-size: 20px;"></i>
                    </div>
                </div>
            `;
        }).join('');
    }
};