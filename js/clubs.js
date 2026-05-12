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
