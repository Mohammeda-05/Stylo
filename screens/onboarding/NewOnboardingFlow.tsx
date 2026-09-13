import React, { useState } from 'react';
import { View, Text } from 'react-native';
import WelcomeScreen from './WelcomeScreen';
import QuestionScreen from './QuestionScreen';
import ValueScreen from './ValueScreen';
import LoadingScreen from './LoadingScreen';
import ReadyScreen from './ReadyScreen';
import TryForFreeScreen from './TryForFreeScreen';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

interface NewOnboardingFlowProps {
    onComplete: () => void;
}

const STYLE_GOAL_OPTIONS = [
    { id: 'put-together', label: 'Look more put-together', icon: 'sparkles' },
    { id: 'find-style', label: 'Find my personal style', icon: 'search' },
    { id: 'confidence', label: 'Build confidence in my look', icon: 'heart' },
    { id: 'success', label: 'Dress for success', icon: 'trending-up' },
];

const CHALLENGE_OPTIONS = [
    { id: 'what-looks-good', label: 'Don\'t know what looks good on me', icon: 'help-circle' },
    { id: 'combinations', label: 'Creating outfit combinations', icon: 'shuffle' },
    { id: 'organization', label: 'Keeping my wardrobe organized', icon: 'albums' },
    { id: 'occasions', label: 'Dressing for different occasions', icon: 'calendar' },
];

const STYLE_VIBE_OPTIONS = [
    { id: 'classic', label: 'Classic & Timeless', icon: 'star' },
    { id: 'trendy', label: 'Trendy & Bold', icon: 'flame' },
    { id: 'casual', label: 'Casual & Comfortable', icon: 'shirt' },
    { id: 'professional', label: 'Professional & Polished', icon: 'briefcase' },
];

