import { supabase } from './supabase.js';

/**
 * Retorna uso do plano ativo de um atleta.
 * @param {string} studentId
 * @returns {Promise<{plan: object, used: number, total: number|null, remaining: number|null, expiresAt: string|null, startAt: string|null}|null>}
 */
export async function getActivePlanUsage(studentId) {
    const { data: activePlan } = await supabase
        .from('student_plans')
        .select('id, start_at, expires_at, plan:plans(name, category, total_sessions, duration_days)')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!activePlan) return null;

    const total = activePlan.plan?.total_sessions || null;
    let used = 0;

    if (total) {
        const startAt = activePlan.start_at || new Date(0).toISOString();
        const expiresAt = activePlan.expires_at || new Date(Date.now() + 365 * 86400000).toISOString();
        const upperBound = new Date(Math.min(new Date(expiresAt).getTime(), Date.now())).toISOString();

        const { count } = await supabase
            .from('attendance')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', studentId)
            .gte('checked_in_at', startAt)
            .lte('checked_in_at', upperBound);

        used = count || 0;
    }

    const remaining = total ? Math.max(0, total - used) : null;

    return {
        plan: activePlan.plan,
        used,
        total,
        remaining,
        expiresAt: activePlan.expires_at,
        startAt: activePlan.start_at
    };
}
