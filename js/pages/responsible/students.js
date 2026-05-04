import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml } from '../../ui.js';

export const responsibleStudents = {
    async render() {
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="page-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                    <h1 style="font-family: var(--font-display); font-size: 24px; font-weight: 800;">MEUS ALUNOS</h1>
                    <button id="add-student-link-btn" class="btn btn-primary" style="width: auto; padding: 10px 16px;">
                        <i class="ph ph-user-plus" style="font-size: 20px;"></i>
                    </button>
                </div>

                <div id="linked-students-list" style="display: flex; flex-direction: column; gap: 12px;">
                    <p style="color: var(--dx-muted); text-align: center; margin-top: 40px;">Buscando alunos vinculados...</p>
                </div>
            </div>
        `;

        this.loadLinkedStudents();
        document.getElementById('add-student-link-btn').addEventListener('click', () => this.showLinkStudentForm());
    },

    async loadLinkedStudents() {
        const listContainer = document.getElementById('linked-students-list');
        const userId = (await supabase.auth.getUser()).data.user.id;

        const { data: links, error } = await supabase
            .from('responsible_students')
            .select(`
                student_id,
                student:users!student_id (
                    full_name,
                    email,
                    role
                )
            `)
            .eq('responsible_id', userId);

        if (error) {
            listContainer.innerHTML = `<p style="color: var(--dx-danger);">Erro ao carregar alunos.</p>`;
            return;
        }

        if (links.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; margin-top: 60px;">
                    <i class="ph ph-users-three" style="font-size: 48px; color: var(--dx-border); margin-bottom: 16px;"></i>
                    <p style="color: var(--dx-muted);">Você ainda não tem alunos vinculados.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = links.map(link => `
            <div class="card student-card" data-id="${escapeHtml(link.student_id)}" style="display: flex; flex-direction: column; gap: 14px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: var(--dx-teal-dim); width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--dx-teal-border); flex: 0 0 auto;">
                        <i class="ph-bold ph-user" style="color: var(--dx-teal); font-size: 20px;"></i>
                    </div>
                    <div>
                        <p style="font-weight: 700; font-size: 16px;">${escapeHtml(link.student.full_name)}</p>
                        <p style="font-size: 12px; color: var(--dx-muted);">${escapeHtml(link.student.email)}</p>
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    <a href="#attendance?id=${escapeHtml(link.student_id)}" class="btn" style="flex: 1; padding: 10px; font-size: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border); color: var(--dx-text); text-align: center; text-decoration: none;">
                        FREQUÊNCIA
                    </a>
                    <a href="#trainings" class="btn" style="flex: 1; padding: 10px; font-size: 12px; background: var(--dx-surface2); border: 1px solid var(--dx-border); color: var(--dx-text); text-align: center; text-decoration: none;">
                        TREINOS
                    </a>
                </div>
            </div>
        `).join('');
    },

    showLinkStudentForm() {
        const formHtml = `
            <form id="link-student-form">
                <p style="font-size: 14px; color: var(--dx-muted); margin-bottom: 20px;">Insira o e-mail do aluno (filho/dependente) para vinculá-lo à sua conta de responsável.</p>
                <div class="input-group">
                    <label>E-MAIL DO ALUNO</label>
                    <input type="email" name="email" class="input-control" placeholder="exemplo@email.com" required>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 16px;">VINCULAR ALUNO</button>
            </form>
        `;

        ui.bottomSheet.show('Vincular Aluno', formHtml, async (data) => {
            console.log('Tentando vincular aluno com email:', data.email);
            
            const { data: student, error: fError } = await supabase
                .from('users')
                .select('id, role, full_name')
                .eq('email', data.email)
                .single();

            if (fError || !student) {
                console.error('Erro ao buscar aluno:', fError);
                throw new Error('Aluno não encontrado com este e-mail.');
            }
            
            if (student.role !== 'student') {
                throw new Error('O e-mail informado pertence a um ' + student.role + ', não a um aluno.');
            }

            const { data: { user } } = await supabase.auth.getUser();
            const userId = user.id;
            
            console.log('Vinculando aluno', student.id, 'ao responsável', userId);

            const { error: lError } = await supabase
                .from('responsible_students')
                .insert([{
                    responsible_id: userId,
                    student_id: student.id
                }]);

            if (lError) {
                console.error('Erro ao inserir vínculo:', lError);
                if (lError.code === '23505') throw new Error('Este aluno já está vinculado a você.');
                throw lError;
            }

            toast.show('Aluno ' + student.full_name + ' vinculado!');
            this.loadLinkedStudents();
        });
    }
};
