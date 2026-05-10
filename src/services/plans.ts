import { supabase } from '../lib/supabase';

export const plansService = {
  async getActivePlans() {
    const { data, error } = await supabase.from('plans').select('*').eq('active', true).order('price');
    if (error) throw error;
    return data;
  },
  async getStudentPlan(userId: string) {
    const { data, error } = await supabase.from('student_plans').select('*, plans(*)').eq('user_id', userId).eq('status', 'active').single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};
