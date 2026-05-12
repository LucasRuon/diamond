import { supabase } from '../../supabase.js';
import { toast } from '../../auth.js';
import { ui, escapeHtml, safeUrl } from '../../ui.js';
import {
    archiveStudentDocument,
    createStudentDocumentSignedUrl,
    formatDocumentDate,
    formatDocumentSize,
    getDocumentTypeLabel,
    listStudentDocuments,
    uploadStudentDocument,
    validateStudentDocumentFile
} from '../../studentDocuments.js';

export const adminStudentDocuments = {
    selectedStudentId: null,
    selectedStudent: null,
    students: [],
    filteredStudents: [],
    documents: [],
    currentSearchTerm: '',

    async render(initialStudentId = null) {
        const mainContent = document.getElementById('main-content');
        this.selectedStudentId = initialStudentId || null;
        this.selectedStudent = null;
        this.students = [];
        this.filteredStudents = [];
        this.documents = [];
        this.currentSearchTerm = '';

        mainContent.innerHTML = `
            <div class="page-container">
                <div class="page-header">
                    <div>
                        <a href="#dashboard" style="display: inline-flex; align-items: center; gap: 6px; color: var(--dx-muted); font-size: 12px; text-decoration: none; margin-bottom: 8px;">
                            <i class="ph ph-caret-left"></i>
                            Voltar
                        </a>
                        <h1 style="font-family: var(--font-brand); font-size: 24px; font-weight: 400;">FICHAS DOS ATLETAS</h1>
                    </div>
                    <img src="/base_icon_transparent_background.png" alt="Diamond X" class="page-header-logo">
                </div>

                <div class="student-documents-layout">
                    <section class="student-documents-search">
                        <div class="input-group">
                            <label>BUSCAR ATLETA</label>
                            <input type="search" id="student-documents-search-input" class="input-control" placeholder="Nome, e-mail, CPF ou telefone">
                        </div>
                        <div id="student-documents-student-list" class="student-documents-student-list">
                            <p style="color: var(--dx-muted); text-align: center; padding: 20px;">Carregando atletas...</p>
                        </div>
                    </section>

                    <section id="student-documents-selected-panel" class="student-documents-selected">
                        <div class="card" style="text-align: center;">
                            <i class="ph ph-user-focus" style="font-size: 36px; color: var(--dx-teal);"></i>
                            <p style="font-weight: 700; margin-top: 12px;">Selecione um atleta</p>
                            <p style="font-size: 13px; color: var(--dx-muted); margin-top: 4px;">Depois envie ou consulte os documentos vinculados.</p>
                        </div>
                    </section>
                </div>
            </div>
        `;

        document.getElementById('student-documents-search-input').addEventListener('input', (event) => {
            this.currentSearchTerm = event.target.value;
            this.renderStudentList();
        });

        await this.loadStudents();

        if (initialStudentId) {
            await this.selectStudent(initialStudentId);
        }
    },

    async loadStudents(searchTerm = '') {
        this.currentSearchTerm = searchTerm || this.currentSearchTerm;

        const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, cpf, phone, avatar_url')
            .eq('role', 'student')
            .order('full_name');

        if (error) {
            document.getElementById('student-documents-student-list').innerHTML = `
                <p style="color: var(--dx-danger); padding: 16px;">Erro ao carregar atletas: ${escapeHtml(error.message)}</p>
            `;
            return;
        }

        this.students = data || [];
        this.renderStudentList();
    },

    async selectStudent(studentId) {
        this.selectedStudentId = studentId;
        this.selectedStudent = this.students.find((student) => student.id === studentId) || null;

        if (!this.selectedStudent && studentId) {
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, email, cpf, phone, avatar_url')
                .eq('id', studentId)
                .eq('role', 'student')
                .maybeSingle();

            if (error) {
                toast.show('Erro ao carregar atleta.', 'error');
                console.error(error);
            }

            this.selectedStudent = data || null;
            if (data && !this.students.some((student) => student.id === data.id)) {
                this.students = [data, ...this.students];
            }
        }

        if (!this.selectedStudent) {
            toast.show('Atleta não encontrado.', 'error');
            this.selectedStudentId = null;
            this.renderStudentList();
            this.renderSelectedStudentPanel();
            return;
        }

        const targetHash = `#student-documents?studentId=${encodeURIComponent(studentId)}`;
        if (window.location.hash !== targetHash) {
            window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}${targetHash}`);
        }
        this.renderStudentList();
        await this.renderSelectedStudentPanel();
    },

    renderStudentList() {
        const container = document.getElementById('student-documents-student-list');
        if (!container) return;

        const term = this.currentSearchTerm.trim().toLowerCase();
        this.filteredStudents = this.students.filter((student) => {
            if (!term) return true;

            return [
                student.full_name,
                student.email,
                student.cpf,
                student.phone
            ].filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
        });

        if (this.filteredStudents.length === 0) {
            container.innerHTML = '<p style="color: var(--dx-muted); text-align: center; padding: 20px;">Nenhum atleta encontrado.</p>';
            return;
        }

        container.innerHTML = this.filteredStudents.map((student) => {
            const activeClass = student.id === this.selectedStudentId ? ' active' : '';
            const avatar = student.avatar_url
                ? `<img src="${escapeHtml(safeUrl(student.avatar_url))}" alt="${escapeHtml(student.full_name || 'Atleta')}" style="width: 42px; height: 42px; border-radius: 50%; object-fit: cover;">`
                : '<i class="ph ph-user" style="color: var(--dx-teal); font-size: 20px;"></i>';

            return `
                <button type="button" class="student-documents-student-card${activeClass}" data-id="${escapeHtml(student.id)}">
                    <span style="width: 42px; height: 42px; border-radius: 50%; background: var(--dx-surface2); border: 1px solid var(--dx-border); display: inline-flex; align-items: center; justify-content: center; overflow: hidden; flex: 0 0 auto;">
                        ${avatar}
                    </span>
                    <span style="min-width: 0; text-align: left;">
                        <strong>${escapeHtml(student.full_name || 'Atleta sem nome')}</strong>
                        <small>${escapeHtml(student.email || 'Sem e-mail')}</small>
                    </span>
                </button>
            `;
        }).join('');

        container.querySelectorAll('.student-documents-student-card').forEach((button) => {
            button.addEventListener('click', () => this.selectStudent(button.dataset.id));
        });
    },

    async renderSelectedStudentPanel() {
        const panel = document.getElementById('student-documents-selected-panel');
        if (!panel) return;

        if (!this.selectedStudent) {
            panel.innerHTML = `
                <div class="card" style="text-align: center;">
                    <i class="ph ph-user-focus" style="font-size: 36px; color: var(--dx-teal);"></i>
                    <p style="font-weight: 700; margin-top: 12px;">Selecione um atleta</p>
                    <p style="font-size: 13px; color: var(--dx-muted); margin-top: 4px;">Depois envie ou consulte os documentos vinculados.</p>
                </div>
            `;
            return;
        }

        panel.innerHTML = `
            <div class="card" style="margin-bottom: 16px;">
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;">
                    <div style="min-width: 0;">
                        <p style="font-size: 12px; color: var(--dx-muted); font-weight: 700; text-transform: uppercase;">Atleta selecionado</p>
                        <h2 style="font-size: 20px; font-weight: 800; margin-top: 4px; word-break: break-word;">${escapeHtml(this.selectedStudent.full_name || 'Atleta sem nome')}</h2>
                        <p style="font-size: 13px; color: var(--dx-muted); margin-top: 4px; word-break: break-word;">${escapeHtml(this.selectedStudent.email || 'Sem e-mail')}</p>
                        ${this.selectedStudent.phone ? `<p style="font-size: 13px; color: var(--dx-muted); margin-top: 2px;">${escapeHtml(this.selectedStudent.phone)}</p>` : ''}
                    </div>
                    <button id="student-document-upload-btn" class="btn btn-primary" style="width: auto; min-width: 128px; padding: 10px 14px;">
                        <i class="ph ph-file-arrow-up"></i>
                        ENVIAR FICHA
                    </button>
                </div>
            </div>

            <div id="student-documents-open-link"></div>

            <div class="student-document-list" id="student-document-list">
                <p style="color: var(--dx-muted); text-align: center; padding: 20px;">Carregando documentos...</p>
            </div>
        `;

        document.getElementById('student-document-upload-btn').addEventListener('click', () => this.showUploadForm());
        await this.loadDocuments();
    },

    async loadDocuments() {
        const container = document.getElementById('student-document-list');
        if (!container || !this.selectedStudentId) return;

        try {
            this.documents = await listStudentDocuments(this.selectedStudentId, { includeHidden: true });
        } catch (error) {
            console.error(error);
            container.innerHTML = `<p style="color: var(--dx-danger); padding: 16px;">Erro ao carregar documentos: ${escapeHtml(error.message)}</p>`;
            return;
        }

        if (this.documents.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center;">
                    <i class="ph ph-folder-open" style="font-size: 32px; color: var(--dx-muted);"></i>
                    <p style="font-weight: 700; margin-top: 12px;">Nenhum documento ativo</p>
                    <p style="font-size: 13px; color: var(--dx-muted); margin-top: 4px;">Envie a ficha física ou outro documento do atleta.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.documents.map((documentRecord) => `
            <article class="student-document-item" data-id="${escapeHtml(documentRecord.id)}">
                <div style="display: flex; gap: 12px; min-width: 0;">
                    <span style="width: 40px; height: 40px; border-radius: 8px; background: var(--dx-teal-dim); color: var(--dx-teal); display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;">
                        <i class="ph ${this.getDocumentIcon(documentRecord)}"></i>
                    </span>
                    <div style="min-width: 0;">
                        <h3 style="font-size: 15px; font-weight: 800; word-break: break-word;">${escapeHtml(documentRecord.title)}</h3>
                        <p style="font-size: 12px; color: var(--dx-muted); margin-top: 3px; word-break: break-word;">${escapeHtml(documentRecord.original_file_name)}</p>
                        <p style="font-size: 12px; color: var(--dx-muted); margin-top: 6px;">
                            ${escapeHtml(getDocumentTypeLabel(documentRecord.document_type))}
                            · ${escapeHtml(formatDocumentSize(documentRecord.file_size))}
                            · ${escapeHtml(formatDocumentDate(documentRecord.uploaded_at))}
                        </p>
                        <span class="badge ${documentRecord.visible_to_student ? 'badge-active' : 'badge-pending'}" style="margin-top: 8px;">
                            ${documentRecord.visible_to_student ? 'VISÍVEL AO ATLETA' : 'OCULTO DO ATLETA'}
                        </span>
                    </div>
                </div>
                <div class="student-document-actions">
                    <button type="button" class="btn student-document-open-btn" data-id="${escapeHtml(documentRecord.id)}">
                        <i class="ph ph-arrow-square-out"></i>
                        Abrir
                    </button>
                    <button type="button" class="btn student-document-archive-btn" data-id="${escapeHtml(documentRecord.id)}">
                        <i class="ph ph-archive"></i>
                        Arquivar
                    </button>
                </div>
            </article>
        `).join('');

        container.querySelectorAll('.student-document-open-btn').forEach((button) => {
            button.addEventListener('click', () => this.openDocument(button.dataset.id));
        });
        container.querySelectorAll('.student-document-archive-btn').forEach((button) => {
            button.addEventListener('click', () => this.archiveDocument(button.dataset.id));
        });
    },

    showUploadForm() {
        if (!this.selectedStudent) {
            toast.show('Selecione um atleta antes de enviar a ficha.', 'error');
            return;
        }

        const formHtml = `
            <form id="student-document-upload-form">
                <div class="input-group">
                    <label>TÍTULO</label>
                    <input type="text" name="title" class="input-control" value="Ficha do atleta" required>
                </div>
                <div class="input-group">
                    <label>TIPO</label>
                    <select name="documentType" class="input-control">
                        <option value="athlete_record">Ficha do atleta</option>
                        <option value="medical">Médico</option>
                        <option value="authorization">Autorização</option>
                        <option value="other">Outro</option>
                    </select>
                </div>
                <div class="input-group">
                    <label>ARQUIVO</label>
                    <input type="file" id="student-document-file" class="input-control" accept=".pdf,.txt,.jpg,.jpeg,.png,.webp,.doc,.docx" required>
                    <p class="student-document-upload-hint">PDF, imagem, TXT ou Word até 10 MB.</p>
                </div>
                <label style="display: flex; align-items: center; gap: 10px; color: var(--dx-text); font-size: 14px; margin-top: 8px;">
                    <input type="checkbox" name="visibleToStudent" checked>
                    Visível para o atleta
                </label>
                <button type="submit" class="btn btn-primary" style="margin-top: 18px;">
                    <i class="ph ph-upload-simple"></i>
                    ENVIAR DOCUMENTO
                </button>
            </form>
        `;

        ui.bottomSheet.show('Enviar ficha', formHtml, async (data) => {
            const file = document.getElementById('student-document-file')?.files?.[0];
            const validationMessage = validateStudentDocumentFile(file);

            if (validationMessage) {
                toast.show(validationMessage, 'error');
                throw new Error(validationMessage);
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            await uploadStudentDocument({
                studentId: this.selectedStudentId,
                file,
                title: data.title,
                documentType: data.documentType,
                visibleToStudent: data.visibleToStudent === 'on',
                uploadedBy: user.id
            });

            toast.show('Documento enviado com sucesso!');
            await this.loadDocuments();
        });
    },

    async openDocument(documentId) {
        const documentRecord = this.documents.find((item) => item.id === documentId);
        if (!documentRecord) {
            toast.show('Documento não encontrado.', 'error');
            return;
        }

        try {
            const signedUrl = await createStudentDocumentSignedUrl(documentRecord);
            const opened = window.open(signedUrl, '_blank', 'noopener,noreferrer');

            if (!opened) {
                this.renderTemporaryOpenLink(signedUrl);
            }
        } catch (error) {
            console.error(error);
            toast.show('Erro ao abrir documento.', 'error');
        }
    },

    renderTemporaryOpenLink(url) {
        const container = document.getElementById('student-documents-open-link');
        if (!container) return;

        container.innerHTML = `
            <div class="card" style="margin-bottom: 16px; border-color: var(--dx-teal-border);">
                <p style="font-size: 13px; color: var(--dx-muted); margin-bottom: 10px;">O navegador bloqueou a nova aba.</p>
                <a href="${escapeHtml(safeUrl(url))}" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="text-decoration: none;">
                    ABRIR LINK TEMPORÁRIO
                </a>
            </div>
        `;
    },

    async archiveDocument(documentId) {
        const documentRecord = this.documents.find((item) => item.id === documentId);
        if (!documentRecord) {
            toast.show('Documento não encontrado.', 'error');
            return;
        }

        if (!confirm('Arquivar este documento?')) {
            return;
        }

        try {
            await archiveStudentDocument(documentRecord);
            toast.show('Documento arquivado.');
            await this.loadDocuments();
        } catch (error) {
            console.error(error);
            toast.show('Erro ao arquivar documento.', 'error');
        }
    },

    getDocumentIcon(documentRecord) {
        if (documentRecord.mime_type?.startsWith('image/')) {
            return 'ph-image';
        }

        if (documentRecord.mime_type === 'application/pdf') {
            return 'ph-file-pdf';
        }

        if (documentRecord.mime_type === 'text/plain') {
            return 'ph-file-text';
        }

        return 'ph-file-doc';
    }
};
