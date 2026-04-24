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

        // Bloqueio de rotas por papel
        const role = this.profile?.role || 'student';
        const adminRoutes = ['#users', '#reports'];
        const responsibleRoutes = ['#students'];

        if (adminRoutes.includes(hash) && role !== 'admin') {
            window.location.hash = '#dashboard';
            return;
        }
        if (responsibleRoutes.includes(hash) && role !== 'responsible' && role !== 'admin') {
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
            <div style="position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
                <div style="position: absolute; inset: 0; background: url('/assets/bg-diamond.webp') center/cover no-repeat; z-index: 0;"></div>
                <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.95) 100%); z-index: 1;"></div>
                <div class="auth-container" style="position: relative; z-index: 2; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; max-width: 400px;">
                    <img src="/base_icon_transparent_background.png" alt="Logo Diamond X" style="width: 100px; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-brand); font-size: 28px; font-weight: 400; margin-bottom: 8px; color: var(--dx-teal); letter-spacing: 0.08em; white-space: nowrap;">DIAMOND X</h1>
                    <p style="font-size: 13px; color: var(--dx-muted); margin-bottom: 32px;">Performance & Training</p>
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
                    <div>
                        <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800; margin: 0;">PERFIL</h1>
                        <p style="font-size: 13px; color: var(--dx-muted);">${this.user?.email}</p>
                    </div>
                </div>
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

                ${currentRole === 'student' ? `
                <div class="card" style="margin-bottom: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">FICHA DO ATLETA</p>
                        <button id="edit-anamnese-btn" style="color: var(--dx-teal); font-size: 13px; font-weight: 700;">EDITAR</button>
                    </div>
                    <p style="color: var(--dx-muted); font-size: 12px;">DATA DE NASCIMENTO</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${this.profile?.birth_date ? new Date(this.profile.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p style="color: var(--dx-muted); font-size: 12px;">CLUBE ATUAL</p>
                    <p style="font-weight: 600; margin-bottom: 12px;">${this.profile?.current_club || 'Não informado'}</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <p style="color: var(--dx-muted); font-size: 12px;">PESO (KG)</p>
                            <p style="font-weight: 600;">${this.profile?.weight_kg || '--'}</p>
                        </div>
                        <div>
                            <p style="color: var(--dx-muted); font-size: 12px;">ALTURA (CM)</p>
                            <p style="font-weight: 600;">${this.profile?.height_cm || '--'}</p>
                        </div>
                    </div>
                    ${this.profile?.athlete_record_url ? `
                        <a href="${this.profile.athlete_record_url}" target="_blank" style="display: flex; align-items: center; gap: 8px; color: var(--dx-teal); font-size: 13px; font-weight: 700;">
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

                ${this.profile?.role === 'responsible' ? `
                    <div class="card" style="margin-bottom: 24px; border-color: var(--dx-teal-border);">
                        <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700;">DEPENDENTES</p>
                        <a href="#students" class="btn btn-primary" style="margin-top: 12px; font-size: 13px; padding: 10px;">
                            <i class="ph ph-users" style="margin-right: 8px;"></i> GERENCIAR MEUS ALUNOS
                        </a>
                    </div>
                ` : ''}

                <div class="card" style="margin-bottom: 24px; background: var(--dx-surface2);">
                    <p style="color: var(--dx-muted); font-size: 12px; font-weight: 700; margin-bottom: 12px;">TIPO DE CONTA</p>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${['student', 'responsible', 'businessman'].map(role => `
                            <label class="role-option ${currentRole === role ? 'role-active' : ''}" data-role="${role}" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: var(--radius-md); border: 1px solid ${currentRole === role ? 'var(--dx-teal)' : 'var(--dx-border)'}; background: ${currentRole === role ? 'var(--dx-teal-dim)' : 'var(--dx-surface)'}; cursor: pointer; transition: all 0.2s ease;">
                                <i class="ph ${currentRole === role ? 'ph-fill' : ''} ${role === 'student' ? 'ph-soccer-ball' : role === 'responsible' ? 'ph-shield-check' : 'ph-briefcase'}" style="font-size: 20px; color: ${currentRole === role ? 'var(--dx-teal)' : 'var(--dx-muted)'};"></i>
                                <span style="font-weight: 700; color: ${currentRole === role ? 'var(--dx-teal)' : 'var(--dx-text)'};">${this.getRoleLabel(role)}</span>
                                ${currentRole === role ? '<i class="ph-fill ph-check-circle" style="margin-left: auto; color: var(--dx-teal);"></i>' : ''}
                            </label>
                        `).join('')}
                    </div>
                </div>

                <a href="https://diamondxperformance.com.br" target="_blank" class="card" style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; text-decoration: none; border-color: var(--dx-teal-border);">
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" style="width: 32px; height: 32px;">
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

        // Seletor de tipo de conta
        document.querySelectorAll('.role-option').forEach(option => {
            option.addEventListener('click', async () => {
                const newRole = option.dataset.role;
                if (newRole === this.profile?.role) return;
                if (!confirm(`Deseja alterar seu tipo de conta para "${this.getRoleLabel(newRole)}"? Isso vai alterar suas permissões no app.`)) return;

                const { error } = await supabase.from('users').update({ role: newRole, updated_at: new Date().toISOString() }).eq('id', this.user.id);
                if (error) { toast.show('Erro ao alterar: ' + error.message, 'error'); return; }
                await supabase.auth.updateUser({ data: { role: newRole } });
                toast.show(`Conta alterada para ${this.getRoleLabel(newRole)}!`);
                await this.loadProfile();
                this.render();
            });
        });

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
                    <input type="date" name="birth_date" class="input-control" value="${this.profile?.birth_date || ''}">
                </div>
                <div class="input-group">
                    <label>CLUBE ATUAL</label>
                    <input type="text" name="current_club" class="input-control" value="${this.profile?.current_club || ''}" placeholder="Ex: Flamengo Sub-17">
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
                    <input type="url" name="athlete_record_url" class="input-control" value="${this.profile?.athlete_record_url || ''}" placeholder="https://...">
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
        
        console.log('Menu Role:', role);

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