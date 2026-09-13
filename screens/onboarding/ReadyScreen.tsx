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

interface ReadyScreenProps {
    onContinue: () => void;
}

export default function ReadyScreen({ onContinue }: ReadyScreenProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const iconScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]),
            Animated.spring(iconScale, {
                toValue: 1,
                tension: 40,
                friction: 6,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

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
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Success Icon */}
                <Animated.View
                    style={[
                        styles.iconContainer,
                        {
                            transform: [{ scale: iconScale }],
                        },
                    ]}
                >
                    <View style={styles.iconBackground}>
                        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                    </View>
                </Animated.View>

                {/* Title */}
                <Text style={styles.title}>Your personalized style setup is ready</Text>

                {/* Subtitle */}
                <Text style={styles.subtitle}>
                    You&apos;re just one step away from starting your AI style journey
                </Text>

                {/* Features List */}
                <View style={styles.featuresList}>
                    <View style={styles.featureItem}>
                        <Ionicons name="sparkles" size={20} color="#8B5CF6" />
                        <Text style={styles.featureText}>AI-powered outfit analysis</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="trending-up" size={20} color="#8B5CF6" />
                        <Text style={styles.featureText}>Personalized recommendations</Text>
                    </View>
                    <View style={styles.featureItem}>
                        <Ionicons name="shirt" size={20} color="#8B5CF6" />
                        <Text style={styles.featureText}>Smart wardrobe organization</Text>
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
                        <Text style={styles.continueButtonText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={20} color="white" />
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
    iconContainer: {
        marginBottom: 40,
    },
    iconBackground: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: 'white',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 36,
    },
    subtitle: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 26,
        marginBottom: 48,
    },
    featuresList: {
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
    featureText: {
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 18,
    },
    continueButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: 'white',
    },
});