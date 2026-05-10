import { supabase } from '../lib/supabase';

export const attendanceService = {
  async getUserAttendance(userId: string) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*, training_sessions(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  async checkIn(userId: string, sessionId: string) {
    const { data, error } = await supabase
      .from('attendance')
      .insert({ user_id: userId, session_id: sessionId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
