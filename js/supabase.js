// Supabase configuration
const SUPABASE_URL = 'https://ggolcbrrenmnvtphmcbr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnb2xjYnJyZW5tbnZ0cGhtY2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTMxMTMsImV4cCI6MjA5MTU4OTExM30.zyfqFx2unTLcoTwcIqc3NH14243IpNpLHgZ7XrBXXKs';

console.log('Iniciando Supabase...');

if (!window.supabase) {
    console.error('ERRO: SDK do Supabase não carregado via CDN!');
}

export const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

if (supabase) {
    console.log('Supabase configurado com sucesso.');
}