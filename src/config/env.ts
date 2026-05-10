export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL as string,
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string,
};

if (!env.supabaseUrl || !env.supabasePublishableKey) {
  console.warn('Faltam variáveis de ambiente do Supabase (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
}
