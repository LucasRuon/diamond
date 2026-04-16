import { supabase } from '../../supabase.js';

export const studentAttendance = {
    async render(targetStudentId = null) {
        const mainContent = document.getElementById('main-content');
        const { data: { user } } = await supabase.auth.getUser();
        
        // Se targetStudentId for passado (por um responsável), usamos ele. Senão, usamos o do usuário logado.
        const studentId = targetStudentId || user.id;
        
        let title = "MINHA FREQUÊNCIA";
        if (targetStudentId) {
            const { data: student } = await supabase.from('users').select('full_name').eq('id', studentId).single();
            title = `FREQUÊNCIA: ${student?.full_name.split(' ')[0].toUpperCase()}`;
        }

        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                    ${targetStudentId ? `<a href="#students" style="color: var(--dx-muted); font-size: 24px;"><i class="ph ph-arrow-left"></i></a>` : ''}
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin: 0;">${title}</h1>
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
                        <p style="font-weight: 700; font-size: 15px;">${item.session.title}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${dateStr} às ${timeStr} • ${item.method === 'qrcode' ? 'QR Code' : 'Manual'}</p>
                    </div>
                    <div style="background: var(--dx-teal-dim); color: var(--dx-teal); padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;">
                        CONFIRMADO
                    </div>
                </div>
            `;
        }).join('');
    }
};