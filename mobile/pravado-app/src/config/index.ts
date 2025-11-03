// =====================================================
// PRAVADO MOBILE APP - CONFIGURATION
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

import Constants from 'expo-constants';
import { AppConfig } from '@types/index';

const extra = Constants.expoConfig?.extra || {};

export const config: AppConfig = {
  apiUrl: extra.apiUrl || process.env.API_URL || 'https://api.pravado.com',
  supabaseUrl: extra.supabaseUrl || process.env.SUPABASE_URL || '',
  supabaseAnonKey: extra.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || '',
  apiTimeout: 10000,
  enableDebug: process.env.ENABLE_DEBUG === 'true',
  enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
  enablePushNotifications: process.env.ENABLE_PUSH_NOTIFICATIONS === 'true',
};

export const colors = {
  light: {
    primary: '#6200EE',
    secondary: '#03DAC6',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    error: '#B00020',
    text: '#000000',
    onSurface: '#000000',
    disabled: '#00000061',
    placeholder: '#00000061',
    backdrop: '#00000080',
    notification: '#F50057',
  },
  dark: {
    primary: '#BB86FC',
    secondary: '#03DAC6',
    background: '#121212',
    surface: '#121212',
    error: '#CF6679',
    text: '#FFFFFF',
    onSurface: '#FFFFFF',
    disabled: '#FFFFFF61',
    placeholder: '#FFFFFF61',
    backdrop: '#FFFFFF80',
    notification: '#F50057',
  },
};

export const fonts = {
  regular: 'System',
  medium: 'System',
  light: 'System',
  thin: 'System',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
  },
  agent: {
    send: '/api/agent-messenger/send',
    start: '/api/agent-messenger/start',
    history: '/api/agent-messenger/history',
    list: '/api/agents',
  },
  user: {
    profile: '/api/user/profile',
    settings: '/api/user/settings',
  },
};

export default config;
