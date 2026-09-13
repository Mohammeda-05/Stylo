import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

interface HintBannerProps {
  hint: {
    id: string;
    emoji: string;
    message: string;
    type: 'info' | 'success' | 'tip' | 'celebration';
  };
  onDismiss: (hintId: string) => void;
  autoDismissDelay?: number;
}

export default function HintBanner({ hint, onDismiss, autoDismissDelay = 4000 }: HintBannerProps) {
  const { theme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Auto-dismiss timer
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          slideAnim.setValue(gestureState.dy);
          opacityAnim.setValue(1 + gestureState.dy / 100);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -50) {
          handleDismiss();
        } else {
          // Snap back
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(opacityAnim, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const getHintColors = () => {
    switch (hint.type) {
      case 'success':
        return {
          primary: theme.colors.success,
          background: `${theme.colors.success}15`,
          border: `${theme.colors.success}30`,
        };
      case 'celebration':
        return {
          primary: theme.colors.primary,
          background: `${theme.colors.primary}15`,
          border: `${theme.colors.primary}30`,
        };
      case 'tip':
        return {
          primary: theme.colors.accent,
          background: `${theme.colors.accent}15`,
          border: `${theme.colors.accent}30`,
        };
      default:
        return {
          primary: theme.colors.primary,
          background: `${theme.colors.primary}15`,
          border: `${theme.colors.primary}30`,
        };
    }
  };

  const colors = getHintColors();

  const handleDismiss = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      onDismiss(hint.id);
    });
  };

  useEffect(() => {
    const currentSlideAnim = slideAnim;
    const currentOpacityAnim = opacityAnim;
    const currentScaleAnim = scaleAnim;
    const currentProgressAnim = progressAnim;
    const currentAutoDismissDelay = autoDismissDelay;

    // Entrance animation
    const slideAnimation = Animated.spring(currentSlideAnim, {
      toValue: 0,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    });

    const opacityAnimation = Animated.timing(currentOpacityAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    });

    const scaleAnimation = Animated.spring(currentScaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    });

    const progressAnimation = Animated.timing(currentProgressAnim, {
      toValue: 1,
      duration: currentAutoDismissDelay,
      useNativeDriver: false,
    });

    Animated.parallel([slideAnimation, opacityAnimation, scaleAnimation]).start();
    progressAnimation.start();

    // Auto-dismiss timer
    dismissTimer.current = setTimeout(() => {
      handleDismiss();
    }, currentAutoDismissDelay);

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [slideAnim, opacityAnim, scaleAnim, progressAnim, autoDismissDelay, handleDismiss]);

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    hintCard: {
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    blurContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emojiContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    emoji: {
      fontSize: 20,
    },
    contentContainer: {
      flex: 1,
      marginRight: 12,
    },
    hintText: {
      fontSize: 15,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.text,
      lineHeight: 20,
    },
    dismissButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${theme.colors.textSecondary}20`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    progressBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      height: 3,
      backgroundColor: colors.primary,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
  });

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.hintCard}>
        <BlurView intensity={80} tint={theme.name === 'default' ? 'dark' : 'light'}>
          <View style={styles.blurContainer}>
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>{hint.emoji}</Text>
            </View>
            
            <View style={styles.contentContainer}>
              <Text style={styles.hintText}>{hint.message}</Text>
            </View>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name="close" 
                size={16} 
                color={theme.colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </BlurView>

        <Animated.View
          style={[
            styles.progressBar,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}
