import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';

export const adminUsers = {
    currentRoleFilter: 'all',

    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">USUÁRIOS</h1>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                        <button id="add-user-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                            <i class="ph ph-user-plus" style="font-size: 20px;"></i>
                        </button>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 8px;">
                    <button class="filter-btn active" data-role="all">Todos</button>
                    <button class="filter-btn" data-role="admin">Admins</button>
                    <button class="filter-btn" data-role="responsible">Responsáveis</button>
                    <button class="filter-btn" data-role="student">Alunos</button>
                </div>

                <div id="users-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando usuários...</p>
                </div>
            </div>
        `;

        this.loadUsers();
        this.setupFilters();
        
        document.getElementById('add-user-btn').addEventListener('click', () => {
            toast.show('Criação manual via convite em breve!', 'success');
        });
    },

    async loadUsers(roleFilter = 'all') {
        this.currentRoleFilter = roleFilter;
        const listContainer = document.getElementById('users-list');
        
        let query = supabase.from('users').select('*').order('full_name');
        
        if (roleFilter !== 'all') {
            query = query.eq('role', roleFilter);
        }

        const { data: users, error } = await query;

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar usuários: ${error.message}</p>`;
            return;
        }

        if (users.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Nenhum usuário encontrado.</p>`;
            return;
        }

        listContainer.innerHTML = users.map(user => `
            <div class="card user-item-card" data-id="${escapeHtml(user.id)}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: var(--dx-surface2); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--dx-border);">
                        <i class="ph ph-user" style="color: var(--dx-teal);"></i>
                    </div>
                    <div>
                        <p style="font-weight: 600; font-size: 15px;">${escapeHtml(user.full_name)}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${escapeHtml(user.email)}</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="badge ${this.getRoleBadgeClass(user.role)}">${escapeHtml(user.role.toUpperCase())}</span>
                    <i class="ph ph-caret-right" style="color: var(--dx-muted);"></i>
                </div>
            </div>
        `).join('');

        this.setupEditEvents(users);
    },

    getRoleBadgeClass(role) {
        switch (role) {
            case 'admin': return 'badge-active';
            case 'responsible': return 'badge-pending';
            case 'student': return 'badge-active';
            default: return '';
        }
    },

    setupFilters() {
        const filters = document.querySelectorAll('.filter-btn');
        filters.forEach(btn => {
            btn.addEventListener('click', () => {
                filters.forEach(f => f.classList.remove('active'));
                btn.classList.add('active');
                this.loadUsers(btn.dataset.role);
            });
        });
    },

    setupEditEvents(users) {
        document.querySelectorAll('.user-item-card').forEach(card => {
            card.addEventListener('click', () => {
                const userId = card.dataset.id;
                const user = users.find(u => u.id === userId);
                if (user) this.showEditUserForm(user);
            });
        });
    },

    showEditUserForm(user) {
        const formHtml = `
            <form id="edit-user-form">
                <div class="input-group">
                    <label>NOME COMPLETO</label>
                    <input type="text" name="full_name" class="input-control" value="${escapeHtml(user.full_name)}" required>
                </div>
                <div class="input-group">
                    <label>E-MAIL (APENAS LEITURA)</label>
                    <input type="email" class="input-control" value="${escapeHtml(user.email)}" disabled style="opacity: 0.6;">
                </div>
                <div class="input-group">
                    <label>PAPEL NO SISTEMA</label>
                    <select name="role" class="input-control" required>
                        <option value="student" ${user.role === 'student' ? 'selected' : ''}>Aluno</option>
                        <option value="responsible" ${user.role === 'responsible' ? 'selected' : ''}>Responsável</option>
                        <option value="businessman" ${user.role === 'businessman' ? 'selected' : ''}>Empresário</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div class="input-group">
                        <label>CPF</label>
                        <input type="text" id="edit-user-cpf" name="cpf" class="input-control" value="${escapeHtml(user.cpf || '')}" placeholder="000.000.000-00">
                    </div>
                    <div class="input-group">
                        <label>TELEFONE</label>
                        <input type="text" id="edit-user-phone" name="phone" class="input-control" value="${escapeHtml(user.phone || '')}" placeholder="(00) 00000-0000">
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">SALVAR ALTERAÇÕES</button>
            </form>
            <button id="reset-pass-btn" class="btn" style="margin-top: 12px; color: var(--dx-muted); font-size: 12px;">ENVIAR REDEFINIÇÃO DE SENHA</button>
        `;

        ui.bottomSheet.show('Editar Usuário', formHtml, async (data) => {
            const fullName = data.full_name?.trim() || '';
            const role = data.role;
            const cpf = data.cpf?.trim() || null;
            const phone = data.phone?.trim() || null;

            if (!fullName) {
                toast.show('Informe o nome completo.', 'error');
                throw new Error('Informe o nome completo.');
            }

            if (cpf && !ui.validate.cpf(cpf)) {
                toast.show('CPF Inválido.', 'error');
                throw new Error('CPF Inválido.');
            }

            const { data: responseData, error } = await supabase.functions.invoke('admin-update-user', {
                body: {
                    userId: user.id,
                    full_name: fullName,
                    role,
                    cpf,
                    phone
                }
            });

            if (error) {
                toast.show(`Erro ao atualizar usuário: ${error.message}`, 'error');
                throw error;
            }

            if (responseData?.error) {
                toast.show(`Erro ao atualizar usuário: ${responseData.error}`, 'error');
                throw new Error(responseData.error);
            }

            toast.show('Usuário atualizado com sucesso!');
            if (responseData?.metadataWarning) {
                console.warn(responseData.metadataWarning);
            }
            this.loadUsers(this.currentRoleFilter || 'all');
        });

        // Máscaras e Reset
        setTimeout(() => {
            ui.mask.apply(document.getElementById('edit-user-cpf'), 'cpf');
            ui.mask.apply(document.getElementById('edit-user-phone'), 'phone');
            
            document.getElementById('reset-pass-btn').addEventListener('click', async () => {
                try {
                    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
                    if (error) toast.show(error.message, 'error');
                    else toast.show('E-mail de redefinição enviado!');
                } catch (error) {
                    toast.show(error.message || 'Erro ao enviar redefinição de senha.', 'error');
                }
            });
        }, 100);
    }
};

// Add filter styles if not already present
if (!document.getElementById('admin-user-styles')) {
    const style = document.createElement('style');
    style.id = 'admin-user-styles';
    style.textContent = `
        .filter-btn {
            background: var(--dx-surface2);
            border: 1px solid var(--dx-border);
            color: var(--dx-muted);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .filter-btn.active {
            background: var(--dx-teal-dim);
            border-color: var(--dx-teal);
            color: var(--dx-teal);
        }
    `;
    document.head.appendChild(style);
}
