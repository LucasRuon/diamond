import { supabase } from '../lib/supabase';

export const trainingSessionsService = {
  async getSessions(startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('time');
    if (error) throw error;
    return data;
  }
};
