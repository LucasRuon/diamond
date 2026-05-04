export function isReservationsSchemaError(error) {
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

export function getReservationsLoadMessage(error) {
    if (isReservationsSchemaError(error)) {
        return 'Tabela de reservas indisponivel. Verifique a migracao no Supabase.';
    }

    return 'Nao foi possivel carregar reservas agora.';
}
