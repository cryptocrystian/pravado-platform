import { supabase } from '../lib/supabase';
import { NotFoundError } from '@pravado/utils';
import { AgentTaskStatus } from '@pravado/types';
import type { CreateAgentTaskInput } from '@pravado/types';
import { enqueueAgentTask } from '../lib/queue';

class AgentService {
  async getTasks(organizationId: string, filters: Record<string, unknown>) {
    let query = supabase
      .from('agent_tasks')
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

  async getTaskById(id: string) {
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Agent task', id);
    }

    return data;
  }

  async createTask(input: CreateAgentTaskInput) {
    const { data, error } = await supabase
      .from('agent_tasks')
      .insert({
        ...input,
        status: AgentTaskStatus.QUEUED,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    await enqueueAgentTask(
      {
        taskId: data.id,
        type: data.type,
        context: data.context,
        userId: data.user_id,
        organizationId: data.organization_id,
      },
      input.priority === 'URGENT' ? 1 : input.priority === 'HIGH' ? 2 : 3
    );

    return data;
  }

  async cancelTask(id: string) {
    const { data, error } = await supabase
      .from('agent_tasks')
      .update({ status: AgentTaskStatus.CANCELLED })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotFoundError('Agent task', id);
    }

    return data;
  }
}

export const agentService = new AgentService();
