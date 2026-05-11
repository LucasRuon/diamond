import { supabase } from '../../supabase.js';
import { escapeHtml, ui } from '../../ui.js';

const STEPS = ['recovery', 'wellness', 'pain', 'weight', 'review'];

export const PRE_TRAINING_WELLNESS_GROUPS = [
    {
        key: 'nutrition_hydration',
        label: 'Nutrição e hidratação',
        icon: 'ph-drop'
    },
    {
        key: 'sleep_rest',
        label: 'Sono e descanso',
        icon: 'ph-moon'
    },
    {
        key: 'emotional_support',
        label: 'Estado emocional',
        icon: 'ph-heart'
    },
    {
        key: 'active_recovery',
        label: 'Recuperação ativa',
        icon: 'ph-person-simple-walk'
    }
];

const WELLNESS_GROUPS = PRE_TRAINING_WELLNESS_GROUPS;

const BODY_REGIONS = {
    frente: [
        { region: 'cabeca', label: 'Cabeça', top: 8, left: 12.5, width: 15, height: 4 },
        { region: 'ombro_esquerdo', label: 'Ombro esquerdo', top: 24, left: 12.5, width: 15, height: 4 },
        { region: 'braco_esquerdo', label: 'Braço esquerdo', top: 34, left: 12.5, width: 15, height: 4 },
        { region: 'pubis', label: 'Púbis', top: 45, left: 12.5, width: 15, height: 4 },
        { region: 'adutor_esquerdo', label: 'Adutor esquerdo', top: 54, left: 12.5, width: 15, height: 4 },
        { region: 'anterior_coxa_esquerda', label: 'Anterior coxa esquerda', top: 62, left: 12.5, width: 20, height: 4 },
        { region: 'joelho_esquerdo', label: 'Joelho esquerdo', top: 70, left: 12.5, width: 15, height: 4 },
        { region: 'canela_esquerda', label: 'Canela esquerda', top: 78, left: 12.5, width: 15, height: 4 },
        { region: 'tornozelo_esquerdo', label: 'Tornozelo esquerdo', top: 86, left: 11.25, width: 17.5, height: 4 },
        { region: 'pe_esquerdo', label: 'Pé esquerdo', top: 90, left: 12.5, width: 15, height: 4 },
        { region: 'torax', label: 'Tórax', top: 16, left: 87.5, width: 15, height: 4 },
        { region: 'ombro_direito', label: 'Ombro direito', top: 24, left: 87.5, width: 15, height: 4 },
        { region: 'braco_direito', label: 'Braço direito', top: 34, left: 87.5, width: 15, height: 4 },
        { region: 'abdomen', label: 'Abdômen', top: 42, left: 86.25, width: 17.5, height: 4 },
        { region: 'adutor_direito', label: 'Adutor direito', top: 54, left: 87.5, width: 15, height: 4 },
        { region: 'anterior_coxa_direita', label: 'Anterior coxa direita', top: 62, left: 87.5, width: 20, height: 4 },
        { region: 'joelho_direito', label: 'Joelho direito', top: 70, left: 87.5, width: 15, height: 4 },
        { region: 'canela_direita', label: 'Canela direita', top: 78, left: 87.5, width: 15, height: 4 },
        { region: 'tornozelo_direito', label: 'Tornozelo direito', top: 86, left: 88.75, width: 17.5, height: 4 },
        { region: 'pe_direito', label: 'Pé direito', top: 90, left: 87.5, width: 15, height: 4 }
    ],
    costas: [
        { region: 'pescoco', label: 'Pescoço', top: 20, left: 12.5, width: 15, height: 4 },
        { region: 'lombar', label: 'Lombar', top: 40, left: 12.5, width: 15, height: 4 },
        { region: 'punho_esquerdo', label: 'Punho esquerdo', top: 47, left: 12.5, width: 15, height: 4 },
        { region: 'mao_esquerda', label: 'Mão esquerda', top: 56, left: 12.5, width: 15, height: 4 },
        { region: 'posterior_coxa_esquerda', label: 'Posterior coxa esquerda', top: 62, left: 12.5, width: 20, height: 4 },
        { region: 'panturrilha_esquerda', label: 'Panturrilha esquerda', top: 76, left: 12.5, width: 20, height: 4 },
        { region: 'calcanhar_esquerdo', label: 'Calcanhar esquerdo', top: 89, left: 12.5, width: 15, height: 4 },
        { region: 'costas', label: 'Costas', top: 28, left: 87.5, width: 15, height: 4 },
        { region: 'nadegas', label: 'Nádegas', top: 44, left: 87.5, width: 15, height: 4 },
        { region: 'punho_direito', label: 'Punho direito', top: 47, left: 87.5, width: 15, height: 4 },
        { region: 'mao_direita', label: 'Mão direita', top: 56, left: 87.5, width: 15, height: 4 },
        { region: 'posterior_coxa_direita', label: 'Posterior coxa direita', top: 62, left: 87.5, width: 20, height: 4 },
        { region: 'panturrilha_direita', label: 'Panturrilha direita', top: 76, left: 87.5, width: 20, height: 4 },
        { region: 'calcanhar_direito', label: 'Calcanhar direito', top: 89, left: 87.5, width: 15, height: 4 }
    ]
};

