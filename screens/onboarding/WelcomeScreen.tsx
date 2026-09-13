import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface WelcomeScreenProps {
    onContinue: () => void;
}

export default function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

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
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim, scaleAnim]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <LinearGradient
                colors={['#2D1B4E', '#1E1B3C', '#0F172A']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [
                            { translateY: slideAnim },
                            { scale: scaleAnim }
                        ],
                    },
                ]}
            >
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <View style={styles.logoBackground}>
                        <Ionicons name="sparkles" size={64} color="#8B5CF6" />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Your AI Fashion Advisor</Text>
                <Text style={styles.subtitle}>
                    Get expert outfit feedback, build your style, look your best
                </Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                    <View style={styles.featureItem}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="camera" size={22} color="#8B5CF6" />
                        </View>
                        <Text style={styles.featureText}>AI-powered outfit scoring</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="shirt" size={22} color="#8B5CF6" />
                        </View>
                        <Text style={styles.featureText}>Virtual wardrobe management</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <View style={styles.featureIcon}>
                            <Ionicons name="chatbubbles" size={22} color="#8B5CF6" />
                        </View>
                        <Text style={styles.featureText}>Personal style assistant</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Continue Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
                    <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.continueButtonText}>Let&apos;s Get Started</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    logoContainer: {
        marginBottom: 48,
    },
    logoBackground: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: 'white',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 48,
    },
    featuresContainer: {
        gap: 20,
        width: '100%',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },
    featureIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    continueButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    buttonGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: 'white',
    },
});