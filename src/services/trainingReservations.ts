import { supabase } from '../lib/supabase';

export const trainingReservationsService = {
  async getUserReservations(userId: string, startDate: string) {
    const { data, error } = await supabase
      .from('training_reservations')
      .select('*, training_sessions(*)')
      .eq('user_id', userId)
      .gte('training_sessions.date', startDate);
    if (error) throw error;
    return data;
  },
  async reserve(sessionId: string, userId: string) {
    const { data, error } = await supabase
      .from('training_reservations')
      .insert({ session_id: sessionId, user_id: userId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async cancel(reservationId: string) {
    const { error } = await supabase
      .from('training_reservations')
      .delete()
      .eq('id', reservationId);
    if (error) throw error;
  }
};