function createInitialState() {
    return {
        step: 'recovery',
        recoveryScore: null,
        wellnessScores: {},
        painPoints: [],
        painSide: 'frente',
        weightKg: null,
        error: ''
    };
}

function normalizeWeight(value) {
    if (value === '' || value === null || value === undefined) return null;
    const normalized = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(normalized)) return null;
    return Math.round(normalized * 10) / 10;
}

function painKey(point) {
    return `${point.side}:${point.region}`;
}

export function formatPainLabel(point) {
    const fallbackRegion = point?.region ? point.region.replaceAll('_', ' ') : 'Região não informada';
    return `${point?.label || fallbackRegion} (${point?.side || 'lado não informado'}) - dor ${point?.intensity ?? 'não informada'}/10`;
}

function getSessionTitle(session) {
    return session?.title || 'Treino do dia';
}

function getQuestionnaireSaveErrorMessage(error) {
    const message = error?.message || '';

    if (error?.code === 'PRECHECK_SAVE_TIMEOUT') {
        return 'O envio demorou demais. Verifique sua conexão e tente novamente.';
    }

    if (message.includes('row-level security') || error?.code === '42501') {
        return 'Não foi possível salvar o pré-treino. Confirme se o treino é de hoje e tente novamente.';
    }

    return message || 'Não foi possível salvar o questionário.';
}

