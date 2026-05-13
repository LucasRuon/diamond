import { supabase, VAPID_PUBLIC, SUPABASE_URL } from './supabase.js';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

let attempted = false;

/**
 * Registra/atualiza a Push Subscription do usuário no Supabase.
 * Falha silenciosa: se push não estiver disponível, o app continua funcionando
 * com fallback in-app (banner no #trainings + dashboard).
 */
export async function registerPush() {
    if (attempted) return;
    attempted = true;

    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (!VAPID_PUBLIC || VAPID_PUBLIC.startsWith('__REPLACE')) {
            console.warn('[push] VAPID_PUBLIC não configurada — pulando subscribe.');
            return;
        }
        if (typeof Notification === 'undefined') return;

        if (Notification.permission === 'denied') return;
        if (Notification.permission === 'default') {
            const perm = await Notification.requestPermission();
            if (perm !== 'granted') return;
        }

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
            sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
            });
        }

        const session = (await supabase.auth.getSession()).data.session;
        if (!session?.access_token) return;

        const payload = sub.toJSON();
        const res = await fetch(`${SUPABASE_URL}/functions/v1/push-subscribe`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                endpoint: payload.endpoint,
                keys: payload.keys
            })
        });
        if (!res.ok) console.warn('[push] subscribe HTTP', res.status);
    } catch (err) {
        console.warn('[push] registerPush falhou (fallback in-app ativo):', err?.message || err);
    }
}
