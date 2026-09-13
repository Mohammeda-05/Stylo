import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface LoadingScreenProps {
    onComplete: () => void;
}

const CHECKLIST_ITEMS = [
    'Analyzing your style preferences',
    'Calibrating AI recommendations',
    'Setting up your wardrobe',
    'Preparing personalized insights',
];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [percentage, setPercentage] = useState(0);
    const [checkedItems, setCheckedItems] = useState<number[]>([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Fade in animation
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Percentage counter
        const percentageInterval = setInterval(() => {
            setPercentage((prev) => {
                if (prev >= 95) {
                    clearInterval(percentageInterval);
                    return 95;
                }
                return prev + 5;
            });
        }, 100);

        // Progress bar animation
        Animated.timing(progressAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
        }).start();

        // Check items one by one
        CHECKLIST_ITEMS.forEach((_, index) => {
            setTimeout(() => {
                setCheckedItems((prev) => [...prev, index]);
            }, 500 + index * 600);
        });

        // Complete after 3.5 seconds
        const completeTimeout = setTimeout(() => {
            onComplete();
        }, 3500);

        return () => {
            clearInterval(percentageInterval);
            clearTimeout(completeTimeout);
        };
    }, [fadeAnim, progressAnim, onComplete]);

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
                    { opacity: fadeAnim },
                ]}
            >
                {/* Percentage */}
                <Text style={styles.percentage}>{percentage}%</Text>

                {/* Title */}
                <Text style={styles.title}>Setting up your style profile</Text>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
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

                {/* Checklist */}
                <View style={styles.checklist}>
                    {CHECKLIST_ITEMS.map((item, index) => (
                        <View key={index} style={styles.checklistItem}>
                            <View style={[
                                styles.checkIcon,
                                checkedItems.includes(index) && styles.checkIconActive
                            ]}>
                                {checkedItems.includes(index) && (
                                    <Ionicons name="checkmark" size={16} color="white" />
                                )}
                            </View>
                            <Text style={[
                                styles.checklistText,
                                checkedItems.includes(index) && styles.checklistTextActive
                            ]}>
                                {item}
                            </Text>
                        </View>
                    ))}
                </View>
            </Animated.View>
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
    percentage: {
        fontSize: 72,
        fontWeight: '900',
        color: 'white',
        marginBottom: 24,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: 'white',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 30,
    },
    progressBarContainer: {
        width: width - 64,
        height: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 48,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#8B5CF6',
        borderRadius: 4,
    },
    checklist: {
        width: '100%',
        gap: 16,
    },
    checklistItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    checkIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkIconActive: {
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
    },
    checklistText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '500',
    },
    checklistTextActive: {
        color: 'white',
        fontWeight: '600',
    },
});