import { supabase } from './supabase.js';

export const CLUB_LOGO_BUCKET = 'club-logos';
export const MAX_CLUB_LOGO_SIZE = 2 * 1024 * 1024;
export const CLUB_LOGO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

export function validateClubLogoFile(file) {
    if (!file) return null;
    if (!CLUB_LOGO_MIME_TYPES.includes(file.type)) {
        return 'Tipo de arquivo não permitido. Use PNG, JPG, WebP ou SVG.';
    }
    if (file.size > MAX_CLUB_LOGO_SIZE) {
        return 'O arquivo deve ter no máximo 2 MB.';
    }
    return null;
}

export function getClubLogoUrl(club) {
    if (!club?.logo_path) return null;
    const bucket = club.logo_bucket || CLUB_LOGO_BUCKET;
    const { data } = supabase.storage.from(bucket).getPublicUrl(club.logo_path);
    return data?.publicUrl || null;
}

export async function removeImageBackground(file, { tolerance = 32 } = {}) {
    if (!file) return file;
    if (file.type === 'image/svg+xml') return file;

    const objectUrl = URL.createObjectURL(file);
    try {
        const decodePromise = new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error('Não foi possível ler a imagem para remover o fundo.'));
            el.src = objectUrl;
        });
        const decodeTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao decodificar imagem.')), 8000);
        });
        const img = await Promise.race([decodePromise, decodeTimeout]);

        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) throw new Error('Imagem inválida.');

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const corners = [
            [0, 0],
            [w - 1, 0],
            [0, h - 1],
            [w - 1, h - 1],
        ];
        let r = 0, g = 0, b = 0;
        for (const [x, y] of corners) {
            const i = (y * w + x) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
        }
        r = Math.round(r / corners.length);
        g = Math.round(g / corners.length);
        b = Math.round(b / corners.length);

        const inner2 = tolerance * tolerance * 3;
        const outerTol = tolerance * 2;
        const outer2 = outerTol * outerTol * 3;
        for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - r;
            const dg = data[i + 1] - g;
            const db = data[i + 2] - b;
            const dist2 = dr * dr + dg * dg + db * db;
            if (dist2 <= inner2) {
                data[i + 3] = 0;
            } else if (dist2 <= outer2) {
                const t = (dist2 - inner2) / (outer2 - inner2);
                data[i + 3] = Math.round(data[i + 3] * t);
            }
        }

        ctx.putImageData(imageData, 0, 0);

        const blobPromise = new Promise((resolve, reject) => {
            canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG transparente.'))), 'image/png');
        });
        const blobTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout ao gerar PNG transparente.')), 8000);
        });
        const blob = await Promise.race([blobPromise, blobTimeout]);

        const baseName = (file.name || 'logo').replace(/\.[^.]+$/, '') || 'logo';
        return new File([blob], `${baseName}.png`, { type: 'image/png' });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export async function uploadClubLogo({ clubId, file }) {
    const validationError = validateClubLogoFile(file);
    if (validationError) throw new Error(validationError);

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `clubs/${clubId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
        .from(CLUB_LOGO_BUCKET)
        .upload(path, file, { upsert: false });

    if (error) throw error;

    return { logo_bucket: CLUB_LOGO_BUCKET, logo_path: path };
}

export async function updateClubLogoMetadata(clubId, logoData) {
    const { error } = await supabase
        .from('clubs')
        .update(logoData)
        .eq('id', clubId);

    if (error) throw error;
}

export async function removeClubLogoObject(logoPath) {
    if (!logoPath) return;

    const { error } = await supabase.storage
        .from(CLUB_LOGO_BUCKET)
        .remove([logoPath]);

    if (error) {
        console.warn('Não foi possível remover a logo enviada após falha no cadastro do clube.', error);
    }
}

export function getClubErrorMessage(error, fallback = 'Erro ao salvar clube. Tente novamente.') {
    const code = String(error?.code || '');
    const message = String(error?.message || error?.error_description || error || '');
    const normalizedMessage = message.toLowerCase();

    if (code === '23505' || normalizedMessage.includes('clubs_active_name_idx')) {
        return 'Já existe um clube ativo com este nome.';
    }

    if (
        normalizedMessage.includes('row-level security') ||
        normalizedMessage.includes('permission')
    ) {
        return 'Você não tem permissão para alterar clubes. Entre novamente como administrador.';
    }

    if (
        normalizedMessage.includes('storage') ||
        normalizedMessage.includes('bucket') ||
        normalizedMessage.includes('upload')
    ) {
        return 'Não foi possível salvar a logo do clube. Verifique o arquivo e tente novamente.';
    }

    return fallback;
}

export async function listActiveClubs() {
    const { data, error } = await supabase
        .from('clubs')
        .select('id, name, logo_bucket, logo_path, created_at')
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;
    return data || [];
}

export async function softDeleteClub(clubId) {
    const { error } = await supabase
        .from('clubs')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', clubId);

    if (error) throw error;
}
