import { supabase } from './supabase.js';
import { auth, toast } from './auth.js';
import { ui } from './ui.js';
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

const app = {
    mainContent: document.getElementById('main-content'),
    bottomNav: document.getElementById('bottom-nav'),
    user: null,
    profile: null,

    async init() {
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;
        
        if (this.user) await this.loadProfile();

        // Escutar mudanças de autenticação
        supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);
            this.user = session?.user || null;
            
            if (event === 'PASSWORD_RECOVERY') {
                window.location.hash = '#update-password';
                return;
            }

            if (this.user) await this.loadProfile();
            else this.profile = null;
            this.render();
        });

        window.addEventListener('hashchange', () => this.render());
        this.render();
    },

    async loadProfile() {
        try {
            const { data } = await supabase.from('users').select('*').eq('id', this.user.id).single();
            this.profile = data || {
                role: this.user.user_metadata?.role || 'student',
                full_name: this.user.user_metadata?.full_name || this.user.email
            };
        } catch (e) {
            this.profile = { role: 'student', full_name: this.user.email };
        }
    },

    async render() {
        const fullHash = window.location.hash || '#login';
        const [hash, query] = fullHash.split('?');
        const params = new URLSearchParams(query);
        
        const publicRoutes = ['#login', '#register', '#forgot-password', '#update-password'];

        if (!this.user && !publicRoutes.includes(hash)) {
            window.location.hash = '#login';
            return;
        }

        if (this.user && (hash === '#login' || hash === '#register')) {
            window.location.hash = '#dashboard';
            return;
        }

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

        this.updateNav(hash);
    },

    renderLogin() {
        this.bottomNav.classList.add('hidden');
        this.mainContent.innerHTML = `
            <div class="auth-container" style="padding: 40px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh;">
                <img src="/assets/icons/icon-192.png" alt="Logo" style="width: 80px; margin-bottom: 32px;">
                <h1 style="font-family: var(--font-display); font-size: 32px; font-weight: 800; margin-bottom: 8px; color: var(--dx-teal);">DIAMOND X</h1>
                <form id="login-form" style="width: 100%;">
                    <div class="input-group"><label>E-MAIL</label><input type="email" id="login-email" class="input-control" required></div>
                    <div class="input-group">
                        <div style="display: flex; justify-content: space-between;">
                            <label>SENHA</label>
                            <a href="#forgot-password" style="font-size: 12px; color: var(--dx-teal);">Esqueci a senha</a>
                        </div>
                        <input type="password" id="login-password" class="input-control" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="margin-top: 16px;">ENTRAR</button>
                </form>
                <p style="margin-top: 24px; font-size: 14px; color: var(--dx-muted);">Não tem conta? <a href="#register" style="color: var(--dx-teal); font-weight: 600;">Cadastre-se</a></p>
            </div>
        `;
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await auth.login(document.getElementById('login-email').value, document.getElementById('login-password').value);
                toast.show('Bem-vindo!');
            } catch (err) { toast.show(err.message, 'error'); }
        });
    },

    renderForgotPassword() {
        this.bottomNav.classList.add('hidden');
        this.mainContent.innerHTML = `
            <div style="padding: 40px 20px;">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 8px;">RECUPERAR ACESSO</h1>
                <p style="color: var(--dx-muted); font-size: 14px; margin-bottom: 32px;">Insira seu e-mail para receber um link de redefinição de senha.</p>
                <form id="forgot-form">
                    <div class="input-group"><label>E-MAIL CADASTRADO</label><input type="email" id="forgot-email" class="input-control" required></div>
                    <button type="submit" class="btn btn-primary" style="margin-top: 16px;">ENVIAR LINK</button>
                </form>
                <p style="margin-top: 24px; text-align: center;"><a href="#login" style="color: var(--dx-muted); font-size: 14px;">Voltar para o Login</a></p>
            </div>
        `;
        document.getElementById('forgot-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const email = document.getElementById('forgot-email').value;
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/#update-password',
                });
                if (error) throw error;
                toast.show('E-mail enviado! Verifique sua caixa de entrada.');
            } catch (err) { toast.show(err.message, 'error'); }
        });
    },

    renderUpdatePassword() {
        this.bottomNav.classList.add('hidden');
        this.mainContent.innerHTML = `
            <div style="padding: 40px 20px;">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 8px;">NOVA SENHA</h1>
                <p style="color: var(--dx-muted); font-size: 14px; margin-bottom: 32px;">Crie uma nova senha segura para sua conta.</p>
                <form id="update-pass-form">
                    <div class="input-group"><label>NOVA SENHA</label><input type="password" id="new-password" class="input-control" required minlength="6"></div>
                    <button type="submit" class="btn btn-primary" style="margin-top: 16px;">ATUALIZAR SENHA</button>
                </form>
            </div>
        `;
        document.getElementById('update-pass-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const newPassword = document.getElementById('new-password').value;
                const { error } = await supabase.auth.updateUser({ password: newPassword });
                if (error) throw error;
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
                    <div class="input-group"><label>VOCÊ É?</label><select id="reg-role" class="input-control"><option value="student">Aluno</option><option value="responsible">Responsável</option></select></div>
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
            const btn = e.target.querySelector('button');
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

                toast.show('Conta criada! Por favor, faça login.');
                window.location.hash = '#login';
            } catch (err) { 
                console.error('Erro detalhado no registro:', err);
                toast.show(err.message || 'Erro ao salvar no banco de dados', 'error'); 
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        });
    },

    async renderDashboard() {
        this.bottomNav.classList.remove('hidden');
        if (this.profile?.role === 'admin') {
            await adminDashboard.render();
        } else if (this.profile?.role === 'responsible') {
            await responsibleDashboard.render();
        } else {
            await studentDashboard.render();
        }
    },

    async renderTrainings() {
        if (this.profile?.role === 'admin') await adminTrainings.render();
        else await studentTrainings.render();
    },

    async renderPlans() {
        if (this.profile?.role === 'admin') await adminPlans.render();
        else if (this.profile?.role === 'responsible') await responsiblePlans.render();
        else await studentPlans.render();
    },

    async renderPayments() {
        if (this.profile?.role === 'admin') await adminCharges.render();
        else await responsiblePayments.render();
    },

    renderProfile() {
        this.mainContent.innerHTML = `
            <div class="page-container">
                <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin-bottom: 24px;">PERFIL</h1>
                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">DADOS PESSOAIS</p>
                        <button id="edit-profile-btn" style="color: var(--dx-teal); font-size: 13px; font-weight: 700;">EDITAR</button>
                    </div>
                    <p style="color: var(--dx-muted); font-size: 12px;">NOME</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${this.profile?.full_name}</p>
                    <p style="color: var(--dx-muted); font-size: 12px;">E-MAIL</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${this.user?.email}</p>
                    <p style="color: var(--dx-muted); font-size: 12px;">CPF</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${this.profile?.cpf || 'Não informado'}</p>
                    <p style="color: var(--dx-muted); font-size: 12px;">TELEFONE</p>
                    <p style="font-weight: 600;">${this.profile?.phone || 'Não informado'}</p>
                </div>
                
                ${this.profile?.role === 'admin' ? `
                    <div class="card" style="margin-bottom: 24px; border-color: var(--dx-teal-border);">
                        <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">RELATÓRIOS</p>
                        <a href="#reports" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 10px;">
                            <i class="ph ph-chart-bar" style="margin-right: 8px;"></i> VER FREQUÊNCIA GERAL
                        </a>
                    </div>
                ` : ''}

                <div class="card" style="margin-bottom: 32px; background: var(--dx-surface2);">
                    <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">TIPO DE CONTA</p>
                    <p style="font-weight: 700; color: var(--dx-teal); text-transform: uppercase; margin-top: 4px;">${this.profile?.role}</p>
                </div>

                <button id="logout-btn" class="btn" style="border: 1px solid var(--dx-border); color: var(--dx-danger);">SAIR DA CONTA</button>
            </div>
        `;

        document.getElementById('edit-profile-btn').addEventListener('click', () => this.showEditProfileForm());
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await auth.logout();
            window.location.hash = '#login';
            window.location.reload(); // Garante limpeza total do estado
        });
    },

    showEditProfileForm() {
        const formHtml = `
            <form id="edit-profile-form">
                <div class="input-group">
                    <label>NOME COMPLETO</label>
                    <input type="text" name="full_name" class="input-control" value="${this.profile.full_name}" required>
                </div>
                <div class="input-group">
                    <label>CPF</label>
                    <input type="text" id="edit-cpf" name="cpf" class="input-control" value="${this.profile.cpf || ''}" placeholder="000.000.000-00">
                </div>
                <div class="input-group">
                    <label>TELEFONE</label>
                    <input type="text" id="edit-phone" name="phone" class="input-control" value="${this.profile.phone || ''}" placeholder="(00) 00000-0000">
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">SALVAR ALTERAÇÕES</button>
            </form>
        `;

        ui.bottomSheet.show('Editar Perfil', formHtml, async (data) => {
            if (data.cpf && !ui.validate.cpf(data.cpf)) {
                throw new Error('CPF Inválido.');
            }

            const { error } = await supabase
                .from('users')
                .update({
                    full_name: data.full_name,
                    cpf: data.cpf,
                    phone: data.phone,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.user.id);

            if (error) {
                toast.show('Erro ao atualizar: ' + error.message, 'error');
                throw error;
            }

            await supabase.auth.updateUser({
                data: { full_name: data.full_name }
            });

            toast.show('Perfil atualizado!');
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
        this.bottomNav.classList.remove('hidden');
        const role = this.profile?.role || 'student';
        const hash = activeHash || '#dashboard';

        const items = role === 'admin' ? [
            { h: '#dashboard', i: 'ph-chart-line-up', t: 'Dash' },
            { h: '#users', i: 'ph-users', t: 'Usuários' },
            { h: '#trainings', i: 'ph-calendar', t: 'Treinos' },
            { h: '#plans', i: 'ph-clipboard-text', t: 'Planos' },
            { h: '#payments', i: 'ph-receipt', t: 'Cobranças' },
            { h: '#profile', i: 'ph-gear', t: 'Config' }
        ] : (role === 'responsible' ? [
            { h: '#dashboard', i: 'ph-house', t: 'Início' },
            { h: '#students', i: 'ph-user-list', t: 'Alunos' },
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