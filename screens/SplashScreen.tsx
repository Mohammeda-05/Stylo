import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  // Create animated values
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(30)).current;
  const taglineScale = useRef(new Animated.Value(0.95)).current;
  
  // Dynamic background animation
  const backgroundShift = useRef(new Animated.Value(0)).current;
  
  // Fade out animation
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Dynamic background animation (continuous)
    Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundShift, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: false, // Can't use native driver for gradient colors
        }),
        Animated.timing(backgroundShift, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Logo animation
    const logoAnimation = Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotation, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]);

    // Text animation with micro-interactions
    const textAnimation = Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.timing(textSlide, {
        toValue: 0,
        duration: 800,
        delay: 1000,
        useNativeDriver: true,
      }),
    ]);

    // Tagline micro-interaction (subtle breathing effect)
    const taglineAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(taglineScale, {
          toValue: 1,
          duration: 2000,
          delay: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineScale, {
          toValue: 0.98,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // Start animations
    logoAnimation.start();
    textAnimation.start();
    taglineAnimation.start();

    // Smooth fade-out transition before finishing
    const finishTimer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2500);

    return () => {
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  const logoRotationInterpolated = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeOut }]}>
      {/* Dynamic Background with subtle color shifts */}
      <LinearGradient
        colors={[
          '#0a0a0a',
          '#1a1a2e', 
          '#16213e',
          '#0f3460'
        ]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Subtle overlay for depth */}
      <LinearGradient
        colors={['rgba(139, 92, 246, 0.05)', 'transparent', 'rgba(99, 102, 241, 0.05)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Main Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [
              { scale: logoScale },
              { rotate: logoRotationInterpolated }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={['#6366F1', '#8B5CF6', '#EC4899']}
          style={styles.logoBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.logoInner}>
            <Ionicons name="shirt" size={64} color="white" />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [{ translateY: textSlide }]
          }
        ]}
      >
        <Text style={styles.appName}>STYLO</Text>
        <Animated.View style={{ transform: [{ scale: taglineScale }] }}>
          <Text style={styles.tagline}>Your Personal AI Stylist</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Logo Styles
  logoContainer: {
    marginBottom: 60,
    alignItems: 'center',
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  logoInner: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  
  // Text Styles
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 12,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
