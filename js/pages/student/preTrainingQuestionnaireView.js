import { supabase } from '../../supabase.js';
import { escapeHtml } from '../../ui.js';
import {
    PRE_TRAINING_WELLNESS_GROUPS,
    formatPainLabel
} from './preTrainingQuestionnaire.js';

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

function formatWeight(value) {
    if (value === null || value === undefined || value === '') return 'Não informado';

    const weight = Number(value);
    if (!Number.isFinite(weight)) return 'Não informado';

    return `${weight.toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })} kg`;
}

function getRecoveryLabel(score) {
    const value = Number(score);
    if (value >= 1 && value <= 3) return 'Recuperação pobre';
    if (value >= 4 && value <= 7) return 'Recuperação razoável';
    if (value >= 8 && value <= 10) return 'Recuperação boa';
    return 'Não informado';
}

function normalizeJsonField(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value !== 'string') return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function getPainPoints(value) {
    const painPoints = normalizeJsonField(value, []);
    return Array.isArray(painPoints) ? painPoints : [];
}

function getWellnessScores(value) {
    const wellnessScores = normalizeJsonField(value, {});
    return wellnessScores && typeof wellnessScores === 'object' && !Array.isArray(wellnessScores)
        ? wellnessScores
        : {};
}

function getPainRegionLabel(point) {
    if (point?.label) return point.label;
    if (point?.region) return String(point.region).replaceAll('_', ' ');
    return 'Região não informada';
}

function getPainSideLabel(side) {
    if (side === 'frente') return 'Frente';
    if (side === 'costas') return 'Costas';
    return side || 'Lado não informado';
}

function getPainIntensity(point) {
    const intensity = Number(point?.intensity);
    return Number.isFinite(intensity) ? `${intensity}/10` : 'Não informado';
}

function getSourceLabel(source) {
    if (source === 'qrcode') return 'QR CODE';
    if (source === 'manual') return 'MANUAL';
    return 'ORIGEM NÃO INFORMADA';
}

function renderHeader({ title = 'QUESTIONÁRIO PRÉ-TREINO', backHref = '#attendance' } = {}) {
    return `
        <div class="page-header">
            <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                <a href="${backHref}" class="icon-action" aria-label="Voltar para frequência">
                    <i class="ph ph-arrow-left"></i>
                </a>
                <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400; margin: 0; overflow-wrap: anywhere;">${escapeHtml(title)}</h1>
            </div>
            <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
        </div>
    `;
}

function renderShell(content, options = {}) {
    return `
        <div class="page-container precheck-view-page">
            ${renderHeader(options)}
            ${content}
        </div>
    `;
}

function renderState({ icon, title, message, variant = '' }) {
    return `
        <div class="card precheck-view-empty ${variant}">
            <i class="ph ${icon}"></i>
            <h2>${escapeHtml(title)}</h2>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

function renderWellnessList(wellnessScores) {
    return PRE_TRAINING_WELLNESS_GROUPS.map(group => {
        const value = wellnessScores[group.key];
        const displayValue = value === null || value === undefined || value === ''
            ? 'Não informado'
            : value;

        return `
            <li>
                <span>
                    <i class="ph ${group.icon}"></i>
                    ${escapeHtml(group.label)}
                </span>
                <strong>${escapeHtml(displayValue)}</strong>
            </li>
        `;
    }).join('');
}

function renderPainList(painPoints) {
    if (!painPoints.length) {
        return '<div class="precheck-view-pain-list"><span class="badge badge-active">Sem dor</span></div>';
    }

    return `
        <ul class="precheck-view-pain-list">
            ${painPoints.map(point => `
                <li title="${escapeHtml(formatPainLabel(point))}">
                    <div>
                        <strong>${escapeHtml(getPainRegionLabel(point))}</strong>
                        <span>${escapeHtml(getPainSideLabel(point?.side))}</span>
                    </div>
                    <span class="badge badge-overdue">${escapeHtml(getPainIntensity(point))}</span>
                </li>
            `).join('')}
        </ul>
    `;
}

function renderQuestionnaire({ questionnaire, session, student }) {
    const wellnessScores = getWellnessScores(questionnaire.wellness_scores);
    const painPoints = getPainPoints(questionnaire.pain_points);
    const returnTo = new URLSearchParams(window.location.hash.split('?')[1] || '').get('returnTo');
    const backHref = returnTo === 'pre-training-questionnaires'
        ? '#pre-training-questionnaires'
        : questionnaire.student_id
        ? `#attendance?id=${encodeURIComponent(questionnaire.student_id)}`
        : '#attendance';

    return renderShell(`
        <section class="card precheck-view-meta">
            <div>
                <span class="section-label">Treino</span>
                <h2 class="brand-title">${escapeHtml(session?.title || 'Treino não informado')}</h2>
                <p><i class="ph ph-calendar"></i> ${escapeHtml(formatDateTime(session?.scheduled_at))}</p>
            </div>
            <div class="precheck-view-meta-grid">
                <div>
                    <span>Atleta</span>
                    <strong>${escapeHtml(student?.full_name || student?.email || 'Atleta não informado')}</strong>
                </div>
                <div>
                    <span>Envio</span>
                    <strong>${escapeHtml(formatDateTime(questionnaire.submitted_at || questionnaire.updated_at))}</strong>
                </div>
                <div>
                    <span>Origem</span>
                    <strong class="badge badge-active">${escapeHtml(getSourceLabel(questionnaire.source))}</strong>
                </div>
            </div>
        </section>

        <section class="card precheck-view-score">
            <div>
                <span class="section-label">Recuperação</span>
                <strong>${escapeHtml(questionnaire.recovery_score ?? '--')}</strong>
            </div>
            <p>${escapeHtml(getRecoveryLabel(questionnaire.recovery_score))}</p>
        </section>

        <section class="card">
            <div class="precheck-view-card-header">
                <div>
                    <span class="section-label">Bem-estar</span>
                    <h2 class="brand-title">RESPOSTAS DO DIA</h2>
                </div>
                <i class="ph ph-pulse"></i>
            </div>
            <ul class="precheck-view-list">
                ${renderWellnessList(wellnessScores)}
            </ul>
        </section>

        <section class="card">
            <div class="precheck-view-card-header">
                <div>
                    <span class="section-label">Dores</span>
                    <h2 class="brand-title">MAPA CORPORAL</h2>
                </div>
                <i class="ph ph-first-aid"></i>
            </div>
            ${renderPainList(painPoints)}
        </section>

        <section class="card">
            <div class="precheck-view-card-header">
                <div>
                    <span class="section-label">Peso</span>
                    <h2 class="brand-title">PESO CORPORAL</h2>
                </div>
                <i class="ph ph-barbell"></i>
            </div>
            <p class="precheck-view-weight">${escapeHtml(formatWeight(questionnaire.weight_kg))}</p>
        </section>
    `, { backHref });
}

