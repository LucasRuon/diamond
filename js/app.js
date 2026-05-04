import { supabase } from './supabase.js';
import { auth, toast } from './auth.js';
import { ui, escapeHtml, safeUrl } from './ui.js';
import { adminUsers } from './pages/admin/users.js';
import { adminPlans } from './pages/admin/plans.js';
import { adminTrainings } from './pages/admin/trainings.js';
import { adminDashboard } from './pages/admin/dashboard.js';
import { adminCharges } from './pages/admin/charges.js';
import { adminReports } from './pages/admin/reports.js';
import { studentTrainings } from './pages/student/trainings.js';
import { studentAttendance } from './pages/student/attendance.js';
import { studentDashboard } from './pages/student/dashboard.js';
import { studentPlans } from './pages/student/plans.js';
import { responsibleStudents } from './pages/responsible/students.js';
import { responsiblePlans } from './pages/responsible/plans.js';
import { responsibleDashboard } from './pages/responsible/dashboard.js';
import { responsiblePayments } from './pages/responsible/payments.js';
import { responsibleTrainings } from './pages/responsible/trainings.js';

const app = {
    mainContent: document.getElementById('main-content'),
    bottomNav: document.getElementById('bottom-nav'),
    user: null,
    profile: null,
    loginParticlesCleanup: null,
    recoveryMode: false,

    async init() {
        this.recoveryMode = this.isRecoveryRedirect();

        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;
        
        if (this.user) await this.loadProfile();

        // Escutar mudanças de autenticação
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);
            this.user = session?.user || null;
            
            if (event === 'PASSWORD_RECOVERY') {
                this.recoveryMode = true;
                window.location.hash = '#update-password';
                this.render();
                return;
            }

            if (this.user) await this.loadProfile();
            else this.profile = null;
            this.render();
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
        try {
            const { data } = await supabase.from('users').select('*').eq('id', this.user.id).single();
            this.profile = data || {
                role: this.user.user_metadata?.role || 'student',
                full_name: this.user.user_metadata?.full_name || this.user.email
            };
        } catch (e) {
            this.profile = {
                role: this.user?.user_metadata?.role || 'student',
                full_name: this.user?.user_metadata?.full_name || this.user?.email
            };
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
        const adminRoutes = ['#users', '#reports'];
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
            case '#students': await responsibleStudents.render(); break;
            case '#plans': await this.renderPlans(); break;
            case '#payments': await this.renderPayments(); break;
            case '#users': await adminUsers.render(); break;
            case '#reports': await adminReports.render(); break;
            case '#profile': this.renderProfile(); break;
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
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
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
        if (this.profile?.role === 'admin') await adminCharges.render();
        else await responsiblePayments.render();
    },

    getRoleLabel(role) {
        const labels = { 'student': 'Atleta', 'responsible': 'Responsável', 'businessman': 'Empresário', 'admin': 'Administrador' };
        return labels[role] || role;
    },

    renderProfile() {
        const avatarUrl = this.profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.profile?.full_name)}&background=00C9A7&color=0a0a0a`;
        const currentRole = this.profile?.role || 'student';

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
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
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
                    <p style="font-family: var(--font-brand); color: var(--dx-muted); font-size: 12px;">CLUBE ATUAL</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${escapeHtml(this.profile?.current_club || 'Não informado')}</p>
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
                            <i class="ph ph-users" style="margin-right: 8px;"></i> GERENCIAR MEUS ALUNOS
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
    },

    showEditAnamneseForm() {
        const formHtml = `
            <form id="edit-anamnese-form">
                <div class="input-group">
                    <label>DATA DE NASCIMENTO</label>
                    <input type="date" name="birth_date" class="input-control" value="${escapeHtml(this.profile?.birth_date || '')}">
                </div>
                <div class="input-group">
                    <label>CLUBE ATUAL</label>
                    <input type="text" name="current_club" class="input-control" value="${escapeHtml(this.profile?.current_club || '')}" placeholder="Ex: Flamengo Sub-17">
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
                current_club: data.current_club || null,
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

            toast.show('Ficha do atleta atualizada!');
            await this.loadProfile();
            this.render();
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

            const { error } = await supabase
                .from('users')
                .update({
                    full_name: fullName,
                    cpf,
                    phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.user.id);

            if (error) {
                toast.show('Erro ao atualizar: ' + error.message, 'error');
                throw error;
            }

            await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            toast.show('Alteracoes salvas com sucesso');
            await this.loadProfile();
            this.render();
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
            { h: '#payments', i: 'ph-receipt', t: 'Cobranças' },
            { h: '#profile', i: 'ph-gear', t: 'Config' }
        ] : (role === 'responsible' || role === 'businessman' ? [
            { h: '#dashboard', i: 'ph-house', t: 'Início' },
            { h: '#students', i: 'ph-user-list', t: 'Alunos' },
            { h: '#trainings', i: 'ph-calendar', t: 'Treinos' },
            { h: '#plans', i: 'ph-receipt', t: 'Planos' },
            { h: '#payments', i: 'ph-receipt', t: 'Faturas' },
            { h: '#profile', i: 'ph-user', t: 'Perfil' }
        ] : [
            { h: '#dashboard', i: 'ph-house', t: 'Início' },
            { h: '#trainings', i: 'ph-calendar', t: 'Treinos' },
            { h: '#plans', i: 'ph-receipt', t: 'Planos' },
            { h: '#attendance', i: 'ph-check-square', t: 'Presença' },
            { h: '#profile', i: 'ph-user', t: 'Perfil' }
        ]);

        this.bottomNav.innerHTML = items.map(item => `
            <a href="${item.h}" class="nav-item ${hash === item.h ? 'active' : ''}">
                <i class="ph${hash === item.h ? '-bold' : ''} ${item.i}"></i>
                <span>${item.t}</span>
            </a>
        `).join('');
    }
};

app.init();