export default function NewOnboardingFlow({ onComplete }: NewOnboardingFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [styleGoal, setStyleGoal] = useState<string | null>(null);
    const [challenge, setChallenge] = useState<string | null>(null);
    const [styleVibe, setStyleVibe] = useState<string | null>(null);

    const totalSteps = 9;

    const handleNext = () => {
        setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const getProgress = () => {
        return (currentStep + 1) / totalSteps;
    };

    // Step 0: Welcome
    if (currentStep === 0) {
        return <WelcomeScreen onContinue={handleNext} />;
    }

    // Step 1: Question 1 - Style Goal
    if (currentStep === 1) {
        return (
            <QuestionScreen
                question="What's your main style goal?"
                options={STYLE_GOAL_OPTIONS}
                selectedOption={styleGoal}
                onSelectOption={setStyleGoal}
                onContinue={handleNext}
                onBack={handleBack}
                progress={getProgress()}
            />
        );
    }

    // Step 2: Value Screen 1 - Results Proof
    if (currentStep === 2) {
        return (
            <ValueScreen
                title="Real results from real users"
                subtitle="Join thousands who've transformed their style confidence"
                visual={<ResultsChart />}
                onContinue={handleNext}
                onBack={handleBack}
                progress={getProgress()}
            />
        );
    }

    // Step 3: Question 2 - Challenge
    if (currentStep === 3) {
        return (
            <QuestionScreen
                question="What's your biggest style challenge?"
                options={CHALLENGE_OPTIONS}
                selectedOption={challenge}
                onSelectOption={setChallenge}
                onContinue={handleNext}
                onBack={handleBack}
                progress={getProgress()}
            />
        );
    }

    // Step 4: Value Screen 2 - Honest Feedback
    if (currentStep === 4) {
        return (
            <ValueScreen
                title="Get expert feedback, instantly"
                subtitle="AI-powered insights that help you look your best, every day"
                visual={<FeedbackVisual />}
                onContinue={handleNext}
                onBack={handleBack}
                progress={getProgress()}
            />
        );
    }

    // Step 5: Question 3 - Style Vibe
    if (currentStep === 5) {
        return (
            <QuestionScreen
                question="What's your style vibe?"
                options={STYLE_VIBE_OPTIONS}
                selectedOption={styleVibe}
                onSelectOption={setStyleVibe}
                onContinue={handleNext}
                onBack={handleBack}
                progress={getProgress()}
            />
        );
    }

    // Step 6: Value Screen 3 - Wardrobe Organization
    if (currentStep === 6) {
        return (
            <ValueScreen
                title="Your wardrobe, organized"
                subtitle="Never forget what you own. Always know what to wear."
                visual={<WardrobeVisual />}
                onContinue={handleNext}
                onBack={handleBack}
                progress={getProgress()}
            />
        );
    }

    // Step 7: Loading Screen
    if (currentStep === 7) {
        return <LoadingScreen onComplete={handleNext} />;
    }

    // Step 8: Ready Screen (NEW - Transition)
    if (currentStep === 8) {
        return <ReadyScreen onContinue={handleNext} />;
    }

    // Step 9: Try For Free Screen
    if (currentStep === 9) {
        return <TryForFreeScreen onContinue={onComplete} />;
    }

    return null;
}

// Visual Components with improved design
function ResultsChart() {
    return (
        <View style={styles.chartContainer}>
            <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>8.4</Text>
                    <Text style={styles.statLabel}>Avg. Style Score</Text>
                    <View style={styles.statBadge}>
                        <Ionicons name="trending-up" size={14} color="#10B981" />
                        <Text style={styles.statBadgeText}>+40%</Text>
                    </View>
                </View>

                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>30</Text>
                    <Text style={styles.statLabel}>Days to Transform</Text>
                    <View style={styles.statBadge}>
                        <Ionicons name="time" size={14} color="#8B5CF6" />
                        <Text style={styles.statBadgeText}>Proven</Text>
                    </View>
                </View>
            </View>

            <View style={styles.testimonial}>
                <Text style={styles.testimonialText}>
                    &quot;Finally understand what works for my body type&quot;
                </Text>
                <Text style={styles.testimonialAuthor}>— Sarah M.</Text>
            </View>
        </View>
    );
}

function FeedbackVisual() {
    return (
        <View style={styles.feedbackContainer}>
            <View style={styles.mockupCard}>
                <View style={styles.mockupHeader}>
                    <View style={styles.scoreCircle}>
                        <Text style={styles.scoreText}>8.7</Text>
                    </View>
                    <View style={styles.mockupInfo}>
                        <Text style={styles.mockupTitle}>Business Casual</Text>
                        <Text style={styles.mockupSubtitle}>Today, 9:30 AM</Text>
                    </View>
                </View>

                <View style={styles.feedbackList}>
                    <View style={styles.feedbackItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.feedbackText}>Perfect fit on blazer</Text>
                    </View>
                    <View style={styles.feedbackItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.feedbackText}>Colors complement well</Text>
                    </View>
                    <View style={styles.feedbackItem}>
                        <Ionicons name="bulb" size={20} color="#F59E0B" />
                        <Text style={styles.feedbackText}>Try brown shoes instead</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

function WardrobeVisual() {
    return (
        <View style={styles.wardrobeContainer}>
            <View style={styles.wardrobeStats}>
                <View style={styles.wardrobeStat}>
                    <Text style={styles.wardrobeNumber}>47</Text>
                    <Text style={styles.wardrobeLabel}>Items</Text>
                </View>
                <View style={styles.wardrobeDivider} />
                <View style={styles.wardrobeStat}>
                    <Text style={styles.wardrobeNumber}>156</Text>
                    <Text style={styles.wardrobeLabel}>Outfits</Text>
                </View>
                <View style={styles.wardrobeDivider} />
                <View style={styles.wardrobeStat}>
                    <Text style={styles.wardrobeNumber}>12</Text>
                    <Text style={styles.wardrobeLabel}>Favorites</Text>
                </View>
            </View>

            <View style={styles.wardrobeGrid}>
                {['shirt', 'shirt', 'shirt', 'shirt', 'shirt', 'shirt'].map((icon, index) => (
                    <View key={index} style={styles.wardrobeItem}>
                        <Ionicons name={icon as any} size={28} color="rgba(255, 255, 255, 0.9)" />
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // Results Chart Styles
    chartContainer: {
        width: '100%',
        gap: 32,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    statNumber: {
        fontSize: 36,
        fontWeight: '900',
        color: 'white',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginBottom: 12,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'white',
    },
    testimonial: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    testimonialText: {
        fontSize: 16,
        fontStyle: 'italic',
        color: 'white',
        marginBottom: 8,
        lineHeight: 24,
    },
    testimonialAuthor: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
    },

    // Feedback Visual Styles
    feedbackContainer: {
        width: '100%',
    },
    mockupCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    mockupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    scoreCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    scoreText: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
    },
    mockupInfo: {
        flex: 1,
    },
    mockupTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    mockupSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    feedbackList: {
        gap: 16,
    },
    feedbackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    feedbackText: {
        fontSize: 15,
        color: 'white',
        fontWeight: '500',
    },

    // Wardrobe Visual Styles
    wardrobeContainer: {
        width: '100%',
        gap: 24,
    },
    wardrobeStats: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    wardrobeStat: {
        alignItems: 'center',
    },
    wardrobeNumber: {
        fontSize: 28,
        fontWeight: '900',
        color: 'white',
        marginBottom: 4,
    },
    wardrobeLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    wardrobeDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    wardrobeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    wardrobeItem: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});