import { supabase } from '../lib/supabase';
import { NotFoundError } from '@pravado/utils';
import type { CreateCampaignInput, UpdateCampaignInput } from '@pravado/types';

class CampaignService {
  async getCampaigns(organizationId: string, filters: Record<string, unknown>) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getCampaignById(id: string) {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Campaign', id);
    }

    return data;
  }

  async createCampaign(input: CreateCampaignInput) {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(input)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateCampaign(id: string, input: UpdateCampaignInput) {
    const { data, error } = await supabase
      .from('campaigns')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotFoundError('Campaign', id);
    }

    return data;
  }

  async deleteCampaign(id: string) {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  }
}

export const campaignService = new CampaignService();
