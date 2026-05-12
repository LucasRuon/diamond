import { supabase } from './supabase.js';
import { auth, toast } from './auth.js';
import { ui, escapeHtml, safeUrl } from './ui.js';
import { adminUsers } from './pages/admin/users.js';
import { adminPlans } from './pages/admin/plans.js';
import { adminTrainings } from './pages/admin/trainings.js';
import { adminDashboard } from './pages/admin/dashboard.js';
import { adminCharges } from './pages/admin/charges.js';
import { adminReports } from './pages/admin/reports.js';
import { adminPreTrainingQuestionnaires } from './pages/admin/preTrainingQuestionnaires.js';
import { adminStudentDocuments } from './pages/admin/studentDocuments.js';
import { adminClubs } from './pages/admin/clubs.js';
import { getClubLogoUrl } from './clubs.js';
import { studentTrainings } from './pages/student/trainings.js';
import { studentAttendance } from './pages/student/attendance.js';
import { studentDashboard } from './pages/student/dashboard.js';
import { studentPlans } from './pages/student/plans.js';
import { preTrainingQuestionnaireView } from './pages/student/preTrainingQuestionnaireView.js';
import { responsibleStudents } from './pages/responsible/students.js';
import { responsiblePlans } from './pages/responsible/plans.js';
import { responsibleDashboard } from './pages/responsible/dashboard.js';
import { responsiblePayments } from './pages/responsible/payments.js';
import { studentPayments } from './pages/student/payments.js';
import { responsibleTrainings } from './pages/responsible/trainings.js';
import { checkoutPage } from './pages/checkout.js';
import {
    createStudentDocumentSignedUrl,
    formatDocumentDate,
    formatDocumentSize,
    getDocumentTypeLabel,
    listStudentDocuments
} from './studentDocuments.js';

