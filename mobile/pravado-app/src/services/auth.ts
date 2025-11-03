// =====================================================
// AUTH SERVICE
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

import { supabase } from './supabase';
import { AuthSession, User, AuthFormData } from '@types/index';

class AuthService {
  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error('No session returned');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || 0,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
      },
    };
  }

  async signUp(formData: AuthFormData): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          referral_code: formData.referralCode,
        },
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data.session) {
      throw new Error('No session returned. Please check your email to confirm your account.');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || 0,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        created_at: data.user.created_at,
      },
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error getting session:', error.message);
      return null;
    }

    if (!session) {
      return null;
    }

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || 0,
      user: {
        id: session.user.id,
        email: session.user.email || '',
        created_at: session.user.created_at,
        last_sign_in_at: session.user.last_sign_in_at,
      },
    };
  }

  async refreshSession(): Promise<AuthSession | null> {
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Error refreshing session:', error.message);
      return null;
    }

    if (!session) {
      return null;
    }

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || 0,
      user: {
        id: session.user.id,
        email: session.user.email || '',
        created_at: session.user.created_at,
        last_sign_in_at: session.user.last_sign_in_at,
      },
    };
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        callback(null);
        return;
      }

      callback({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at || 0,
        user: {
          id: session.user.id,
          email: session.user.email || '',
          created_at: session.user.created_at,
          last_sign_in_at: session.user.last_sign_in_at,
        },
      });
    });
  }
}

export const authService = new AuthService();
export default authService;
