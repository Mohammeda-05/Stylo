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

interface Option {
    id: string;
    label: string;
    icon: string;
}

interface QuestionScreenProps {
    question: string;
    options: Option[];
    selectedOption: string | null;
    onSelectOption: (optionId: string) => void;
    onContinue: () => void;
    onBack: () => void;
    progress: number;
}

export default function QuestionScreen({
                                           question,
                                           options,
                                           selectedOption,
                                           onSelectOption,
                                           onContinue,
                                           onBack,
                                           progress,
                                       }: QuestionScreenProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        fadeAnim.setValue(0);
        slideAnim.setValue(50);

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, [question, fadeAnim, slideAnim]);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <LinearGradient
                colors={['#2D1B4E', '#1E1B3C', '#0F172A']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />

            {/* Header with Progress */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                { width: `${progress * 100}%` },
                            ]}
                        />
                    </View>
                </View>
            </View>

            {/* Content */}
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <Text style={styles.question}>{question}</Text>

                <View style={styles.optionsContainer}>
                    {options.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.optionCard,
                                selectedOption === option.id && styles.optionCardSelected,
                            ]}
                            onPress={() => onSelectOption(option.id)}
                        >
                            <View style={styles.optionContent}>
                                <Ionicons
                                    name={option.icon as any}
                                    size={28}
                                    color={selectedOption === option.id ? '#8B5CF6' : 'white'}
                                />
                                <Text style={[
                                    styles.optionLabel,
                                    selectedOption === option.id && styles.optionLabelSelected,
                                ]}>
                                    {option.label}
                                </Text>
                            </View>
                            {selectedOption === option.id && (
                                <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>

            {/* Continue Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        !selectedOption && styles.continueButtonDisabled,
                    ]}
                    onPress={onContinue}
                    disabled={!selectedOption}
                >
                    <Text style={[
                        styles.continueButtonText,
                        !selectedOption && styles.continueButtonTextDisabled,
                    ]}>
                        Continue
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 16,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    progressContainer: {
        flex: 1,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#8B5CF6',
        borderRadius: 2,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    question: {
        fontSize: 28,
        fontWeight: '800',
        color: 'white',
        marginBottom: 32,
        lineHeight: 36,
    },
    optionsContainer: {
        gap: 12,
    },
    optionCard: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    optionCardSelected: {
        backgroundColor: 'white',
        borderColor: '#8B5CF6',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    optionLabel: {
        fontSize: 17,
        fontWeight: '600',
        color: 'white',
        flex: 1,
    },
    optionLabelSelected: {
        color: '#1F2937',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },
    continueButton: {
        backgroundColor: 'white',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    continueButtonDisabled: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        shadowOpacity: 0,
    },
    continueButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#8B5CF6',
    },
    continueButtonTextDisabled: {
        color: 'rgba(255, 255, 255, 0.5)',
    },
});