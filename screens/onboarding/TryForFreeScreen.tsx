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

interface TryForFreeScreenProps {
    onContinue: () => void;
}

export default function TryForFreeScreen({ onContinue }: TryForFreeScreenProps) {
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
                {/* Icon */}
                <View style={styles.iconContainer}>
                    <View style={styles.iconBackground}>
                        <Ionicons name="gift" size={64} color="#8B5CF6" />
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>Try STYLO for free</Text>
                <Text style={styles.subtitle}>
                    No payment required now. Start your style journey today.
                </Text>

                {/* Benefits */}
                <View style={styles.benefitsContainer}>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text style={styles.benefitText}>Full access to all features</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text style={styles.benefitText}>AI-powered outfit analysis</Text>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        <Text style={styles.benefitText}>Personalized recommendations</Text>
                    </View>
                </View>

                {/* Pricing Card */}
                <View style={styles.pricingCard}>
                    <Text style={styles.pricingLabel}>Get started today</Text>
                    <Text style={styles.pricingAmount}>$0.00</Text>
                    <Text style={styles.pricingNote}>No payment due now</Text>
                </View>
            </Animated.View>

            {/* Bottom Section */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.tryButton} onPress={onContinue}>
                    <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.tryButtonText}>Get Started</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.termsText}>
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </Text>
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
        paddingHorizontal: 32,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconBackground: {
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
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        marginBottom: 48,
        lineHeight: 26,
    },
    benefitsContainer: {
        gap: 20,
        marginBottom: 40,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    benefitText: {
        fontSize: 17,
        fontWeight: '600',
        color: 'white',
    },
    pricingCard: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    pricingLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: 8,
        fontWeight: '600',
    },
    pricingAmount: {
        fontSize: 48,
        fontWeight: '900',
        color: 'white',
        marginBottom: 8,
    },
    pricingNote: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        gap: 16,
    },
    tryButton: {
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
    tryButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
    },
    termsText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        lineHeight: 18,
    },
});