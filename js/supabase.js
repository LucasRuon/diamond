// Supabase configuration
const SUPABASE_URL = 'https://ggolcbrrenmnvtphmcbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnb2xjYnJyZW5tbnZ0cGhtY2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTMxMTMsImV4cCI6MjA5MTU4OTExM30.zyfqFx2unTLcoTwcIqc3NH14243IpNpLHgZ7XrBXXKs';

console.log('Iniciando Supabase...');

if (!window.supabase) {
    console.error('ERRO: SDK do Supabase não carregado via CDN!');
}

const SUPABASE_REQUEST_TIMEOUT_MS = 20000;

function createTimeoutError() {
    const error = new Error('Tempo limite excedido ao comunicar com o servidor.');
    error.name = 'TimeoutError';
    return error;
}

async function fetchWithTimeout(input, init = {}) {
    const controller = new AbortController();
    const timeoutError = createTimeoutError();
    let didTimeout = false;
    const externalSignal = init.signal;
    const timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort(timeoutError);
    }, SUPABASE_REQUEST_TIMEOUT_MS);

    const abortFromExternalSignal = () => {
        controller.abort(externalSignal.reason);
    };

    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort(externalSignal.reason);
        } else {
            externalSignal.addEventListener('abort', abortFromExternalSignal, { once: true });
        }
    }

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal
        });
    } catch (error) {
        if (didTimeout || controller.signal.reason?.name === 'TimeoutError') {
            throw timeoutError;
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
        if (externalSignal) {
            externalSignal.removeEventListener('abort', abortFromExternalSignal);
        }
    }
}

export const supabase = window.supabase
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { fetch: fetchWithTimeout }
    })
    : null;

if (supabase) {
    console.log('Supabase configurado com sucesso.');
}
