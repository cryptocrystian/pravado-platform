// =====================================================
// APP NAVIGATOR
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Screens
import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';
import WelcomeScreen from '@screens/onboarding/WelcomeScreen';
import ChatScreen from '@screens/chat/ChatScreen';
import SettingsScreen from '@screens/settings/SettingsScreen';

// Services
import { authService } from '@services/auth';
import { AuthSession } from '@types/index';

const RootStack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();
const MainTab = createBottomTabNavigator();
const OnboardingStack = createNativeStackNavigator();

// Auth Navigator
function AuthNavigator({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login">
        {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onRegisterSuccess={onLoginSuccess} />}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator({ onLogout }: { onLogout: () => void }) {
  const theme = useTheme();

  return (
    <MainTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
      }}
    >
      <MainTab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Pravado Assistant',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chat" size={size} color={color} />
          ),
        }}
      />
      <MainTab.Screen
        name="Settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      >
        {() => <SettingsScreen onLogout={onLogout} />}
      </MainTab.Screen>
    </MainTab.Navigator>
  );
}

// Onboarding Navigator
function OnboardingNavigator({ onComplete }: { onComplete: () => void }) {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Welcome">
        {() => <WelcomeScreen onNext={onComplete} />}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSession();
    const { data: authListener } = authService.onAuthStateChange(setSession);
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const currentSession = await authService.getSession();
      setSession(currentSession);
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    checkSession();
  };

  const handleLogout = () => {
    setSession(null);
    setHasCompletedOnboarding(false);
  };

  const handleOnboardingComplete = () => {
    setHasCompletedOnboarding(true);
  };

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <RootStack.Screen name="Auth">
            {() => <AuthNavigator onLoginSuccess={handleLoginSuccess} />}
          </RootStack.Screen>
        ) : !hasCompletedOnboarding ? (
          <RootStack.Screen name="Onboarding">
            {() => <OnboardingNavigator onComplete={handleOnboardingComplete} />}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen name="Main">
            {() => <MainNavigator onLogout={handleLogout} />}
          </RootStack.Screen>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
