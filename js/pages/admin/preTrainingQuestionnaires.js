import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';

function formatDateTime(value) {
    if (!value) return 'Não informado';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Não informado';

    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getSourceLabel(source) {
    if (source === 'qrcode') return 'QR CODE';
    if (source === 'manual') return 'MANUAL';
    return 'ORIGEM NÃO INFORMADA';
}

function getRecoveryLabel(score) {
    const value = Number(score);
    if (value >= 6 && value <= 10) return 'Pobre';
    if (value >= 11 && value <= 15) return 'Razoável';
    if (value >= 16 && value <= 20) return 'Boa';
    return 'Não informado';
}

function unique(values) {
    return [...new Set(values.filter(Boolean))];
}

export const adminPreTrainingQuestionnaires = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container admin-precheck-page">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400; margin: 0;">PRÉ-TREINO</h1>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>

                <div class="admin-precheck-stats">
                    <div class="card">
                        <p class="section-label">Respostas</p>
                        <strong id="admin-precheck-total">--</strong>
                    </div>
                    <div class="card">
                        <p class="section-label">QR Code</p>
                        <strong id="admin-precheck-qr">--</strong>
                    </div>
                    <div class="card">
                        <p class="section-label">Manual</p>
                        <strong id="admin-precheck-manual">--</strong>
                    </div>
                </div>

                <div class="card admin-precheck-toolbar">
                    <div>
                        <p class="section-label">Visão geral</p>
                        <h2 class="brand-title">QUESTIONÁRIOS DOS ALUNOS</h2>
                    </div>
                    <i class="ph ph-clipboard-text"></i>
                </div>

                <div id="admin-precheck-list" class="admin-precheck-list">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando questionários...</p>
                </div>
            </div>
        `;

        await this.loadQuestionnaires();
    },

    async loadQuestionnaires() {
        const listContainer = document.getElementById('admin-precheck-list');

        const { data: questionnaires, error } = await supabase
            .from('pre_training_questionnaires')
            .select('id, session_id, student_id, recovery_score, source, submitted_at, updated_at')
            .order('submitted_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Erro ao carregar questionários pré-treino:', error);
            listContainer.innerHTML = '<p style="color: var(--dx-danger); text-align: center; margin-top: 40px;">Erro ao carregar questionários.</p>';
            return;
        }

        const safeQuestionnaires = questionnaires || [];
        this.renderStats(safeQuestionnaires);

        if (!safeQuestionnaires.length) {
            listContainer.innerHTML = `
                <div class="card admin-precheck-empty">
                    <i class="ph ph-clipboard-text"></i>
                    <p>Nenhuma resposta de pré-treino encontrada.</p>
                </div>
            `;
            return;
        }

        const studentIds = unique(safeQuestionnaires.map(questionnaire => questionnaire.student_id));
        const sessionIds = unique(safeQuestionnaires.map(questionnaire => questionnaire.session_id));

        const [
            { data: students, error: studentsError },
            { data: sessions, error: sessionsError }
        ] = await Promise.all([
            studentIds.length
                ? supabase.from('users').select('id, full_name, email').in('id', studentIds)
                : { data: [], error: null },
            sessionIds.length
                ? supabase.from('training_sessions').select('id, title, scheduled_at').in('id', sessionIds)
                : { data: [], error: null }
        ]);

        if (studentsError) console.error('Erro ao carregar alunos dos questionários:', studentsError);
        if (sessionsError) console.error('Erro ao carregar treinos dos questionários:', sessionsError);

        const studentsById = new Map((students || []).map(student => [student.id, student]));
        const sessionsById = new Map((sessions || []).map(session => [session.id, session]));

        listContainer.innerHTML = safeQuestionnaires.map(questionnaire => {
            const student = studentsById.get(questionnaire.student_id);
            const session = sessionsById.get(questionnaire.session_id);
            const studentName = student?.full_name || student?.email || 'Aluno não informado';
            const sessionTitle = session?.title || 'Treino não informado';
            const submittedAt = questionnaire.submitted_at || questionnaire.updated_at;

            return `
                <div class="card admin-precheck-item">
                    <div class="admin-precheck-item-main">
                        <div>
                            <p class="admin-precheck-student">${escapeHtml(studentName)}</p>
                            <p class="admin-precheck-session">${escapeHtml(sessionTitle)}</p>
                            <p class="admin-precheck-date">${escapeHtml(formatDateTime(submittedAt))}</p>
                        </div>
                        <div class="admin-precheck-score">
                            <strong>${escapeHtml(questionnaire.recovery_score ?? '--')}</strong>
                            <span>${escapeHtml(getRecoveryLabel(questionnaire.recovery_score))}</span>
                        </div>
                    </div>
                    <div class="admin-precheck-item-actions">
                        <span class="badge badge-active">${escapeHtml(getSourceLabel(questionnaire.source))}</span>
                        <a href="#pre-training-questionnaire?id=${encodeURIComponent(questionnaire.id)}&returnTo=pre-training-questionnaires" class="btn btn-primary admin-precheck-open">
                            <i class="ph ph-eye"></i>
                            VER RESPOSTA
                        </a>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderStats(questionnaires) {
        document.getElementById('admin-precheck-total').textContent = questionnaires.length;
        document.getElementById('admin-precheck-qr').textContent = questionnaires.filter(item => item.source === 'qrcode').length;
        document.getElementById('admin-precheck-manual').textContent = questionnaires.filter(item => item.source === 'manual').length;
    }
};