function withTimeout(promise, timeoutMs, code) {
    let timeoutId;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            const error = new Error('Tempo limite excedido.');
            error.code = code;
            reject(error);
        }, timeoutMs);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export const preTrainingQuestionnaire = {
    async ensureCompleted({ session, studentId, actorId, source }) {
        if (!session?.id || !studentId || !actorId || !source) {
            throw new Error('Dados insuficientes para abrir o questionário pré-treino.');
        }

        const { data: existing, error: existingError } = await supabase
            .from('pre_training_questionnaires')
            .select('*')
            .eq('session_id', session.id)
            .eq('student_id', studentId)
            .maybeSingle();

        if (existingError) throw existingError;
        if (existing) return existing;

        return this.open({ session, studentId, actorId, source });
    },

    open({ session, studentId, actorId, source }) {
        return new Promise((resolve, reject) => {
            const existingOverlay = document.querySelector('.precheck-overlay');
            if (existingOverlay) existingOverlay.remove();

            const state = createInitialState();
            const overlay = document.createElement('div');
            overlay.className = 'precheck-overlay';
            overlay.innerHTML = `
                <div class="precheck-shell" role="dialog" aria-modal="true" aria-labelledby="precheck-title">
                    <header class="precheck-header">
                        <div>
                            <span class="section-label">Pré-treino</span>
                            <h2 id="precheck-title">${escapeHtml(getSessionTitle(session))}</h2>
                        </div>
                        <button type="button" class="icon-action precheck-close" aria-label="Fechar questionário">
                            <i class="ph ph-x"></i>
                        </button>
                    </header>
                    <div class="precheck-progress" aria-hidden="true"></div>
                    <main class="precheck-content"></main>
                    <footer class="precheck-footer">
                        <button type="button" class="btn btn-diamond precheck-back">VOLTAR</button>
                        <button type="button" class="btn btn-primary precheck-next">AVANÇAR</button>
                    </footer>
                </div>
            `;

            const close = (shouldReject = true) => {
                overlay.classList.add('closing');
                setTimeout(() => overlay.remove(), 180);
                if (shouldReject) {
                    const error = new Error('Questionário cancelado.');
                    error.code = 'PRECHECK_CANCELLED';
                    reject(error);
                }
            };

            const submit = async () => {
                const payload = {
                    session_id: session.id,
                    student_id: studentId,
                    recovery_score: state.recoveryScore,
                    wellness_scores: state.wellnessScores,
                    pain_points: state.painPoints,
                    weight_kg: state.weightKg,
                    submitted_by: actorId,
                    source
                };

                const nextButton = overlay.querySelector('.precheck-next');
                const originalText = nextButton.innerHTML;
                nextButton.disabled = true;
                nextButton.innerHTML = '<i class="ph ph-circle-notch-bold"></i> ENVIANDO...';

                try {
                    const { error } = await withTimeout(
                        supabase
                            .from('pre_training_questionnaires')
                            .upsert(payload, { onConflict: 'session_id,student_id' }),
                        12000,
                        'PRECHECK_SAVE_TIMEOUT'
                    );

                    if (error) throw error;
                    overlay.remove();
                    resolve(payload);
                } catch (error) {
                    nextButton.disabled = false;
                    nextButton.innerHTML = originalText;
                    state.error = getQuestionnaireSaveErrorMessage(error);
                    render();
                }
            };

            const validateCurrentStep = () => {
                state.error = '';

                if (state.step === 'recovery' && !state.recoveryScore) {
                    state.error = 'Selecione sua recuperação antes de continuar.';
                    return false;
                }

                if (state.step === 'wellness') {
                    const complete = WELLNESS_GROUPS.every(group => state.wellnessScores[group.key]);
                    if (!complete) {
                        state.error = 'Responda todos os itens de bem-estar.';
                        return false;
                    }
                }

                if (state.step === 'weight') {
                    const input = overlay.querySelector('[name="weightKg"]');
                    state.weightKg = normalizeWeight(input?.value);
                    if (input?.value && (state.weightKg < 20 || state.weightKg > 250)) {
                        state.error = 'Informe um peso entre 20 e 250 kg ou deixe o campo vazio.';
                        return false;
                    }
                }

                return true;
            };

            const goNext = () => {
                if (!validateCurrentStep()) {
                    render();
                    return;
                }

                const currentIndex = STEPS.indexOf(state.step);
                if (currentIndex === STEPS.length - 1) {
                    submit();
                    return;
                }

                state.step = STEPS[currentIndex + 1];
                render();
            };

            const goBack = () => {
                state.error = '';
                const currentIndex = STEPS.indexOf(state.step);
                if (currentIndex > 0) {
                    state.step = STEPS[currentIndex - 1];
                    render();
                }
            };

            const setPainIntensity = (region, side, intensity, label) => {
                const point = { region, side, label, intensity: Number(intensity) };
                const existingIndex = state.painPoints.findIndex(item => painKey(item) === painKey(point));

                if (existingIndex >= 0) {
                    state.painPoints.splice(existingIndex, 1, point);
                } else {
                    state.painPoints.push(point);
                }

                render();
            };

            const removePain = (key) => {
                state.painPoints = state.painPoints.filter(point => painKey(point) !== key);
                render();
            };

            const showPainIntensity = (region, side, label) => {
                const current = state.painPoints.find(point => point.region === region && point.side === side);
                const options = Array.from({ length: 10 }, (_, index) => index + 1).map(value => `
                    <label class="precheck-sheet-scale ${current?.intensity === value ? 'is-selected' : ''}">
                        <input type="radio" name="intensity" value="${value}" ${current?.intensity === value ? 'checked' : ''} required>
                        <span>${value}</span>
                    </label>
                `).join('');

                ui.bottomSheet.show('Intensidade da dor', `
                    <form class="precheck-sheet-form">
                        <div class="precheck-sheet-grid">${options}</div>
                        <button type="submit" class="btn btn-primary">SALVAR DOR</button>
                    </form>
                `, async (data) => {
                    setPainIntensity(region, side, data.intensity, label);
                }, { className: 'precheck-sheet-overlay' });
            };

            const renderProgress = () => {
                const currentIndex = STEPS.indexOf(state.step);
                return STEPS.map((step, index) => `
                    <span class="${index <= currentIndex ? 'is-active' : ''}" data-step="${step}"></span>
                `).join('');
            };

            const renderRecovery = () => {
                const scores = Array.from({ length: 15 }, (_, index) => index + 6);
                return `
                    <section class="precheck-step">
                        <div class="precheck-step-title">
                            <i class="ph ph-battery-charging"></i>
                            <div>
                                <h3>Recuperação</h3>
                                <p>Escolha um valor de 6 a 20 para seu estado geral antes do treino.</p>
                            </div>
                        </div>
                        <div class="precheck-option-grid precheck-option-grid--scores">
                            ${scores.map(score => `
                                <button type="button" class="precheck-scale-option ${state.recoveryScore === score ? 'is-selected' : ''}" data-recovery="${score}">
                                    ${score}
                                </button>
                            `).join('')}
                        </div>
                        <div class="precheck-scale-legend">
                            <span>Recuperação pobre</span>
                            <span>Recuperação razoável</span>
                            <span>Recuperação boa</span>
                        </div>
                    </section>
                `;
            };

            const renderWellness = () => `
                <section class="precheck-step">
                    <div class="precheck-step-title">
                        <i class="ph ph-pulse"></i>
                        <div>
                            <h3>Bem-estar</h3>
                            <p>Marque de 1 a 5 como cada área está hoje.</p>
                        </div>
                    </div>
                    <div class="precheck-wellness-list">
                        ${WELLNESS_GROUPS.map(group => `
                            <div class="precheck-wellness-group">
                                <div class="precheck-wellness-label">
                                    <i class="ph ${group.icon}"></i>
                                    <span>${group.label}</span>
                                </div>
                                <div class="precheck-option-grid precheck-option-grid--compact">
                                    ${[1, 2, 3, 4, 5].map(value => `
                                        <button type="button" class="precheck-scale-option ${state.wellnessScores[group.key] === value ? 'is-selected' : ''}" data-wellness-key="${group.key}" data-wellness-value="${value}">
                                            ${value}
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </section>
            `;

            const renderPain = () => {
                const selectedKeys = new Set(state.painPoints.map(painKey));
                const sideLabel = state.painSide === 'frente' ? 'Frente' : 'Costas';
                const figureSrc = state.painSide === 'frente' ? '/assets/pre-training/body-front.svg' : '/assets/pre-training/body-back.svg';
                const regions = BODY_REGIONS[state.painSide];

                return `
                    <section class="precheck-step">
                        <div class="precheck-step-title">
                            <i class="ph ph-first-aid"></i>
                            <div>
                                <h3>Dores corporais</h3>
                                <p>Toque em uma região se houver dor. Você pode continuar sem selecionar.</p>
                            </div>
                        </div>
                        <div class="precheck-segmented" role="group" aria-label="Vista do corpo">
                            <button type="button" class="${state.painSide === 'frente' ? 'is-active' : ''}" data-pain-side="frente">Frente</button>
                            <button type="button" class="${state.painSide === 'costas' ? 'is-active' : ''}" data-pain-side="costas">Costas</button>
                        </div>
                        <div class="precheck-body-map">
                            <div class="precheck-body-figure">
                                <img src="${figureSrc}" alt="Mapa corporal ${sideLabel.toLowerCase()}">
                                <div class="precheck-body-fallback" hidden>
                                    ${regions.map(region => `
                                        <button type="button" class="btn" data-region="${region.region}" data-region-label="${region.label}">
                                            ${region.label}
                                        </button>
                                    `).join('')}
                                </div>
                                ${regions.map(region => {
                                    const key = `${state.painSide}:${region.region}`;
                                    return `
                                        <button type="button"
                                            class="precheck-body-region ${selectedKeys.has(key) ? 'is-selected' : ''}"
                                            data-region="${region.region}"
                                            data-region-label="${region.label}"
                                            aria-label="${region.label} ${sideLabel}"
                                            style="--top:${region.top}%; --left:${region.left}%; --width:${region.width}%; --height:${region.height}%;">
                                        </button>
                                    `;
                                }).join('')}
                            </div>
                            <div class="precheck-pain-summary">
                                ${state.painPoints.length ? state.painPoints.map(point => `
                                    <button type="button" class="badge badge-active precheck-pain-pill" data-remove-pain="${painKey(point)}">
                                        ${escapeHtml(formatPainLabel(point))}
                                        <i class="ph ph-x"></i>
                                    </button>
                                `).join('') : '<span class="badge">Sem dor</span>'}
                            </div>
                        </div>
                    </section>
                `;
            };

            const renderWeight = () => `
                <section class="precheck-step">
                    <div class="precheck-step-title">
                        <i class="ph ph-barbell"></i>
                        <div>
                            <h3>Peso corporal</h3>
                            <p>Campo opcional para acompanhar variações antes dos treinos.</p>
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="precheck-weight">PESO EM KG</label>
                        <input id="precheck-weight" name="weightKg" class="input-control" type="number" min="20" max="250" step="0.1" inputmode="decimal" value="${state.weightKg ?? ''}" placeholder="Ex: 72.5">
                    </div>
                </section>
            `;

            const renderReview = () => `
                <section class="precheck-step">
                    <div class="precheck-step-title">
                        <i class="ph ph-clipboard-text"></i>
                        <div>
                            <h3>Revisão</h3>
                            <p>Confira as respostas antes de enviar.</p>
                        </div>
                    </div>
                    <div class="precheck-review-list">
                        <div><span>Recuperação</span><strong>${state.recoveryScore}</strong></div>
                        ${WELLNESS_GROUPS.map(group => `
                            <div><span>${group.label}</span><strong>${state.wellnessScores[group.key]}</strong></div>
                        `).join('')}
                        <div><span>Dores</span><strong>${state.painPoints.length ? state.painPoints.length : 'Sem dor'}</strong></div>
                        <div><span>Peso</span><strong>${state.weightKg ? `${state.weightKg} kg` : 'Não informado'}</strong></div>
                    </div>
                    ${state.painPoints.length ? `
                        <div class="precheck-review-pains">
                            ${state.painPoints.map(point => `<span class="badge badge-active">${escapeHtml(formatPainLabel(point))}</span>`).join('')}
                        </div>
                    ` : ''}
                </section>
            `;

            const renderContent = () => {
                if (state.step === 'recovery') return renderRecovery();
                if (state.step === 'wellness') return renderWellness();
                if (state.step === 'pain') return renderPain();
                if (state.step === 'weight') return renderWeight();
                return renderReview();
            };

            const bindEvents = () => {
                overlay.querySelector('.precheck-close').addEventListener('click', () => close(true));
                overlay.querySelector('.precheck-back').addEventListener('click', goBack);
                overlay.querySelector('.precheck-next').addEventListener('click', goNext);

                overlay.querySelectorAll('[data-recovery]').forEach(button => {
                    button.addEventListener('click', () => {
                        state.recoveryScore = Number(button.dataset.recovery);
                        state.error = '';
                        render();
                    });
                });

                overlay.querySelectorAll('[data-wellness-key]').forEach(button => {
                    button.addEventListener('click', () => {
                        state.wellnessScores[button.dataset.wellnessKey] = Number(button.dataset.wellnessValue);
                        state.error = '';
                        render();
                    });
                });

                overlay.querySelectorAll('[data-pain-side]').forEach(button => {
                    button.addEventListener('click', () => {
                        state.painSide = button.dataset.painSide;
                        render();
                    });
                });

                overlay.querySelectorAll('[data-region]').forEach(button => {
                    button.addEventListener('click', () => {
                        showPainIntensity(button.dataset.region, state.painSide, button.dataset.regionLabel);
                    });
                });

                overlay.querySelectorAll('[data-remove-pain]').forEach(button => {
                    button.addEventListener('click', () => removePain(button.dataset.removePain));
                });

                overlay.querySelectorAll('.precheck-body-figure img').forEach(image => {
                    image.addEventListener('error', () => {
                        const figure = image.closest('.precheck-body-figure');
                        image.hidden = true;
                        figure.querySelectorAll('.precheck-body-region').forEach(region => region.hidden = true);
                        figure.querySelector('.precheck-body-fallback').hidden = false;
                    });
                });
            };

            const render = () => {
                const content = overlay.querySelector('.precheck-content');
                const progress = overlay.querySelector('.precheck-progress');
                const backButton = overlay.querySelector('.precheck-back');
                const nextButton = overlay.querySelector('.precheck-next');
                const currentIndex = STEPS.indexOf(state.step);

                progress.innerHTML = renderProgress();
                content.innerHTML = `
                    ${state.error ? `<div class="precheck-error">${escapeHtml(state.error)}</div>` : ''}
                    ${renderContent()}
                `;
                backButton.hidden = currentIndex === 0;
                nextButton.innerHTML = currentIndex === STEPS.length - 1 ? 'ENVIAR QUESTIONÁRIO' : 'AVANÇAR';
                bindEvents();
            };

            document.body.appendChild(overlay);
            render();
            requestAnimationFrame(() => overlay.classList.add('is-open'));
        });
    }
};
