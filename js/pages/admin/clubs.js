import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml, safeUrl } from '../../ui.js';
import {
    validateClubLogoFile,
    getClubLogoUrl,
    uploadClubLogo,
    softDeleteClub
} from '../../clubs.js';

export const adminClubs = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <a href="#dashboard" style="color: var(--dx-teal); font-size: 13px; font-weight: 700; text-decoration: none; display: flex; align-items: center; gap: 4px;">
                        <i class="ph ph-caret-left"></i> Voltar
                    </a>
                    <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">CLUBES</h1>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                        <button id="add-club-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                            <i class="ph ph-plus-circle" style="font-size: 20px;"></i>
                        </button>
                    </div>
                </div>

                <div id="clubs-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Carregando clubes...</p>
                </div>
            </div>
        `;

        await this.loadClubs();
        document.getElementById('add-club-btn').addEventListener('click', () => this.showClubForm());
    },

    async loadClubs() {
        const listContainer = document.getElementById('clubs-list');
        if (!listContainer) return;

        const { data: clubs, error } = await supabase
            .from('clubs')
            .select('id, name, logo_bucket, logo_path, created_at')
            .is('deleted_at', null)
            .order('name');

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar clubes.</p>`;
            return;
        }

        if (!clubs || clubs.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px; padding: 20px;">
                    <i class="ph ph-shield" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Nenhum clube cadastrado.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = clubs.map(club => {
            const logoUrl = getClubLogoUrl(club);
            return `
                <div class="card club-card" data-id="${escapeHtml(club.id)}">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="club-logo-preview" style="width: 48px; height: 48px; border-radius: 10px; background: var(--dx-surface2); border: 1px solid var(--dx-border); display: flex; align-items: center; justify-content: center; flex: 0 0 auto; overflow: hidden;">
                            ${logoUrl
                                ? `<img src="${safeUrl(logoUrl)}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover;">`
                                : `<i class="ph ph-shield" style="font-size: 24px; color: var(--dx-muted);"></i>`
                            }
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <p style="font-weight: 700; font-size: 15px;">${escapeHtml(club.name)}</p>
                            <p style="font-size: 12px; color: var(--dx-muted);">Cadastrado em ${new Date(club.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                    </div>
                    <div class="club-actions" style="display: flex; gap: 8px; margin-top: 12px;">
                        <button class="btn btn-diamond edit-club-btn" data-id="${escapeHtml(club.id)}" style="flex: 1; padding: 10px; font-size: 12px;">
                            <i class="ph ph-pencil-simple" style="margin-right: 6px;"></i> EDITAR
                        </button>
                        <button class="btn delete-club-btn" data-id="${escapeHtml(club.id)}" style="padding: 10px; color: var(--dx-danger); background: rgba(248,113,113,0.1); border-radius: 8px;">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.setupEvents(clubs);
    },

    setupEvents(clubs) {
        document.querySelectorAll('.edit-club-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const club = clubs.find(c => c.id === btn.dataset.id);
                if (club) this.showClubForm(club);
            });
        });

        document.querySelectorAll('.delete-club-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const club = clubs.find(c => c.id === btn.dataset.id);
                if (!club) return;
                if (!confirm(`Deseja remover o clube "${club.name}"? Esta ação pode ser revertida manualmente.`)) return;
                try {
                    await softDeleteClub(club.id);
                    toast.show('Clube removido.');
                    await this.loadClubs();
                } catch (err) {
                    toast.show('Erro ao remover clube: ' + err.message, 'error');
                }
            });
        });
    },

    showClubForm(club = null) {
        const logoUrl = club ? getClubLogoUrl(club) : null;
        const formHtml = `
            <form id="club-form">
                <div class="input-group">
                    <label>NOME DO CLUBE</label>
                    <input type="text" name="name" class="input-control" value="${escapeHtml(club?.name || '')}" required placeholder="Ex: Flamengo Sub-17">
                </div>
                <div class="input-group">
                    <label>LOGO DO CLUBE</label>
                    ${logoUrl ? `
                        <div style="margin-bottom: 8px; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; border: 1px solid var(--dx-border);">
                            <img id="club-logo-current" src="${safeUrl(logoUrl)}" alt="Logo atual" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                    ` : ''}
                    <input type="file" id="club-logo-file" name="logo_file" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="input-control" style="padding: 8px;">
                    <p id="club-logo-error" style="color: var(--dx-danger); font-size: 12px; display: none;"></p>
                    <p style="font-size: 11px; color: var(--dx-muted); margin-top: 4px;">PNG, JPG, WebP ou SVG • Máx. 2 MB</p>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">${club ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR CLUBE'}</button>
            </form>
        `;

        ui.bottomSheet.show(club ? 'Editar Clube' : 'Novo Clube', formHtml, async (data) => {
            const name = data.name?.trim();
            if (!name) {
                toast.show('Informe o nome do clube.', 'error');
                throw new Error('Nome obrigatório.');
            }

            const fileInput = document.getElementById('club-logo-file');
            const file = fileInput?.files?.[0] || null;

            if (file) {
                const validationError = validateClubLogoFile(file);
                if (validationError) {
                    toast.show(validationError, 'error');
                    throw new Error(validationError);
                }
            }

            if (club) {
                const { error: updateError } = await supabase
                    .from('clubs')
                    .update({ name, updated_at: new Date().toISOString() })
                    .eq('id', club.id);
                if (updateError) throw updateError;

                if (file) {
                    const { logo_bucket, logo_path } = await uploadClubLogo({ clubId: club.id, file });
                    await supabase.from('clubs').update({ logo_bucket, logo_path }).eq('id', club.id);
                }

                toast.show('Clube atualizado!');
            } else {
                const { data: newClub, error: insertError } = await supabase
                    .from('clubs')
                    .insert({ name, created_by: (await supabase.auth.getUser()).data.user?.id })
                    .select('id')
                    .single();
                if (insertError) throw insertError;

                if (file) {
                    const { logo_bucket, logo_path } = await uploadClubLogo({ clubId: newClub.id, file });
                    await supabase.from('clubs').update({ logo_bucket, logo_path }).eq('id', newClub.id);
                }

                toast.show('Clube cadastrado!');
            }

            await this.loadClubs();
        });

        setTimeout(() => {
            const fileInput = document.getElementById('club-logo-file');
            const errorEl = document.getElementById('club-logo-error');
            if (fileInput && errorEl) {
                fileInput.addEventListener('change', () => {
                    const file = fileInput.files?.[0];
                    const err = file ? validateClubLogoFile(file) : null;
                    errorEl.textContent = err || '';
                    errorEl.style.display = err ? 'block' : 'none';
                });
            }
        }, 100);
    }
};
