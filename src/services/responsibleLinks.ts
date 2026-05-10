import { supabase } from '../lib/supabase';

export const responsibleLinksService = {
  async getLinkedStudents(responsibleId: string) {
    const { data, error } = await supabase
      .from('responsible_students')
      .select('*, student:users!student_id(*)')
      .eq('responsible_id', responsibleId);
    if (error) throw error;
    return data;
  }
};