const app = {
    mainContent: document.getElementById('main-content'),
    bottomNav: document.getElementById('bottom-nav'),
    user: null,
    profile: null,
    studentProfileDocuments: [],
    loginParticlesCleanup: null,
    recoveryMode: false,

    async init() {
        this.recoveryMode = this.isRecoveryRedirect();

        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;
        
        if (this.user) await this.loadProfile();

        // Escutar mudanças de autenticação.
        // IMPORTANTE: callback NÃO pode ser async nem chamar `await supabase.*` diretamente —
        // o GoTrueClient segura um lock interno durante o callback; awaits aqui causam deadlock
        // (queries `pending` para sempre) ao voltar a aba/app ao foco. Toda chamada Supabase
        // é despachada para fora do callback via setTimeout(...,0).
        supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth Event:", event);

            const newUserId = session?.user?.id || null;
            const currentUserId = this.user?.id || null;

            if (event === 'PASSWORD_RECOVERY') {
                this.user = session?.user || null;
                this.recoveryMode = true;
                window.location.hash = '#update-password';
                setTimeout(() => this.render(), 0);
                return;
            }

            if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
                if (window.location.hash !== '#login') window.location.hash = '#login';
                setTimeout(() => this.render(), 0);
                return;
            }

            if (event === 'TOKEN_REFRESHED') {
                // Refresh falhou — sessão inválida, tratar como logout sem ficar em loading.
                if (!session) {
                    this.user = null;
                    this.profile = null;
                    if (window.location.hash !== '#login') window.location.hash = '#login';
                    setTimeout(() => {
                        try { toast.show('Sua sessão expirou. Faça login novamente.', 'error'); } catch (_) {}
                        this.render();
                    }, 0);
                    return;
                }
                // Apenas atualiza a referência em memória. Nada de loadProfile/render —
                // é o evento que dispara ao voltar a aba e era a causa do loading infinito.
                this.user = session.user;
                return;
            }

            // SIGNED_IN / INITIAL_SESSION / USER_UPDATED — só recarrega se o user.id realmente mudou.
            if (newUserId === currentUserId) {
                this.user = session?.user || this.user;
                return;
            }

            this.user = session?.user || null;
            if (!this.user) {
                this.profile = null;
                setTimeout(() => this.render(), 0);
                return;
            }

            setTimeout(async () => {
                await this.loadProfile();
                this.render();
            }, 0);
        });

        window.addEventListener('hashchange', () => this.render());
        this.render();
    },

    isRecoveryRedirect() {
        const hashParams = this.getHashParams();
        const hashQueryParams = this.getHashQueryParams();
        const searchParams = new URLSearchParams(window.location.search);
        const hashType = hashParams.get('type');
        const hashQueryType = hashQueryParams.get('type');
        const searchType = searchParams.get('type');

        return hashType === 'recovery'
            || hashQueryType === 'recovery'
            || searchType === 'recovery'
            || searchParams.get('reset-password') === '1'
            || Boolean(this.getRecoveryCode())
            || Boolean(this.getRecoveryTokenHash())
            || Boolean(this.getRecoveryTokens().access_token && this.getRecoveryTokens().refresh_token)
            || (window.location.hash.includes('access_token=') && window.location.hash.includes('type=recovery'));
    },

    getHashParams() {
        const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        return new URLSearchParams(rawHash);
    },

    getHashQueryParams() {
        const rawHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const queryIndex = rawHash.indexOf('?');
        return new URLSearchParams(queryIndex >= 0 ? rawHash.slice(queryIndex + 1) : '');
    },

    getRecoveryCode() {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = this.getHashParams();
        const hashQueryParams = this.getHashQueryParams();

        return searchParams.get('code') || hashQueryParams.get('code') || hashParams.get('code');
    },

    getRecoveryTokenHash() {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = this.getHashParams();
        const hashQueryParams = this.getHashQueryParams();

        return searchParams.get('token_hash') || hashQueryParams.get('token_hash') || hashParams.get('token_hash');
    },

    getRecoveryTokens() {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = this.getHashParams();
        const hashQueryParams = this.getHashQueryParams();

        return {
            access_token: searchParams.get('access_token') || hashQueryParams.get('access_token') || hashParams.get('access_token'),
            refresh_token: searchParams.get('refresh_token') || hashQueryParams.get('refresh_token') || hashParams.get('refresh_token')
        };
    },

    hasRecoveryCredentials() {
        const tokens = this.getRecoveryTokens();
        return Boolean(
            this.getRecoveryCode()
            || this.getRecoveryTokenHash()
            || (tokens.access_token && tokens.refresh_token)
        );
    },

    async establishRecoverySession() {
        const code = this.getRecoveryCode();
        const tokenHash = this.getRecoveryTokenHash();
        const tokens = this.getRecoveryTokens();
        console.log('Reset password credential type:', code ? 'code' : tokenHash ? 'token_hash' : tokens.access_token && tokens.refresh_token ? 'session_tokens' : 'none');

        if (tokens.access_token && tokens.refresh_token) {
            const { data, error } = await supabase.auth.setSession({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
            });

            if (error) {
                console.error('Erro ao restaurar sessão de recuperação:', error);
                return;
            }

            this.user = data.session?.user || data.user || this.user;
            window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}#update-password`);
            return;
        }

        if (tokenHash) {
            const { data, error } = await supabase.auth.verifyOtp({
                type: 'recovery',
                token_hash: tokenHash
            });

            if (error) {
                console.error('Erro ao validar token de recuperação:', error);
                return;
            }

            this.user = data.session?.user || data.user || this.user;
            window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}#update-password`);
            return;
        }

        if (!code) return;

        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error('Erro ao validar link de recuperação:', error);
            return;
        }

        this.user = data.session?.user || data.user || this.user;
        window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}#update-password`);
    },

    getCurrentRoute() {
        const rawHash = window.location.hash || '';

        if (this.recoveryMode || this.isRecoveryRedirect()) {
            return { hash: '#update-password', params: new URLSearchParams() };
        }

        const fullHash = rawHash || '#login';
        const [hash, query] = fullHash.split('?');

        return { hash, params: new URLSearchParams(query) };
    },

    async loadProfile() {
        const fallbackProfile = () => ({
            role: this.user?.user_metadata?.role || 'student',
            full_name: this.user?.user_metadata?.full_name || this.user?.email
        });

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*, club:clubs!users_club_id_fkey(id, name, logo_bucket, logo_path)')
                .eq('id', this.user.id)
                .single();
            if (error) throw error;
            this.profile = data || fallbackProfile();
        } catch (error) {
            console.warn('Erro ao carregar perfil com clube vinculado:', error);
            try {
                const { data, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', this.user.id)
                    .single();
                if (profileError) throw profileError;
                this.profile = data || fallbackProfile();
            } catch (fallbackError) {
                console.warn('Erro ao carregar perfil sem relação de clube:', fallbackError);
                this.profile = fallbackProfile();
            }
        }

        if (Array.isArray(this.profile?.club)) {
            this.profile.club = this.profile.club[0] || null;
        }
        await this.loadProfileClub();
    },

    async loadProfileClub() {
        if (!this.profile?.club_id || this.profile?.club) return;

        try {
            const { data, error } = await supabase
                .from('clubs')
                .select('id, name, logo_bucket, logo_path')
                .eq('id', this.profile.club_id)
                .is('deleted_at', null)
                .maybeSingle();
            if (error) throw error;
            if (data) this.profile.club = data;
        } catch (error) {
            console.warn('Erro ao carregar clube vinculado ao perfil:', error);
        }
    },

    async handleRegistrationSuccess(result) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const session = result?.session || currentSession;

        if (session?.user) {
            this.user = session.user;
            await this.loadProfile();
            toast.show('Conta criada com sucesso!');

            if (window.location.hash === '#dashboard') {
                await this.render();
            } else {
                window.location.hash = '#dashboard';
            }
            return;
        }

        this.user = null;
        this.profile = null;
        toast.show('Conta criada! Verifique seu e-mail ou faça login para continuar.');

        if (window.location.hash === '#login') {
            await this.render();
        } else {
            window.location.hash = '#login';
        }
    },

    async render() {
        const { hash, params } = this.getCurrentRoute();
        
        const publicRoutes = ['#login', '#register', '#forgot-password', '#update-password'];
        const authBackgroundRoutes = ['#login', '#forgot-password'];

        if (!this.user && !publicRoutes.includes(hash)) {
            window.location.hash = '#login';
            return;
        }

        if (this.user && (hash === '#login' || hash === '#register')) {
            window.location.hash = '#dashboard';
            return;
        }

        // Bloqueio de rotas por papel
        const role = this.profile?.role || 'student';
        const adminRoutes = ['#users', '#reports', '#pre-training-questionnaires', '#student-documents', '#clubs'];
        const responsibleRoutes = ['#students'];

        if (adminRoutes.includes(hash) && role !== 'admin') {
            window.location.hash = '#dashboard';
            return;
        }
        if (responsibleRoutes.includes(hash) && role !== 'responsible' && role !== 'businessman' && role !== 'admin') {
            window.location.hash = '#dashboard';
            return;
        }

        // Transição animada de página
        this.mainContent.classList.toggle('auth-screen', authBackgroundRoutes.includes(hash));
        this.mainContent.classList.add('page-exit');
        await new Promise(r => setTimeout(r, 200));
        if (hash !== '#login') this.stopLoginParticles();

        switch (hash) {
            case '#login': this.renderLogin(); break;
            case '#register': this.renderRegister(); break;
            case '#forgot-password': this.renderForgotPassword(); break;
            case '#update-password': this.renderUpdatePassword(); break;
            case '#dashboard': await this.renderDashboard(); break;
            case '#trainings': await this.renderTrainings(); break;
            case '#attendance': await studentAttendance.render(params.get('id')); break;
            case '#pre-training-questionnaire': await preTrainingQuestionnaireView.render(params.get('id')); break;
            case '#students': await responsibleStudents.render(); break;
            case '#plans': await this.renderPlans(); break;
            case '#payments': await this.renderPayments(); break;
            case '#checkout': await checkoutPage.render(params.get('sp')); break;
            case '#users': await adminUsers.render(); break;
            case '#reports': await adminReports.render(); break;
            case '#pre-training-questionnaires': await adminPreTrainingQuestionnaires.render(); break;
            case '#student-documents': await adminStudentDocuments.render(params.get('studentId')); break;
            case '#clubs': await adminClubs.render(); break;
            case '#profile': await this.loadProfile(); this.renderProfile(); break;
            default: this.mainContent.innerHTML = '<h1>404</h1>';
        }

        // Entrada animada
        this.mainContent.classList.remove('page-exit');
        this.mainContent.classList.add('page-enter');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.mainContent.classList.remove('page-enter');
            });
        });

        this.updateNav(hash);
    },

    renderLogin() {
        this.bottomNav.classList.add('hidden');
        this.stopLoginParticles();
        this.mainContent.innerHTML = `
            <div class="login-bg-wrapper">
                <div class="login-bg-image"></div>
                <div class="login-bg-overlay"></div>
                <canvas id="login-particles"></canvas>
                <div class="login-content">
                    <img src="/base_icon_transparent_background.png" alt="Logo Diamond X" class="login-logo">
                    <h1 class="login-title">DIAMOND X</h1>
                    <p class="login-subtitle">Performance & Training Center</p>
                    <form id="login-form" style="width: 100%; animation: loginTitleSlide 0.8s ease-out 0.6s both;">
                        <div class="input-group"><label>E-MAIL</label><input type="email" id="login-email" class="input-control" required></div>
                        <div class="input-group">
                            <div style="display: flex; justify-content: space-between;">
                                <label>SENHA</label>
                                <a href="#forgot-password" style="font-size: 12px; color: var(--dx-teal);">Esqueci a senha</a>
                            </div>
                            <input type="password" id="login-password" class="input-control" required>
                        </div>
                        <button type="submit" class="btn btn-diamond" style="margin-top: 16px;">ENTRAR</button>
                    </form>
                    <p style="margin-top: 24px; font-size: 14px; color: var(--dx-muted); animation: loginTitleSlide 0.8s ease-out 0.8s both;">Não tem conta? <a href="#register" style="color: var(--dx-teal); font-weight: 600;">Cadastre-se</a></p>
                </div>
            </div>
        `;

        // Partículas interativas no fundo
        this.initLoginParticles();

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await auth.login(document.getElementById('login-email').value, document.getElementById('login-password').value);
                toast.show('Bem-vindo!');
            } catch (err) { toast.show(err.message, 'error'); }
        });
    },

    initLoginParticles() {
        const canvas = document.getElementById('login-particles');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let observer;

        const resize = () => {
            canvas.width = canvas.offsetWidth || window.innerWidth;
            canvas.height = canvas.offsetHeight || window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const particles = Array.from({ length: 50 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 2 + 0.5,
            dx: (Math.random() - 0.5) * 0.4,
            dy: (Math.random() - 0.5) * 0.4,
            alpha: Math.random() * 0.5 + 0.2
        }));

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0) p.x = canvas.width;
                if (p.x > canvas.width) p.x = 0;
                if (p.y < 0) p.y = canvas.height;
                if (p.y > canvas.height) p.y = 0;

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(0, 201, 167, ${p.alpha})`;
                ctx.fill();
            });

            // Linhas entre partículas próximas
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(0, 201, 167, ${0.08 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };
        draw();

        // Limpar animação ao sair da página
        observer = new MutationObserver(() => {
            if (!document.getElementById('login-particles')) {
                this.stopLoginParticles();
            }
        });
        observer.observe(this.mainContent, { childList: true });

        this.loginParticlesCleanup = () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
            observer?.disconnect();
            this.loginParticlesCleanup = null;
        };
    },

    stopLoginParticles() {
        if (this.loginParticlesCleanup) this.loginParticlesCleanup();
    },

    renderForgotPassword() {
        this.bottomNav.classList.add('hidden');
        this.mainContent.innerHTML = `
            <div class="login-bg-wrapper forgot-access-page">
                <div class="login-bg-image"></div>
                <div class="login-bg-overlay"></div>
                <div class="forgot-access-content">
                    <a href="#login" class="forgot-back-link">
                        <i class="ph ph-caret-left"></i>
                        Login
                    </a>

                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="forgot-access-logo">
                    <p class="forgot-access-kicker">Recuperar acesso</p>
                    <h1 class="forgot-access-title">NOVA SENHA</h1>
                    <p class="forgot-access-copy">Informe o e-mail cadastrado para receber o link seguro de redefinição.</p>

                    <form id="forgot-form" class="forgot-access-form">
                        <div class="input-group">
                            <label>E-MAIL CADASTRADO</label>
                            <input type="email" id="forgot-email" class="input-control" placeholder="voce@email.com" autocomplete="email" required>
                        </div>
                        <button type="submit" class="btn btn-diamond forgot-access-submit">ENVIAR LINK</button>
                    </form>

                    <div id="forgot-success" class="forgot-success" hidden>
                        <i class="ph ph-envelope-simple"></i>
                        <div>
                            <p>Link enviado</p>
                            <span>Verifique sua caixa de entrada e o spam.</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            try {
                btn.disabled = true;
                btn.innerHTML = '<i class="ph ph-circle-notch-bold"></i> ENVIANDO...';
                const email = document.getElementById('forgot-email').value;
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}${window.location.pathname}`,
                });
                if (error) throw error;
                document.getElementById('forgot-success').hidden = false;
                toast.show('E-mail enviado! Verifique sua caixa de entrada.');
            } catch (err) {
                toast.show(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    },

    async renderUpdatePassword() {
        this.bottomNav.classList.add('hidden');
        const { data: { session } } = await supabase.auth.getSession();
        const canResetPassword = Boolean(session) || this.hasRecoveryCredentials();

        this.mainContent.innerHTML = `
            <div style="padding: 40px 20px;">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 8px;">NOVA SENHA</h1>
                ${canResetPassword ? `
                    <p style="color: var(--dx-muted); font-size: 14px; margin-bottom: 32px;">Crie uma nova senha segura para sua conta.</p>
                    <form id="update-pass-form">
                        <div class="input-group"><label>NOVA SENHA</label><input type="password" id="new-password" class="input-control" required minlength="6"></div>
                        <button type="submit" class="btn btn-primary" style="margin-top: 16px;">ATUALIZAR SENHA</button>
                    </form>
                ` : `
                    <p style="color: var(--dx-muted); font-size: 14px; margin-bottom: 24px;">Este link expirou ou já foi usado.</p>
                    <a href="#forgot-password" class="btn btn-primary" style="text-decoration: none;">ENVIAR NOVO LINK</a>
                `}
            </div>
        `;
        if (!canResetPassword) return;

        document.getElementById('update-pass-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                let { data: { session } } = await supabase.auth.getSession();
                if (!session && this.hasRecoveryCredentials()) {
                    await this.establishRecoverySession();
                    ({ data: { session } } = await supabase.auth.getSession());
                }

                if (!session) {
                    throw new Error('Link de recuperação expirado ou inválido. Solicite um novo e-mail.');
                }

                const newPassword = document.getElementById('new-password').value;
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
                this.recoveryMode = false;
                toast.show('Senha atualizada com sucesso!');
                window.location.hash = '#dashboard';
            } catch (err) { toast.show(err.message, 'error'); }
        });
    },

    renderRegister() {
        this.bottomNav.classList.add('hidden');
        this.mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">CRIAR CONTA</h1>
                <form id="register-form">
                    <div class="input-group"><label>NOME COMPLETO</label><input type="text" id="reg-name" class="input-control" required></div>
                    <div class="input-group"><label>E-MAIL</label><input type="email" id="reg-email" class="input-control" required></div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div class="input-group"><label>CPF</label><input type="text" id="reg-cpf" class="input-control" placeholder="000.000.000-00" required></div>
                        <div class="input-group"><label>TELEFONE</label><input type="text" id="reg-phone" class="input-control" placeholder="(00) 00000-0000" required></div>
                    </div>
                    <div class="input-group"><label>VOCÊ É?</label><select id="reg-role" class="input-control"><option value="student">Atleta</option><option value="responsible">Responsável</option><option value="businessman">Empresário</option></select></div>
                    <div class="input-group"><label>SENHA</label><input type="password" id="reg-password" class="input-control" required minlength="6"></div>
                    <button type="submit" class="btn btn-primary" style="margin-top: 16px;">CADASTRAR</button>
                </form>
                <p style="margin-top: 24px; text-align: center; font-size: 14px; color: var(--dx-muted);">Já tem conta? <a href="#login" style="color: var(--dx-teal); font-weight: 600;">Entrar</a></p>
            </div>
        `;

        // Aplicar máscaras
        ui.mask.apply(document.getElementById('reg-cpf'), 'cpf');
        ui.mask.apply(document.getElementById('reg-phone'), 'phone');

        document.getElementById('register-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            
            try {
                const cpf = document.getElementById('reg-cpf').value;
                if (!ui.validate.cpf(cpf)) {
                    throw new Error('CPF Inválido. Por favor, verifique.');
                }

                btn.disabled = true;
                btn.innerText = 'CRIANDO CONTA...';
                
                const email = document.getElementById('reg-email').value;
                const password = document.getElementById('reg-password').value;
                const metadata = {
                    full_name: document.getElementById('reg-name').value,
                    role: document.getElementById('reg-role').value,
                    cpf: cpf,
                    phone: document.getElementById('reg-phone').value
                };

                console.log('Iniciando registro para:', email, metadata);
                
                const result = await auth.register(email, password, metadata);
                console.log('Registro concluído:', result);

                await this.handleRegistrationSuccess(result);
            } catch (err) { 
                console.error('Erro detalhado no registro:', err);
                toast.show(err.message || 'Erro ao salvar no banco de dados', 'error'); 
            } finally {
                if (btn.isConnected) {
                    btn.disabled = false;
                    btn.innerText = originalText;
                }
            }
        });
    },

    async renderDashboard() {
        this.bottomNav.classList.remove('hidden');
        if (this.profile?.role === 'admin') {
            await adminDashboard.render();
        } else if (this.profile?.role === 'responsible' || this.profile?.role === 'businessman') {
            await responsibleDashboard.render();
        } else {
            await studentDashboard.render();
        }
    },

    async renderTrainings() {
        if (this.profile?.role === 'admin') await adminTrainings.render();
        else if (this.profile?.role === 'responsible' || this.profile?.role === 'businessman') await responsibleTrainings.render();
        else await studentTrainings.render();
    },

    async renderPlans() {
        if (this.profile?.role === 'admin') await adminPlans.render();
        else if (this.profile?.role === 'responsible' || this.profile?.role === 'businessman') await responsiblePlans.render();
        else await studentPlans.render();
    },

    async renderPayments() {
        const role = this.profile?.role;
        if (role === 'admin') await adminCharges.render();
        else if (role === 'student') await studentPayments.render();
        else await responsiblePayments.render();
    },

    getRoleLabel(role) {
        const labels = { 'student': 'Atleta', 'responsible': 'Responsável', 'businessman': 'Empresário', 'admin': 'Administrador' };
        return labels[role] || role;
    },

    renderProfile() {
        const avatarUrl = this.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.profile?.full_name)}&background=00C9A7&color=0a0a0a`;
        const currentRole = this.profile?.role || 'student';
        const profileClub = this.profile?.club;
        const profileClubLogoUrl = currentRole === 'student' ? getClubLogoUrl(profileClub) : null;

        this.mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                    <div id="avatar-container" style="position: relative; width: 64px; height: 64px;">
                        <img id="profile-avatar" src="${avatarUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--dx-teal-border);">
                        <label for="avatar-input" style="position: absolute; bottom: -2px; right: -2px; background: var(--dx-teal); width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 2px solid var(--dx-bg);">
                            <i class="ph-bold ph-camera" style="font-size: 12px; color: #000;"></i>
                        </label>
                        <input type="file" id="avatar-input" accept="image/*" style="display: none;">
                    </div>
                    <div style="flex: 1;">
                        <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400; margin: 0;">PERFIL</h1>
                        <p style="font-size: 13px; color: var(--dx-muted);">${escapeHtml(this.user?.email)}</p>
                    </div>
                    <div class="profile-header-logos">
                        <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                        ${profileClubLogoUrl ? `<img src="${safeUrl(profileClubLogoUrl)}" alt="Logo do clube ${escapeHtml(profileClub?.name || 'vinculado')}" class="profile-club-header-logo">` : ''}
                    </div>
                </div>
                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <p style="font-family: var(--font-display); color: var(--dx-muted); font-size: 12px; font-weight: 700;">DADOS PESSOAIS</p>
                        <button id="edit-profile-btn" style="color: var(--dx-teal); font-size: 13px; font-weight: 700;">EDITAR</button>
                    </div>
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">NOME</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(this.profile?.full_name)}</p>
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">E-MAIL</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(this.user?.email)}</p>
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">CPF</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(this.profile?.cpf || 'Não informado')}</p>
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">TELEFONE</p>
                    <p style="font-weight: 600;">${escapeHtml(this.profile?.phone || 'Não informado')}</p>
                </div>

                ${currentRole === 'student' ? `
                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px; font-weight: 700;">FICHA DO ATLETA</p>
                        <button id="edit-anamnese-btn" style="color: var(--dx-teal); font-size: 13px; font-weight: 700;">EDITAR</button>
                    </div>
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">DATA DE NASCIMENTO</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${this.profile?.birth_date ? new Date(this.profile.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">CLUBE VINCULADO</p>
                    ${(() => {
                        const club = this.profile?.club;
                        if (club?.name) {
                            const logoUrl = getClubLogoUrl(club);
                            return `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                                ${logoUrl ? `<img src="${safeUrl(logoUrl)}" alt="Logo" style="width: 28px; height: 28px; border-radius: 6px; object-fit: cover; border: 1px solid var(--dx-border);">` : `<i class="ph ph-shield" style="font-size: 20px; color: var(--dx-teal);"></i>`}
                                <p style="font-weight: 600;">${escapeHtml(club.name)}</p>
                            </div>`;
                        }
                        return `<p style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(this.profile?.current_club || 'Não informado')}</p>`;
                    })()}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">PESO (KG)</p>
                            <p style="font-weight: 600;">${this.profile?.weight_kg || '--'}</p>
                        </div>
                        <div>
                            <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">ALTURA (CM)</p>
                            <p style="font-weight: 600;">${this.profile?.height_cm || '--'}</p>
                        </div>
                    </div>
                    ${this.profile?.athlete_record_url ? `
                        <a href="${safeUrl(this.profile.athlete_record_url)}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 8px; color: var(--dx-teal); font-size: 13px; font-weight: 700;">
                            <i class="ph ph-file-text"></i> VER FICHA COMPLETA
                        </a>
                    ` : ''}
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                        <i class="ph ph-folder-open" style="font-size: 20px; color: var(--dx-teal);"></i>
                        <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px; font-weight: 700;">DOCUMENTOS DA FICHA</p>
                    </div>
                    <div id="student-profile-documents">
                        <p style="color: var(--dx-muted); font-size: 13px;">Carregando documentos...</p>
                    </div>
                </div>
                ` : ''}

                ${this.profile?.role === 'admin' ? `
                    <div class="card" style="margin-bottom: 24px; border-color: var(--dx-teal-border);">
                        <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">RELATÓRIOS</p>
                        <a href="#reports" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 10px;">
                            <i class="ph ph-chart-bar" style="margin-right: 8px;"></i> VER FREQUÊNCIA GERAL
                        </a>
                    </div>
                ` : ''}

                ${this.profile?.role === 'responsible' || this.profile?.role === 'businessman' ? `
                    <div class="card" style="margin-bottom: 24px; border-color: var(--dx-teal-border);">
                        <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">DEPENDENTES</p>
                        <a href="#students" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 10px;">
                            <i class="ph ph-users" style="margin-right: 8px;"></i> GERENCIAR MEUS ATLETAS
                        </a>
                    </div>
                ` : ''}

                <div class="card" style="margin-bottom: 24px; background: var(--dx-surface2);">
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px; font-weight: 400; margin-bottom: 12px;">TIPO DE CONTA</p>
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius-md); border: 1px solid var(--dx-teal); background: var(--dx-teal-dim);">
                        <i class="ph-fill ${currentRole === 'student' ? 'ph-soccer-ball' : currentRole === 'admin' ? 'ph-crown' : currentRole === 'responsible' ? 'ph-shield-check' : 'ph-briefcase'}" style="font-size: 20px; color: var(--dx-teal);"></i>
                        <span style="font-family: var(--font-brand); font-weight: 400; font-size: 16px; color: var(--dx-teal);">${this.getRoleLabel(currentRole)}</span>
                        <i class="ph-fill ph-lock-key" style="margin-left: auto; color: var(--dx-muted);"></i>
                    </div>
                    <p style="margin-top: 10px; color: var(--dx-muted); font-size: 12px; line-height: 1.4;">Apenas um administrador pode alterar o tipo de conta.</p>
                </div>

                <a href="https://diamondxperformance.com.br" target="_blank" class="card" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; text-decoration: none; border-color: var(--dx-teal-border);">
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="brand-card-logo">
                    <div>
                        <p style="font-weight: 700; color: var(--dx-text); font-size: 14px;">Site Diamond X Performance</p>
                        <p style="font-size: 12px; color: var(--dx-teal);">diamondxperformance.com.br</p>
                    </div>
                    <i class="ph ph-arrow-square-out" style="margin-left: auto; color: var(--dx-muted);"></i>
                </a>

                <button id="logout-btn" class="btn" style="border: 1px solid var(--dx-border); color: var(--dx-danger);">SAIR DA CONTA</button>
            </div>
        `;

        document.getElementById('edit-profile-btn').addEventListener('click', () => this.showEditProfileForm());
        document.getElementById('logout-btn').addEventListener('click', async () => {
            if (confirm('Deseja realmente sair do Diamond X?')) {
                await auth.logout();
                window.location.hash = '#login';
                window.location.reload();
            }
        });

        // Lógica de Upload de Avatar
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Editar anamnese (atletas)
        const editAnamneseBtn = document.getElementById('edit-anamnese-btn');
        if (editAnamneseBtn) {
            editAnamneseBtn.addEventListener('click', () => this.showEditAnamneseForm());
        }

        if (currentRole === 'student') {
            this.renderStudentProfileDocuments();
        }
    },

    async renderStudentProfileDocuments() {
        const container = document.getElementById('student-profile-documents');
        if (!container || !this.user?.id) return;

        try {
            const documents = await listStudentDocuments(this.user.id, { includeHidden: false });
            this.studentProfileDocuments = documents;

            if (documents.length === 0) {
                container.innerHTML = '<p style="color: var(--dx-muted); font-size: 13px;">Nenhum documento disponível.</p>';
                return;
            }

            container.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${documents.map((documentRecord) => `
                        <div style="display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid var(--dx-border); border-radius: var(--radius-md); background: var(--dx-surface2);">
                            <span style="width: 34px; height: 34px; border-radius: 8px; background: var(--dx-teal-dim); color: var(--dx-teal); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;">
                                <i class="ph ph-file-text"></i>
                            </span>
                            <div style="min-width: 0; flex: 1;">
                                <p style="font-weight: 800; font-size: 14px; word-break: break-word;">${escapeHtml(documentRecord.title)}</p>
                                <p style="font-size: 12px; color: var(--dx-muted); margin-top: 4px;">
                                    ${escapeHtml(getDocumentTypeLabel(documentRecord.document_type))}
                                    · ${escapeHtml(formatDocumentSize(documentRecord.file_size))}
                                </p>
                                <p style="font-size: 12px; color: var(--dx-muted); margin-top: 2px;">
                                    ${escapeHtml(formatDocumentDate(documentRecord.uploaded_at))}
                                </p>
                            </div>
                            <button type="button" class="btn student-profile-document-open" data-id="${escapeHtml(documentRecord.id)}" style="width: auto; min-width: 82px; padding: 9px 10px; font-size: 12px;">
                                <i class="ph ph-arrow-square-out"></i>
                                Abrir
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;

            container.querySelectorAll('.student-profile-document-open').forEach((button) => {
                button.addEventListener('click', () => this.openStudentProfileDocument(button.dataset.id));
            });
        } catch (error) {
            console.error(error);
            this.studentProfileDocuments = [];
            container.innerHTML = '<p style="color: var(--dx-danger); font-size: 13px;">Não foi possível carregar os documentos agora.</p>';
        }
    },

    async openStudentProfileDocument(documentId) {
        try {
            let documentRecord = this.studentProfileDocuments.find((item) => item.id === documentId);

            if (!documentRecord) {
                const documents = await listStudentDocuments(this.user.id, { includeHidden: false });
                this.studentProfileDocuments = documents;
                documentRecord = documents.find((item) => item.id === documentId);
            }

            if (!documentRecord) {
                throw new Error('Documento não encontrado.');
            }

            const signedUrl = await createStudentDocumentSignedUrl(documentRecord);
            if (!signedUrl) {
                throw new Error('URL temporária não gerada.');
            }

            const opened = window.open(signedUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                toast.show('Permita pop-ups para abrir o documento.', 'error');
            }
        } catch (error) {
            console.error(error);
            toast.show('Erro ao abrir documento.', 'error');
        }
    },

    showEditAnamneseForm() {
        const formHtml = `
            <form id="edit-anamnese-form">
                <div class="input-group">
                    <label>DATA DE NASCIMENTO</label>
                    <input type="date" name="birth_date" class="input-control" value="${escapeHtml(this.profile?.birth_date || '')}">
                </div>
                <div class="input-group">
                    <p style="font-size: 12px; color: var(--dx-muted); font-weight: 700;">CLUBE VINCULADO</p>
                    <p style="font-size: 13px; color: var(--dx-teal); font-weight: 600; margin-top: 4px;">
                        <i class="ph ph-shield" style="margin-right: 4px;"></i>
                        ${escapeHtml(this.profile?.club?.name || this.profile?.current_club || 'Nenhum clube vinculado')}
                    </p>
                    <p style="font-size: 12px; color: var(--dx-muted); line-height: 1.4; margin-top: 6px;">
                        Apenas um administrador pode vincular ou alterar o clube do atleta.
                    </p>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="input-group">
                        <label>PESO (KG)</label>
                        <input type="number" step="0.1" name="weight_kg" class="input-control" value="${this.profile?.weight_kg || ''}" placeholder="70.5">
                    </div>
                    <div class="input-group">
                        <label>ALTURA (CM)</label>
                        <input type="number" name="height_cm" class="input-control" value="${this.profile?.height_cm || ''}" placeholder="175">
                    </div>
                </div>
                <div class="input-group">
                    <label>LINK DA FICHA DO ATLETA</label>
                    <input type="url" name="athlete_record_url" class="input-control" value="${escapeHtml(this.profile?.athlete_record_url || '')}" placeholder="https://...">
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">SALVAR FICHA</button>
            </form>
        `;

        ui.bottomSheet.show('Ficha do Atleta', formHtml, async (data) => {
            const updateData = {
                birth_date: data.birth_date || null,
                weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
                height_cm: data.height_cm ? parseInt(data.height_cm) : null,
                athlete_record_url: data.athlete_record_url || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase.from('users').update(updateData).eq('id', this.user.id);
            if (error) {
                toast.show('Erro ao salvar: ' + error.message, 'error');
                throw error;
            }

            const optimisticProfile = {
                ...(this.profile || {}),
                ...updateData
            };
            this.profile = optimisticProfile;

            toast.show('Ficha do atleta atualizada!');
            this.renderProfile();
            const refreshProfile = async () => {
                await this.loadProfile();
                this.profile = {
                    ...optimisticProfile,
                    ...(this.profile || {})
                };
                this.renderProfile();
            };
            refreshProfile().catch((reloadError) => {
                console.warn('Ficha salva, mas o perfil nao foi recarregado:', reloadError);
            });
        });
    },

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            toast.show('Enviando foto...');
            const fileExt = file.name.split('.').pop();
            const fileName = `${this.user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`; // Salvando na raiz do bucket avatars

            // 1. Upload para o Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Pegar URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Atualizar tabela users
            const { error: updateError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', this.user.id);

            if (updateError) throw updateError;

            toast.show('Foto atualizada!');
            await this.loadProfile();
            this.render();
        } catch (err) {
            console.error(err);
            toast.show('Erro ao subir foto. Verifique o Bucket.', 'error');
        }
    },

    showEditProfileForm() {
        const formHtml = `
            <form id="edit-profile-form">
                <div class="input-group">
                    <label>NOME COMPLETO</label>
                    <input type="text" name="full_name" class="input-control" value="${escapeHtml(this.profile.full_name)}" required>
                </div>
                <div class="input-group">
                    <label>CPF</label>
                    <input type="text" id="edit-cpf" name="cpf" class="input-control" value="${escapeHtml(this.profile.cpf || '')}" placeholder="000.000.000-00">
                </div>
                <div class="input-group">
                    <label>TELEFONE</label>
                    <input type="text" id="edit-phone" name="phone" class="input-control" value="${escapeHtml(this.profile.phone || '')}" placeholder="(00) 00000-0000">
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">SALVAR ALTERAÇÕES</button>
            </form>
        `;

        ui.bottomSheet.show('Editar Perfil', formHtml, async (data) => {
            const fullName = data.full_name?.trim() || '';
            const cpf = data.cpf?.trim() || null;
            const phone = data.phone?.trim() || null;

            if (!fullName) {
                toast.show('Informe o nome completo.', 'error');
                throw new Error('Nome completo obrigatório.');
            }

            if (cpf && !ui.validate.cpf(cpf)) {
                toast.show('CPF invalido.', 'error');
                throw new Error('CPF invalido.');
            }

            const updateData = {
                full_name: fullName,
                cpf,
                phone,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', this.user.id);

            if (error) {
                toast.show('Erro ao atualizar: ' + error.message, 'error');
                throw error;
            }

            const optimisticProfile = {
                ...(this.profile || {}),
                ...updateData
            };
            this.profile = optimisticProfile;

            const syncAuthMetadata = async () => {
                try {
                    const { error: metadataError } = await supabase.auth.updateUser({
                        data: { full_name: fullName }
                    });
                    if (metadataError) throw metadataError;
                } catch (err) {
                    console.warn('Perfil salvo, mas metadados do Auth nao foram sincronizados:', err);
                }
            };
            void syncAuthMetadata();

            toast.show('Alteracoes salvas com sucesso');
            this.renderProfile();
            const refreshProfile = async () => {
                await this.loadProfile();
                this.profile = {
                    ...optimisticProfile,
                    ...(this.profile || {})
                };
                this.renderProfile();
            };
            refreshProfile().catch((reloadError) => {
                console.warn('Perfil salvo, mas o perfil nao foi recarregado:', reloadError);
            });
        });

        // Aplicar máscaras após injetar no DOM (via ui.bottomSheet)
        setTimeout(() => {
            ui.mask.apply(document.getElementById('edit-cpf'), 'cpf');
            ui.mask.apply(document.getElementById('edit-phone'), 'phone');
        }, 100);
        },

    updateNav(activeHash) {
        if (!this.user) return;
        if (['#login', '#register', '#forgot-password', '#update-password'].includes(activeHash)) {
            this.bottomNav.classList.add('hidden');
            return;
        }

        this.bottomNav.classList.remove('hidden');
        const role = this.profile?.role || 'student';
        const hash = activeHash || '#dashboard';
        
        console.log('Menu Role:', role);

        const items = role === 'admin' ? [
            { h: '#dashboard', i: 'ph-chart-line-up', t: 'Dash' },
            { h: '#users', i: 'ph-users', t: 'Usuários' },
            { h: '#trainings', i: 'ph-calendar', t: 'Treinos' },
            { h: '#plans', i: 'ph-clipboard-text', t: 'Planos' },
            { a: 'more', i: 'ph-dots-three', t: 'Mais' }
        ] : (role === 'responsible' || role === 'businessman' ? [
            { h: '#dashboard', i: 'ph-house', t: 'Início' },
            { h: '#students', i: 'ph-user-list', t: 'Atletas' },
            { h: '#trainings', i: 'ph-calendar', t: 'Treinos' },
            { h: '#plans', i: 'ph-receipt', t: 'Planos' },
            { h: '#payments', i: 'ph-receipt', t: 'Faturas' },
            { h: '#profile', i: 'ph-user', t: 'Perfil' }
        ] : [
            { h: '#dashboard', i: 'ph-house', t: 'Início' },
            { h: '#trainings', i: 'ph-calendar', t: 'Treinos' },
            { h: '#plans', i: 'ph-receipt', t: 'Planos' },
            { h: '#attendance', i: 'ph-check-square', t: 'Presença' },
            { a: 'more', i: 'ph-dots-three', t: 'Mais' }
        ]);

        const moreRoutes = ['#clubs', '#payments', '#profile'];
        this.bottomNav.innerHTML = items.map(item => {
            if (item.a === 'more') {
                const moreActive = moreRoutes.includes(hash);
                return `<button type="button" class="nav-item ${moreActive ? 'active' : ''}" data-action="more" aria-label="Mais opções">
                    <i class="ph${moreActive ? '-bold' : ''} ${item.i}"></i>
                    <span>${item.t}</span>
                </button>`;
            }
            const isActive = hash === item.h;
            return `<a href="${item.h}" class="nav-item ${isActive ? 'active' : ''}">
                <i class="ph${isActive ? '-bold' : ''} ${item.i}"></i>
                <span>${item.t}</span>
            </a>`;
        }).join('');
        const moreBtn = this.bottomNav.querySelector('[data-action="more"]');
        if (moreBtn) {
            moreBtn.addEventListener('click', () => this.openMoreMenu());
        }
    },

    openMoreMenu() {
        if (document.querySelector('.more-menu-overlay')) {
            this.closeMoreMenu();
            return;
        }
        const role = this.profile?.role || 'student';
        const moreItems = role === 'admin' ? [
            { h: '#clubs', i: 'ph-shield', t: 'Clubes' },
            { h: '#payments', i: 'ph-receipt', t: 'Cobranças' },
            { h: '#profile', i: 'ph-gear', t: 'Configurações' }
        ] : [
            { h: '#payments', i: 'ph-receipt', t: 'Faturas' },
            { h: '#profile', i: 'ph-gear', t: 'Configurações' }
        ];
        const overlay = document.createElement('div');
        overlay.className = 'more-menu-overlay';
        overlay.innerHTML = `
            <div class="more-menu-sheet" role="dialog" aria-label="Mais opções">
                ${moreItems.map(it => `
                    <button type="button" class="more-menu-item" data-hash="${it.h}">
                        <i class="ph ${it.i}"></i>
                        <span>${it.t}</span>
                    </button>
                `).join('')}
            </div>
        `;
        const close = () => this.closeMoreMenu();
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        overlay.querySelectorAll('.more-menu-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-hash');
                close();
                if (target) window.location.hash = target;
            });
        });
        this._moreMenuEsc = (e) => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', this._moreMenuEsc);
        document.body.appendChild(overlay);
    },

    closeMoreMenu() {
        const overlay = document.querySelector('.more-menu-overlay');
        if (overlay) overlay.remove();
        if (this._moreMenuEsc) {
            document.removeEventListener('keydown', this._moreMenuEsc);
            this._moreMenuEsc = null;
        }
    }
};

app.init();
