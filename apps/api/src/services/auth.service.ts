import { supabase } from '../lib/supabase';
import { AuthenticationError } from '@pravado/utils';
import type { LoginCredentials, RegisterCredentials } from '@pravado/shared-types';

class AuthService {
  async register(credentials: RegisterCredentials) {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          name: credentials.name,
        },
      },
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  async login(credentials: LoginCredentials) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  async logout(refreshToken: string) {
    const { error } = await supabase.auth.admin.signOut(refreshToken);

    if (error) {
      throw new AuthenticationError(error.message);
    }
  }

  async refreshToken(refreshToken: string) {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      throw new AuthenticationError(error.message);
    }

    return {
      session: data.session,
    };
  }
}

export const authService = new AuthService();
