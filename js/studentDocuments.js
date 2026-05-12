import { supabase } from './supabase.js';

export const STUDENT_DOCUMENT_BUCKET = 'student-documents';
export const MAX_STUDENT_DOCUMENT_SIZE = 10 * 1024 * 1024;

export const ALLOWED_STUDENT_DOCUMENT_TYPES = {
    'application/pdf': {
        extensions: ['pdf'],
        label: 'PDF'
    },
    'text/plain': {
        extensions: ['txt'],
        label: 'TXT'
    },
    'image/jpeg': {
        extensions: ['jpg', 'jpeg'],
        label: 'Imagem JPG'
    },
    'image/png': {
        extensions: ['png'],
        label: 'Imagem PNG'
    },
    'image/webp': {
        extensions: ['webp'],
        label: 'Imagem WEBP'
    },
    'application/msword': {
        extensions: ['doc'],
        label: 'Documento Word'
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        extensions: ['docx'],
        label: 'Documento Word'
    }
};

const DOCUMENT_TYPE_LABELS = {
    athlete_record: 'Ficha do atleta',
    medical: 'Médico',
    authorization: 'Autorização',
    other: 'Outro'
};

const GENERIC_MIME_TYPES = new Set([
    '',
    'application/octet-stream',
    'binary/octet-stream'
]);

function assertSupabaseClient() {
    if (!supabase) {
        throw new Error('Supabase não está configurado.');
    }
}

function getFileExtension(fileName = '') {
    const parts = String(fileName).toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
}

function findMimeTypeByExtension(extension) {
    return Object.entries(ALLOWED_STUDENT_DOCUMENT_TYPES).find(([, config]) => {
        return config.extensions.includes(extension);
    })?.[0] || '';
}

function getEffectiveMimeType(file) {
    const declaredMimeType = String(file?.type || '').toLowerCase();
    const extension = getFileExtension(file?.name);

    if (ALLOWED_STUDENT_DOCUMENT_TYPES[declaredMimeType]) {
        return declaredMimeType;
    }

    if (GENERIC_MIME_TYPES.has(declaredMimeType)) {
        return findMimeTypeByExtension(extension);
    }

    return '';
}

function getAllowedExtensionsText() {
    const extensions = Object.values(ALLOWED_STUDENT_DOCUMENT_TYPES)
        .flatMap((config) => config.extensions)
        .map((extension) => `.${extension}`);

    return extensions.join(', ');
}

export function validateStudentDocumentFile(file) {
    if (!file) {
        return 'Selecione um arquivo para enviar.';
    }

    if (file.size > MAX_STUDENT_DOCUMENT_SIZE) {
        return 'O arquivo deve ter no máximo 10 MB.';
    }

    if (file.size <= 0) {
        return 'O arquivo selecionado está vazio.';
    }

    const extension = getFileExtension(file.name);
    const effectiveMimeType = getEffectiveMimeType(file);
    const allowedType = ALLOWED_STUDENT_DOCUMENT_TYPES[effectiveMimeType];

    if (!allowedType) {
        return `Formato não permitido. Envie apenas ${getAllowedExtensionsText()}.`;
    }

    if (!allowedType.extensions.includes(extension)) {
        return `A extensão do arquivo não corresponde ao formato ${allowedType.label}.`;
    }

    return '';
}

export async function listStudentDocuments(studentId, options = {}) {
    assertSupabaseClient();

    if (!studentId) {
        throw new Error('Aluno não informado.');
    }

    let query = supabase
        .from('student_documents')
        .select('*')
        .eq('student_id', studentId)
        .is('deleted_at', null)
        .order('uploaded_at', { ascending: false });

    if (options.includeHidden === false) {
        query = query.eq('visible_to_student', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
}

export async function uploadStudentDocument({
    studentId,
    file,
    title,
    documentType = 'athlete_record',
    visibleToStudent = true,
    uploadedBy
}) {
    assertSupabaseClient();

    if (!studentId) {
        throw new Error('Aluno não informado.');
    }

    if (!uploadedBy) {
        throw new Error('Usuário responsável pelo envio não informado.');
    }

    const validationMessage = validateStudentDocumentFile(file);
    if (validationMessage) {
        throw new Error(validationMessage);
    }

    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) {
        throw new Error('Informe um título para o documento.');
    }

    const documentId = crypto.randomUUID();
    const extension = getFileExtension(file.name);
    const mimeType = getEffectiveMimeType(file);
    const storagePath = `${studentId}/${documentId}.${extension}`;

    const { error: uploadError } = await supabase.storage
        .from(STUDENT_DOCUMENT_BUCKET)
        .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: mimeType
        });

    if (uploadError) throw uploadError;

    const payload = {
        id: documentId,
        student_id: studentId,
        uploaded_by: uploadedBy,
        title: cleanTitle,
        document_type: documentType || 'athlete_record',
        storage_bucket: STUDENT_DOCUMENT_BUCKET,
        storage_path: storagePath,
        original_file_name: file.name,
        mime_type: mimeType,
        file_size: file.size,
        visible_to_student: Boolean(visibleToStudent)
    };

    const { data, error: insertError } = await supabase
        .from('student_documents')
        .insert([payload])
        .select()
        .single();

    if (insertError) {
        await supabase.storage
            .from(STUDENT_DOCUMENT_BUCKET)
            .remove([storagePath]);

        throw insertError;
    }

    return data;
}

export async function createStudentDocumentSignedUrl(documentRecord) {
    assertSupabaseClient();

    if (!documentRecord?.storage_bucket || !documentRecord?.storage_path) {
        throw new Error('Documento inválido para abertura.');
    }

    const { data, error } = await supabase.storage
        .from(documentRecord.storage_bucket)
        .createSignedUrl(documentRecord.storage_path, 300);

    if (error) throw error;
    return data?.signedUrl || '';
}

export async function archiveStudentDocument(documentRecord) {
    assertSupabaseClient();

    if (!documentRecord?.id) {
        throw new Error('Documento não informado.');
    }

    const { data, error } = await supabase
        .from('student_documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentRecord.id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export function formatDocumentSize(bytes) {
    const value = Number(bytes || 0);

    if (value < 1024) {
        return `${value} B`;
    }

    if (value < 1024 * 1024) {
        return `${(value / 1024).toFixed(1)} KB`;
    }

    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDocumentDate(isoDate) {
    if (!isoDate) {
        return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(isoDate));
}

export function getDocumentTypeLabel(documentType) {
    return DOCUMENT_TYPE_LABELS[documentType] || DOCUMENT_TYPE_LABELS.other;
}
