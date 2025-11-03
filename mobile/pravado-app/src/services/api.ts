// =====================================================
// API SERVICE
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import config, { API_ENDPOINTS } from '@config/index';
import { supabase } from './supabase';
import { Message, Conversation, Agent, ApiError } from '@types/index';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: config.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      return {
        message: (error.response.data as any)?.message || 'An error occurred',
        code: (error.response.data as any)?.code,
        status: error.response.status,
      };
    } else if (error.request) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    } else {
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  // =====================================================
  // AGENT MESSAGING
  // =====================================================

  async sendMessage(agentId: string, userId: string, message: string, conversationId?: string): Promise<{
    message: Message;
    conversation_id: string;
    agent_response: Message;
  }> {
    const response = await this.client.post(API_ENDPOINTS.agent.send, {
      agent_id: agentId,
      user_id: userId,
      message,
      conversation_id: conversationId,
    });
    return response.data;
  }

  async startConversation(agentId: string, userId: string): Promise<{
    conversation_id: string;
    agent_id: string;
    user_id: string;
  }> {
    const response = await this.client.post(API_ENDPOINTS.agent.start, {
      agent_id: agentId,
      user_id: userId,
    });
    return response.data;
  }

  async getConversationHistory(conversationId: string, limit: number = 50): Promise<{
    conversation_id: string;
    messages: Message[];
  }> {
    const response = await this.client.get(API_ENDPOINTS.agent.history, {
      params: { conversation_id: conversationId, limit },
    });
    return response.data;
  }

  async listAgents(): Promise<Agent[]> {
    const response = await this.client.get(API_ENDPOINTS.agent.list);
    return response.data.agents || [];
  }

  // =====================================================
  // USER PROFILE
  // =====================================================

  async getUserProfile(): Promise<any> {
    const response = await this.client.get(API_ENDPOINTS.user.profile);
    return response.data;
  }

  async updateUserProfile(data: any): Promise<any> {
    const response = await this.client.put(API_ENDPOINTS.user.profile, data);
    return response.data;
  }

  async getUserSettings(): Promise<any> {
    const response = await this.client.get(API_ENDPOINTS.user.settings);
    return response.data;
  }

  async updateUserSettings(settings: any): Promise<any> {
    const response = await this.client.put(API_ENDPOINTS.user.settings, settings);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
