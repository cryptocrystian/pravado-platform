// =====================================================
// CHAT SCREEN
// Sprint 64 Phase 6.1: Mobile App Foundation
// =====================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, IconButton, ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { Message } from '@types/index';
import { apiService } from '@services/api';
import { authService } from '@services/auth';
import ChatMessage from '@components/chat/ChatMessage';
import { logError } from '@utils/index';

export default function ChatScreen() {
  const theme = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Mock agent ID (replace with actual agent selection later)
  const MOCK_AGENT_ID = 'agent-001';

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      // Get user ID from session
      const session = await authService.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }

      // Start a new conversation
      setLoading(true);
      const { conversation_id } = await apiService.startConversation(
        MOCK_AGENT_ID,
        session?.user?.id || 'anonymous'
      );
      setConversationId(conversation_id);

      // Load conversation history
      await loadHistory(conversation_id);
    } catch (error: any) {
      logError(error, 'initializeChat');
      // Add welcome message as fallback
      setMessages([
        {
          id: '1',
          role: 'agent',
          content: 'Hello! I\'m your Pravado assistant. How can I help you today?',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (convId: string) => {
    try {
      const { messages: history } = await apiService.getConversationHistory(convId, 50);
      setMessages(history);
    } catch (error: any) {
      logError(error, 'loadHistory');
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    // Optimistically add user message
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setSending(true);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await apiService.sendMessage(
        MOCK_AGENT_ID,
        userId || 'anonymous',
        userMessage.content,
        conversationId || undefined
      );

      // Update with actual messages from API
      setMessages((prev) => {
        // Remove temp message
        const filtered = prev.filter((msg) => msg.id !== userMessage.id);
        // Add real messages
        return [...filtered, response.message, response.agent_response];
      });

      // Update conversation ID if not set
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      logError(error, 'handleSend');
      // Show error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'agent',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <ChatMessage message={item} />
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <View style={[styles.inputContainer, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          mode="outlined"
          style={styles.input}
          multiline
          maxLength={1000}
          disabled={sending}
          right={
            <TextInput.Icon
              icon="send"
              onPress={handleSend}
              disabled={!inputText.trim() || sending}
              color={inputText.trim() ? theme.colors.primary : theme.colors.disabled}
            />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  messageList: {
    padding: 16,
  },
  inputContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  input: {
    backgroundColor: 'transparent',
  },
});
