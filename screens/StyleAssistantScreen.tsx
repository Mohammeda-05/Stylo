import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { useGuest } from '../context/GuestContext';
import { useHints } from '../context/HintContext';
import { generateStyleAssistantResponse } from '../services/aiService';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function StyleAssistantScreen() {
  const { theme } = useTheme();
  const { isGuestMode } = useGuest();
  const { safeGetAll } = useSupabaseDB();
  const { showHint } = useHints();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "Hey there! I'm your personal style assistant. I can help you put together outfits, give fashion advice, or answer any questions about your wardrobe. What can I help you with today?",
      isUser: false,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);

    // Show first visit hint
    setTimeout(() => {
      showHint('assistant_first_visit');
    }, 1500);
  }, [showHint]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const getWardrobeItems = async () => {
    if (isGuestMode) return [];
    try {
      const items = await safeGetAll('wardrobeItems');
      return items || [];
    } catch (error) {
      console.error("Error fetching wardrobe items:");
      return [];
    }
  };

  const getEvaluations = async () => {
    if (isGuestMode) return [];
    try {
      const evaluations = await safeGetAll('evaluations');
      return evaluations || [];
    } catch (error) {
      console.error("Error fetching evaluations:");
      return [];
    }
  };

  const getUserProfile = async () => {
    if (isGuestMode) return null;
    try {
      const userStats = await safeGetAll('userStats');
      return userStats && userStats.length > 0 ? userStats[0] : null;
    } catch (error) {
      console.error("Error fetching user stats:");
      return null;
    }
  };

  const calculateStats = (evaluations: any[]) => {
    if (!evaluations || evaluations.length === 0) {
      return {
        totalEvaluations: 0,
        bestScore: null,
        averageScore: null,
        currentStreak: 0
      };
    }

    const scores = evaluations.map(e => e.score).filter(score => score != null);
    const bestScore = Math.max(...scores);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Calculate current streak (simplified)
    const sortedEvaluations = evaluations.sort((a, b) => b.createdAt - a.createdAt);
    let currentStreak = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    
    for (let i = 0; i < sortedEvaluations.length; i++) {
      const evalDate = new Date(sortedEvaluations[i].createdAt);
      const daysDiff = Math.floor((today.getTime() - evalDate.getTime()) / oneDayMs);
      
      if (daysDiff === i) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      totalEvaluations: evaluations.length,
      bestScore: Math.round(bestScore * 10) / 10,
      averageScore: Math.round(averageScore * 10) / 10,
      currentStreak
    };
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Gather all user data for AI context
      const [wardrobeItems, evaluations, userStats] = await Promise.all([
        getWardrobeItems(),
        getEvaluations(),
        getUserProfile()
      ]);

      const stats = calculateStats(evaluations);
      
      // Generate AI response with full context
      const chatHistory = messages
        .filter(m => !m.id.includes('welcome'))
        .map(m => ({
          role: m.isUser ? 'user' as const : 'assistant' as const,
          content: m.text
        }));

      const userContext = {
        wardrobeItems,
        evaluations,
        userProfile: userStats,
        stats
      };

      const aiResponse = await generateStyleAssistantResponse(
        inputText.trim(),
        chatHistory,
        userContext
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error generating AI response:");
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting right now. Please try again in a moment!",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    headerGradient: {
      paddingBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    headerTitleContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    messageWrapper: {
      marginBottom: 16,
      alignItems: 'flex-start',
    },
    userMessageWrapper: {
      alignItems: 'flex-end',
    },
    messageBubble: {
      maxWidth: '80%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    userMessage: {
      borderBottomRightRadius: 4,
      overflow: 'hidden',
    },
    assistantMessage: {
      backgroundColor: theme.colors.surface,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    userMessageGradient: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
      borderBottomRightRadius: 4,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 22,
      fontFamily: 'Inter_400Regular',
    },
    userMessageText: {
      color: '#FFFFFF',
    },
    assistantMessageText: {
      color: theme.colors.text,
    },
    timestamp: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
      marginHorizontal: 4,
      fontFamily: 'Inter_400Regular',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingBottom: Platform.OS === 'ios' ? 16 : 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    textInputContainer: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
      minHeight: 48,
    },
    textInput: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: theme.colors.text,
      maxHeight: 100,
      minHeight: 24,
      fontFamily: 'Inter_400Regular',
    },
    sendButton: {
      marginLeft: 12,
      width: 48,
      height: 48,
      borderRadius: 24,
      overflow: 'hidden',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    sendButtonGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      shadowOpacity: 0,
      elevation: 0,
    },
    loadingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 16,
      alignSelf: 'flex-start',
      maxWidth: '80%',
    },
    loadingText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginLeft: 8,
      fontStyle: 'italic',
      fontFamily: 'Inter_400Regular',
    },
    welcomeContainer: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 24,
    },
    welcomeIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 12,
    },
    welcomeTitle: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    welcomeSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Animated.View 
        style={[
          { flex: 1 },
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        {/* Enhanced Header */}
        <LinearGradient
          colors={[theme.colors.background, theme.colors.background + '00']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primary + '80']}
              style={styles.headerIconContainer}
            >
              <Ionicons name="sparkles" size={28} color={theme.colors.background} />
            </LinearGradient>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Style Assistant</Text>
              <Text style={styles.headerSubtitle}>Your personal AI stylist</Text>
            </View>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 1 && (
              <View style={styles.welcomeContainer}>
                <LinearGradient
                  colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
                  style={styles.welcomeIconContainer}
                >
                  <Ionicons name="chatbubbles" size={40} color={theme.colors.primary} />
                </LinearGradient>
                <Text style={styles.welcomeTitle}>Welcome to Style Assistant</Text>
                <Text style={styles.welcomeSubtitle}>
                  I&apos;m here to help you with outfit suggestions, style advice, and wardrobe organization
                </Text>
              </View>
            )}

            {messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageWrapper,
                  message.isUser && styles.userMessageWrapper,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.isUser ? styles.userMessage : styles.assistantMessage,
                  ]}
                >
                  {message.isUser ? (
                    <LinearGradient
                      colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                      style={styles.userMessageGradient}
                    >
                      <Text style={[styles.messageText, styles.userMessageText]}>
                        {message.text}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.messageText, styles.assistantMessageText]}>
                      {message.text}
                    </Text>
                  )}
                </View>
                <Text style={styles.timestamp}>
                  {formatTime(message.timestamp)}
                </Text>
              </View>
            ))}

            {isLoading && (
              <View style={styles.loadingIndicator}>
                <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
                <Text style={styles.loadingText}>Thinking...</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask me about your style or wardrobe..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                maxLength={500}
                editable={!isLoading}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <LinearGradient
                colors={(!inputText.trim() || isLoading) 
                  ? [theme.colors.border, theme.colors.border] 
                  : [theme.colors.primary, theme.colors.primary + 'CC']
                }
                style={styles.sendButtonGradient}
              >
                <Ionicons 
                  name="send" 
                  size={20} 
                  color={(!inputText.trim() || isLoading) ? theme.colors.textSecondary : theme.colors.background} 
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}
