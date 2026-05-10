import { supabase } from '../lib/supabase';

export const adminService = {
  async updateUserRole(userId: string, role: string) {
    const { data, error } = await supabase.functions.invoke('admin-update-user', {
      body: { userId, role }
    });
    if (error) throw error;
    return data;
  }
};
