export function isReservationsSchemaError(error: any): boolean {
  if (!error) return false;

  const code = String(error.code || '');
  const message = [
    error.message,
    error.details,
    error.hint
  ].filter(Boolean).join(' ').toLowerCase();

  return code === 'PGRST205'
    || message.includes('training_reservations')
    || message.includes('schema cache');
}

export function getReservationsLoadMessage(error: any): string {
  if (isReservationsSchemaError(error)) {
    return 'Tabela de reservas indisponível. Verifique a migração no Supabase.';
  }

  return 'Não foi possível carregar reservas agora.';
}
