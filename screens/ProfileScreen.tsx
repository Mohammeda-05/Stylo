import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSupabaseAuth } from '../src/context/SupabaseAuthContext';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { useTheme } from '../context/ThemeContext';
import { useHints } from '../context/HintContext';
import { useGuest } from '../context/GuestContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { generateStyleJourneyInsights } from '../services/aiService';

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { isGuestMode } = useGuest();
    const { user } = useSupabaseAuth();
    const { safeGetAll } = useSupabaseDB();
    const { showHint } = useHints();
    const { onRefresh } = useDataRefresh();

    const [userStats, setUserStats] = useState<{
        averageScore: number; styleStreak: number; bestScore: number;
        totalEvaluations: number; recentEvaluations: { id: string; score: number; imageUri: string; created_at: string }[];
    }>({
        averageScore: 0,
        styleStreak: 0,
        bestScore: 0,
        totalEvaluations: 0,
        recentEvaluations: [],
    });
    const [styleJourneyInsight, setStyleJourneyInsight] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingInsights, setIsLoadingInsights] = useState(false);
    const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

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

    const loadUserData = useCallback(async (showLoading = false) => {
        if (isGuestMode) {
            // For guest mode, set default empty state
            setUserStats({
                averageScore: 0,
                styleStreak: 0,
                bestScore: 0,
                totalEvaluations: 0,
                recentEvaluations: [],
            });
            setStyleJourneyInsight('Sign up to unlock personalized style insights and track your progress! 🌟');
            if (showLoading) {
                setIsLoading(false);
                setHasInitiallyLoaded(true);
            }
            return;
        }

        if (showLoading) {
            setIsLoading(true);
        }

        try {
            // Fetch directly from Supabase - no caching
            const evaluations = await safeGetAll('evaluations');

            if (evaluations && evaluations.length > 0) {
                const scores = evaluations.map((e: any) => e.score).filter((s: number) => s > 0);
                const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
                const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

                // Calculate style streak (consecutive days with evaluations)
                const sortedEvaluations = evaluations.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                let streak = 0;
                let currentDate = new Date();
                currentDate.setHours(0, 0, 0, 0);

                for (const evaluation of sortedEvaluations) {
                    const evalDate = new Date(evaluation.created_at as string);
                    evalDate.setHours(0, 0, 0, 0);

                    const daysDiff = Math.floor((currentDate.getTime() - evalDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (daysDiff === streak) {
                        streak++;
                        currentDate.setDate(currentDate.getDate() - 1);
                    } else {
                        break;
                    }
                }

                setUserStats({
                    averageScore: avgScore,
                    styleStreak: streak,
                    bestScore: bestScore,
                    totalEvaluations: evaluations.length,
                    recentEvaluations: sortedEvaluations.slice(0, 5),
                });

                // Generate style journey insights if we have enough data
                if (evaluations.length >= 3) {
                    setIsLoadingInsights(true);
                    try {
                        // Create a summary of evaluations for the AI
                        const evaluationSummary = evaluations.map((e: any) => ({
                            score: e.score,
                            feedback: e.feedback,
                            date: new Date(e.created_at).toLocaleDateString()
                        }));

                        const insights = await generateStyleJourneyInsights(
                            `Analyze this user's style journey based on their ${evaluations.length} outfit evaluations. Here's their evaluation history: ${JSON.stringify(evaluationSummary)}. Their average score is ${avgScore} and best score is ${bestScore}. Provide warm, encouraging insights about their style evolution, what's working well, and exciting directions they could explore. Remember to write in natural paragraphs without lists or formatting.`,
                            []
                        );
                        setStyleJourneyInsight(insights);
                    } catch (error) {
                        console.error("Error generating insights:");
                        setStyleJourneyInsight('Keep up the great work with your style evaluations! The more outfits you evaluate, the better I can understand your unique style journey and provide personalized insights to help you shine even brighter.');
                    } finally {
                        setIsLoadingInsights(false);
                    }
                } else {
                    setStyleJourneyInsight('Start evaluating outfits to unlock personalized style insights! 🌟');
                }
            } else {
                // No evaluations yet
                setUserStats({
                    averageScore: 0,
                    styleStreak: 0,
                    bestScore: 0,
                    totalEvaluations: 0,
                    recentEvaluations: [],
                });
                setStyleJourneyInsight('Start evaluating outfits to unlock personalized style insights! 🌟');
            }
        } catch (error) {
            console.error("Error loading user data:");
            // Set empty state on error
            setUserStats({
                averageScore: 0,
                styleStreak: 0,
                bestScore: 0,
                totalEvaluations: 0,
                recentEvaluations: [],
            });
            setStyleJourneyInsight('Unable to load your style data. Please try again.');
        } finally {
            if (showLoading) {
                setIsLoading(false);
                setHasInitiallyLoaded(true);
            }
        }
    }, [safeGetAll, isGuestMode]);

    // Initial load only - happens once when component mounts
    useEffect(() => {
        if (!hasInitiallyLoaded) {
            loadUserData(true);

            // Show profile hint on first visit
            setTimeout(() => {
                showHint('profile_first_visit');
            }, 1000);
        }
    }, [loadUserData, showHint, hasInitiallyLoaded]);

    // Refresh data when screen comes into focus OR when evaluation is completed
    useFocusEffect(
        React.useCallback(() => {
            if (!isGuestMode && hasInitiallyLoaded) {
                loadUserData(false);
            }
        }, [isGuestMode, hasInitiallyLoaded, loadUserData])
    );

    // Listen for evaluation completion trigger
    useEffect(() => {
        const cleanup = onRefresh((eventType) => {
            if (eventType === 'evaluation_completed' && !isGuestMode && hasInitiallyLoaded) {
                loadUserData(false);
            }
        });

        return cleanup;
    }, [onRefresh, isGuestMode, hasInitiallyLoaded, loadUserData]);

    const getScoreColor = (score: number) => {
        if (score >= 80) return theme.colors.success;
        if (score >= 60) return theme.colors.warning;
        return theme.colors.error;
    };

    const getScoreGrade = (score: number) => {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        return 'D';
    };

    const getStarRating = (score: number) => {
        return Math.ceil(score / 20);
    };

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={styles.loadingContainer}>
                    <LinearGradient
                        colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
                        style={styles.loadingGradient}
                    >
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                            Loading your style profile...
                        </Text>
                    </LinearGradient>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
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
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Enhanced Header */}
                    <LinearGradient
                        colors={[theme.colors.background, theme.colors.background + '00']}
                        style={styles.headerGradient}
                    >
                        <View style={styles.header}>
                            <View style={styles.userInfoContainer}>
                                <View style={styles.avatarContainer}>
                                    <LinearGradient
                                        colors={[theme.colors.primary, theme.colors.primary + '80']}
                                        style={styles.avatarGradient}
                                    >
                                        <Ionicons name="person" size={32} color={theme.colors.background} />
                                    </LinearGradient>
                                </View>
                                <View style={styles.userTextContainer}>
                                    <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
                                        Your Style Profile
                                    </Text>
                                    <Text style={[styles.userName, { color: theme.colors.text }]}>
                                        {isGuestMode ? 'Guest User' : (user?.user_metadata?.username || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Fashionista')}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                style={[styles.settingsButton, { backgroundColor: theme.colors.surface }]}
                                onPress={() => navigation.navigate('Settings' as never)}
                            >
                                <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>

                    {/* Enhanced Score Card */}
                    <View style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]}>
                        <LinearGradient
                            colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
                            style={styles.scoreGradient}
                        >
                            <BlurView intensity={20} tint={theme.name === 'default' ? 'dark' : 'light'} style={styles.scoreBlur}>
                                <View style={styles.scoreContent}>
                                    <View style={styles.scoreMain}>
                                        <Text style={[styles.scoreValue, { color: getScoreColor(userStats.averageScore) }]}>
                                            {userStats.averageScore}
                                        </Text>
                                        <View style={[styles.gradeContainer, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary + '40' }]}>
                                            <Text style={[styles.scoreGrade, { color: theme.colors.primary }]}>
                                                {getScoreGrade(userStats.averageScore)}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                                        Average Style Score
                                    </Text>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </View>

                    {/* Enhanced Stats Grid */}
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                            <LinearGradient
                                colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
                                style={styles.statGradient}
                            >
                                <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                                    <Ionicons name="flame" size={24} color={theme.colors.primary} />
                                </View>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {userStats.styleStreak}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                    Style Streak
                                </Text>
                            </LinearGradient>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                            <LinearGradient
                                colors={[theme.colors.success + '15', theme.colors.success + '05']}
                                style={styles.statGradient}
                            >
                                <View style={[styles.statIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
                                    <Ionicons name="trophy" size={24} color={theme.colors.success} />
                                </View>
                                <Text style={[styles.statValue, { color: theme.colors.text }]}>
                                    {userStats.bestScore > 0 ? userStats.bestScore : '--'}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                                    Best Score
                                </Text>
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Enhanced Journey Card */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Your Style Journey
                        </Text>

                        <View style={[styles.journeyCard, { backgroundColor: theme.colors.surface }]}>
                            <LinearGradient
                                colors={[theme.colors.success + '10', theme.colors.success + '05']}
                                style={styles.journeyGradient}
                            >
                                <View style={styles.journeyHeader}>
                                    <View style={[styles.journeyIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
                                        <Ionicons name="trending-up" size={24} color={theme.colors.success} />
                                    </View>
                                    <Text style={[styles.journeyTitle, { color: theme.colors.text }]}>
                                        Style Progress
                                    </Text>
                                </View>

                                {isLoadingInsights ? (
                                    <View style={styles.insightsLoading}>
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                        <Text style={[styles.loadingInsightsText, { color: theme.colors.textSecondary }]}>
                                            Analyzing your style journey...
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={[styles.journeyDescription, { color: theme.colors.textSecondary }]}>
                                        {styleJourneyInsight || 'Start evaluating outfits to unlock personalized style insights! 🌟'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </View>
                    </View>

                    {/* Enhanced Quick Actions */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Quick Actions
                        </Text>

                        <View style={styles.actionsGrid}>
                            <TouchableOpacity
                                style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                                onPress={() => navigation.navigate('Evaluate' as never)}
                            >
                                <LinearGradient
                                    colors={[theme.colors.primary + '15', theme.colors.primary + '05']}
                                    style={styles.actionGradient}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                                        <Ionicons name="camera" size={32} color={theme.colors.primary} />
                                    </View>
                                    <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                                        Evaluate Outfit
                                    </Text>
                                    <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                                        Get AI feedback
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                                onPress={() => navigation.navigate('OccasionScoring' as never)}
                            >
                                <LinearGradient
                                    colors={[theme.colors.warning + '15', theme.colors.warning + '05']}
                                    style={styles.actionGradient}
                                >
                                    <View style={[styles.actionIconContainer, { backgroundColor: theme.colors.warning + '20' }]}>
                                        <Ionicons name="calendar" size={32} color={theme.colors.warning} />
                                    </View>
                                    <Text style={[styles.actionTitle, { color: theme.colors.text }]}>
                                        Occasion Scoring
                                    </Text>
                                    <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                                        Perfect for events
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Enhanced Recent Activity */}
                    {userStats.recentEvaluations.length > 0 && (
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                                Recent Activity
                            </Text>

                            {userStats.recentEvaluations.map((evaluation: any, index) => (
                                <TouchableOpacity
                                    key={evaluation.id || index}
                                    style={[styles.activityCard, { backgroundColor: theme.colors.surface }]}
                                    onPress={() => (navigation as any).navigate('EvaluationDetail', { evaluation })}
                                >
                                    <LinearGradient
                                        colors={[getScoreColor(evaluation.score) + '10', getScoreColor(evaluation.score) + '05']}
                                        style={styles.activityGradient}
                                    >
                                        <View style={styles.activityInfo}>
                                            <View style={styles.activityScoreContainer}>
                                                <View style={[styles.activityScoreBadge, { backgroundColor: getScoreColor(evaluation.score) + '20', borderColor: getScoreColor(evaluation.score) + '40' }]}>
                                                    <Text style={[styles.activityScore, { color: getScoreColor(evaluation.score) }]}>
                                                        {evaluation.score}
                                                    </Text>
                                                </View>
                                                <View style={styles.activityStars}>
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Ionicons
                                                            key={star}
                                                            name={star <= getStarRating(evaluation.score) ? 'star' : 'star-outline'}
                                                            size={12}
                                                            color={theme.colors.primary}
                                                        />
                                                    ))}
                                                </View>
                                            </View>
                                            <Text style={[styles.activityDate, { color: theme.colors.textSecondary }]}>
                                                {new Date(evaluation.createdAt).toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={[styles.activityArrowContainer, { backgroundColor: theme.colors.primary + '20' }]}>
                                            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
                                        </View>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
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
        paddingHorizontal: 48,
    },
    loadingGradient: {
        padding: 48,
        borderRadius: 24,
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
    },
    headerGradient: {
        paddingBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 24,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        marginRight: 16,
    },
    avatarGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    userTextContainer: {
        flex: 1,
    },
    greeting: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
    },
    userName: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        marginTop: 4,
    },
    settingsButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginLeft: 12,
    },
    scoreCard: {
        marginHorizontal: 24,
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    scoreGradient: {
        padding: 2,
    },
    scoreBlur: {
        padding: 32,
        borderRadius: 22,
    },
    scoreContent: {
        alignItems: 'center',
    },
    scoreMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 16,
    },
    scoreValue: {
        fontSize: 48,
        fontFamily: 'Inter_800ExtraBold',
    },
    gradeContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    scoreGrade: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
    },
    scoreLabel: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        marginBottom: 32,
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statGradient: {
        padding: 24,
        alignItems: 'center',
        gap: 12,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
    },
    statLabel: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        textAlign: 'center',
    },
    section: {
        paddingHorizontal: 24,
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
        marginBottom: 16,
    },
    journeyCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    journeyGradient: {
        padding: 24,
    },
    journeyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    journeyIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    journeyTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
    },
    journeyDescription: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        lineHeight: 24,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    actionCard: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionGradient: {
        padding: 24,
        alignItems: 'center',
        gap: 12,
    },
    actionIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTitle: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        textAlign: 'center',
    },
    actionSubtitle: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
    },
    activityCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    activityGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
    },
    activityInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    activityScoreContainer: {
        alignItems: 'center',
    },
    activityScoreBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 6,
    },
    activityScore: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
    },
    activityStars: {
        flexDirection: 'row',
        gap: 2,
    },
    activityDate: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    activityArrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightsLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 16,
    },
    loadingInsightsText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
});