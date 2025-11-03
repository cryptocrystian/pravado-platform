// =====================================================
// PRAVADO MOBILE APP - TYPES
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

export interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
}

export interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
  agent_id?: string;
  user_id?: string;
}

export interface Conversation {
  id: string;
  agent_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

export interface Agent {
  agent_id: string;
  agent_name: string;
  agent_type: 'conversational' | 'task-based' | 'hybrid';
  personality_profile: PersonalityProfile;
  created_at: string;
  is_active: boolean;
}

export interface PersonalityProfile {
  tone: string;
  formality: number;
  humor_level?: number;
  empathy_level?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

export interface AppConfig {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiTimeout: number;
  enableDebug: boolean;
  enableAnalytics: boolean;
  enablePushNotifications: boolean;
}

export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  referralCode?: string;
}

export interface ThemeMode {
  mode: 'light' | 'dark' | 'auto';
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibrate: boolean;
}

export interface UserSettings {
  theme: ThemeMode;
  notifications: NotificationSettings;
}

// Navigation types
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Chat: undefined;
  Settings: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  Features: undefined;
  Permissions: undefined;
};