export const preTrainingQuestionnaireView = {
    async render(questionnaireId) {
        const mainContent = document.getElementById('main-content');

        if (!questionnaireId) {
            mainContent.innerHTML = renderShell(renderState({
                icon: 'ph-warning-circle',
                title: 'Questionário não informado',
                message: 'Voltando para o histórico de presença.',
                variant: 'is-error'
            }));

            setTimeout(() => {
                if (window.location.hash.startsWith('#pre-training-questionnaire')) {
                    window.location.hash = '#attendance';
                }
            }, 900);
            return;
        }

        mainContent.innerHTML = renderShell(renderState({
            icon: 'ph-circle-notch-bold',
            title: 'Carregando questionário',
            message: 'Buscando respostas salvas do pré-treino.'
        }));

        try {
            const { data: questionnaire, error } = await supabase
                .from('pre_training_questionnaires')
                .select(`
                    id,
                    session_id,
                    student_id,
                    recovery_score,
                    wellness_scores,
                    pain_points,
                    weight_kg,
                    source,
                    submitted_at,
                    updated_at,
                    submitted_by
                `)
                .eq('id', questionnaireId)
                .maybeSingle();

            if (error) throw error;

            if (!questionnaire) {
                mainContent.innerHTML = renderShell(renderState({
                    icon: 'ph-lock-key',
                    title: 'Questionário indisponível',
                    message: 'Questionário não encontrado ou sem permissão.'
                }));
                return;
            }

            const [
                { data: session, error: sessionError },
                { data: student, error: studentError }
            ] = await Promise.all([
                questionnaire.session_id
                    ? supabase
                        .from('training_sessions')
                        .select('id, title, scheduled_at')
                        .eq('id', questionnaire.session_id)
                        .maybeSingle()
                    : { data: null, error: null },
                questionnaire.student_id
                    ? supabase
                        .from('users')
                        .select('id, full_name, email')
                        .eq('id', questionnaire.student_id)
                        .maybeSingle()
                    : { data: null, error: null }
            ]);

            if (sessionError) console.error('Erro ao carregar treino do questionário:', sessionError);
            if (studentError) console.error('Erro ao carregar atleta do questionário:', studentError);

            mainContent.innerHTML = renderQuestionnaire({
                questionnaire,
                session,
                student
            });
        } catch (error) {
            console.error('Erro ao carregar questionário pré-treino:', error);
            mainContent.innerHTML = renderShell(renderState({
                icon: 'ph-warning-circle',
                title: 'Erro ao carregar',
                message: 'Não foi possível carregar o questionário agora.',
                variant: 'is-error'
            }));
        }
    }
};
