import { supabase } from '../lib/supabase';
import { NotFoundError } from '@pravado/utils';
import type { UpdateUserInput } from '@pravado/shared-types';

class UserService {
  async getUserById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('User', id);
    }

    return data;
  }

  async getUsers(organizationId: string, filters: Record<string, unknown>) {
    let query = supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.role) {
      query = query.eq('role', filters.role);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async updateUser(id: string, input: UpdateUserInput) {
    const { data, error } = await supabase
      .from('users')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotFoundError('User', id);
    }

    return data;
  }

  async deleteUser(id: string) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}

export const userService = new UserService();
