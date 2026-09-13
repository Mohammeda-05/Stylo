import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useSubscription } from '../context/SubscriptionContext';
import { useGuest } from '../context/GuestContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useHints } from '../context/HintContext';
import HintWrapper from '../components/HintWrapper';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { useDataRefresh } from '../context/DataRefreshContext';

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { isPro } = useSubscription();
    const { isGuestMode } = useGuest();
    const navigation = useNavigation();
    const { showHint } = useHints();
    const { safeGetAll } = useSupabaseDB();
    const { onRefresh } = useDataRefresh();

    const [userStats, setUserStats] = useState({
        styleStreak: 0,
        bestScore: 0,
    });
    const [recentEvaluations, setRecentEvaluations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Helper function for consistent star conversion
    const getStarRating = (score: number) => {
        if (score >= 90) return 5;
        if (score >= 80) return 4;
        if (score >= 70) return 3;
        if (score >= 60) return 2;
        if (score >= 50) return 1;
        return 0;
    };

    // Get subscription plan colors - simplified since we only have pro/free
    const getSubscriptionColor = () => {
        return isPro ? '#FFD700' : theme.colors.primary; // Gold for pro, default for free
    };

    // Get subscription plan icon - simplified
    const getSubscriptionIcon = () => {
        return isPro ? 'star' : 'star-outline';
    };

    const getRelativeTime = React.useCallback((timestamp: any) => {
        const now = new Date();
        const evalTimestamp = typeof timestamp === 'number' ? timestamp : new Date(timestamp as string).getTime();
        const evalDate = new Date(evalTimestamp);
        const diffInHours = Math.floor((now.getTime() - evalDate.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;

        return evalDate.toLocaleDateString();
    }, []);

    const loadUserData = React.useCallback(async () => {
        if (isGuestMode) {
            // For guest mode, set default empty state
            setUserStats({
                styleStreak: 0,
                bestScore: 0,
            });
            setRecentEvaluations([]);
            setIsLoading(false);
            return;
        }

        try {
            setError(null);

            // Fetch directly from Supabase - no caching
            const evaluations = await safeGetAll('evaluations');

            if (!evaluations || evaluations.length === 0) {
                setUserStats({
                    styleStreak: 0,
                    bestScore: 0,
                });
                setRecentEvaluations([]);
                setIsLoading(false);
                return;
            }

            // Calculate best score with type checking
            const scores = evaluations
                .map(e => typeof e.score === 'number' ? e.score : 0)
                .filter(score => score > 0);
            const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

            // Calculate style streak
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let streak = 0;
            const sortedEvaluations = evaluations
                .filter(e => e.created_at && (typeof e.created_at === 'string'))
                .sort((a, b) => {
                    const dateA = new Date(a.created_at as string).getTime();
                    const dateB = new Date(b.created_at as string).getTime();
                    return dateB - dateA;
                });

            // Track which days have evaluations
            const evaluationDays = new Set();
            sortedEvaluations.forEach(evaluation => {
                const evalDate = new Date(evaluation.created_at as string);
                evalDate.setHours(0, 0, 0, 0);
                evaluationDays.add(evalDate.getTime());
            });

            // Check consecutive days - start from today or yesterday
            let currentDate = new Date(today);

            // If no evaluation today, start checking from yesterday
            if (!evaluationDays.has(currentDate.getTime())) {
                currentDate.setDate(currentDate.getDate() - 1);
            }

            // Count consecutive days with evaluations
            while (evaluationDays.has(currentDate.getTime())) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            }

            // Get recent evaluations (last 3) with images
            const recentEvals = evaluations
                .filter(e => e.created_at && typeof e.score === 'number')
                .sort((a, b) => {
                    const dateA = new Date(a.created_at as string).getTime();
                    const dateB = new Date(b.created_at as string).getTime();
                    return dateB - dateA;
                })
                .slice(0, 3)
                .map(evaluation => ({
                    id: evaluation.id,
                    score: evaluation.score,
                    occasion: typeof evaluation.occasion === 'string' ? evaluation.occasion : 'Casual',
                    createdAt: evaluation.created_at,
                    date: getRelativeTime(evaluation.created_at),
                    imageUri: evaluation.imageUri,
                    feedback: evaluation.feedback,
                    styleArchetype: evaluation.styleArchetype,
                }));

            setUserStats({
                styleStreak: streak,
                bestScore,
            });
            setRecentEvaluations(recentEvals);
            setIsLoading(false);

        } catch (error) {
            console.error("Error loading user data:");
            setError('Unable to load data. Please try again.');
            setIsLoading(false);

            // Set default empty state
            setUserStats({
                styleStreak: 0,
                bestScore: 0,
            });
            setRecentEvaluations([]);
        }
    }, [isGuestMode, safeGetAll, getRelativeTime]);

    const handleEvaluationPress = (evaluation: any) => {
        // Navigate to evaluation detail screen
        (navigation as any).navigate('EvaluationDetail', { evaluation });
    };

    // Refresh data when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadUserData();
        }, [loadUserData])
    );

    // Listen for refresh events (e.g., after evaluation)
    useEffect(() => {
        const unsubscribe = onRefresh((eventType) => {
            loadUserData();
        });

        return unsubscribe;
    }, [onRefresh, loadUserData]);

    // Show welcome hint on first visit only
    useEffect(() => {
        if (!isLoading && recentEvaluations.length === 0) {
            setTimeout(() => {
                showHint('home_first_visit');
            }, 1000);
        }
    }, [recentEvaluations.length, isLoading, showHint]);

    return (
        <HintWrapper>
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.welcomeText, { color: theme.colors.textSecondary }]}>
                                Ready to look amazing?
                            </Text>
                        </View>

                        <View style={styles.headerRight}>
                            {isPro && (
                                <View style={[styles.planBadge, { backgroundColor: getSubscriptionColor(), borderColor: getSubscriptionColor() }]}>
                                    <Ionicons name={getSubscriptionIcon() as any} size={16} color={theme.colors.background} />
                                    <Text style={[styles.planText, { color: theme.colors.background }]}>
                                        PRO
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.settingsButton, { backgroundColor: theme.colors.surface }]}
                                onPress={() => (navigation as any).navigate('Settings')}
                            >
                                <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Stats - Style Streak and Best Score */}
                    <View style={styles.statsContainer}>
                        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="flame" size={20} color={theme.colors.primary} style={styles.statIcon} />
                            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                                {isLoading ? '-' : userStats.styleStreak}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Style Streak</Text>
                        </View>

                        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
                            <Ionicons name="trophy" size={20} color={theme.colors.primary} style={styles.statIcon} />
                            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
                                {isLoading ? '-' : (userStats.bestScore > 0 ? userStats.bestScore : '-')}
                            </Text>
                            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Best Score</Text>
                        </View>
                    </View>

                    {/* Error Banner */}
                    {error && (
                        <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '20', borderColor: theme.colors.error + '40' }]}>
                            <Ionicons name="warning-outline" size={20} color={theme.colors.error} />
                            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
                            <TouchableOpacity
                                style={[styles.retryButton, { backgroundColor: theme.colors.error }]}
                                onPress={() => {
                                    setError(null);
                                    setIsLoading(true);
                                    loadUserData();
                                }}
                            >
                                <Text style={[styles.retryButtonText, { color: 'white' }]}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Recent Evaluations */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Evaluations</Text>
                            <TouchableOpacity onPress={() => (navigation as any).navigate('AllEvaluations')}>
                                <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>See All</Text>
                            </TouchableOpacity>
                        </View>

                        {isLoading ? (
                            <View style={[styles.loadingState, { backgroundColor: theme.colors.surface }]}>
                                <Ionicons name="refresh-outline" size={24} color={theme.colors.textSecondary} />
                                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
                            </View>
                        ) : recentEvaluations.length > 0 ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.evaluationsScroll}>
                                {recentEvaluations.map((evaluation) => (
                                    <TouchableOpacity
                                        key={evaluation.id}
                                        style={[styles.evaluationCard, { backgroundColor: theme.colors.surface }]}
                                        onPress={() => handleEvaluationPress(evaluation)}
                                    >
                                        <View style={[styles.evaluationImageContainer, { backgroundColor: theme.colors.border }]}>
                                            {evaluation.imageUri ? (
                                                <Image
                                                    source={{ uri: evaluation.imageUri }}
                                                    style={styles.evaluationImage}
                                                    contentFit="cover"
                                                />
                                            ) : (
                                                <Ionicons name="shirt-outline" size={32} color={theme.colors.textSecondary} />
                                            )}
                                        </View>
                                        <View style={styles.evaluationInfo}>
                                            <View style={styles.scoreContainer}>
                                                <Text style={[styles.evaluationScore, { color: theme.colors.text }]}>{evaluation.score}</Text>
                                                <View style={styles.scoreStars}>
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
                                            <Text style={[styles.evaluationOccasion, { color: theme.colors.textSecondary }]}>{evaluation.occasion}</Text>
                                            <Text style={[styles.evaluationDate, { color: theme.colors.textSecondary }]}>{evaluation.date}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        ) : (
                            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
                                <Ionicons name="camera-outline" size={48} color={theme.colors.textSecondary} />
                                <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>No evaluations yet</Text>
                                <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                                    Rate your first outfit to get started
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                            onPress={() => (navigation as any).navigate('Evaluate')}
                        >
                            <LinearGradient
                                colors={['#6366F1', '#8B5CF6']}
                                style={styles.actionIconContainer}
                            >
                                <Ionicons name="camera" size={24} color="white" />
                            </LinearGradient>
                            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Rate New Outfit</Text>
                            <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                                Get AI feedback on your style
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                            onPress={() => (navigation as any).navigate('OccasionScoring')}
                        >
                            <LinearGradient
                                colors={['#EC4899', '#BE185D']}
                                style={styles.actionIconContainer}
                            >
                                <Ionicons name="calendar" size={24} color="white" />
                            </LinearGradient>
                            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Occasion Scoring</Text>
                            <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                                Perfect outfit for any event
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                            onPress={() => (navigation as any).jumpTo('Wardrobe')}
                        >
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.actionIconContainer}
                            >
                                <Ionicons name="shirt" size={24} color="white" />
                            </LinearGradient>
                            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Browse Wardrobe</Text>
                            <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                                Organize your clothing items
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
                            onPress={() => (navigation as any).navigate('Assistant')}
                        >
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                style={styles.actionIconContainer}
                            >
                                <Ionicons name="chatbubbles" size={24} color="white" />
                            </LinearGradient>
                            <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Style Assistant</Text>
                            <Text style={[styles.actionSubtitle, { color: theme.colors.textSecondary }]}>
                                Chat with your AI stylist
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </HintWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    welcomeText: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        marginBottom: 4,
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
    },
    planText: {
        fontSize: 12,
        fontFamily: 'Inter_700Bold',
        marginLeft: 6,
        letterSpacing: 0.5,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    statIcon: {
        marginBottom: 8,
    },
    statNumber: {
        fontSize: 24,
        fontFamily: 'Inter_800ExtraBold',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
        textAlign: 'center',
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
    },
    seeAllText: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
    },
    evaluationsScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    evaluationCard: {
        width: 140,
        padding: 16,
        borderRadius: 16,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    evaluationImageContainer: {
        width: '100%',
        height: 80,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    evaluationImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    evaluationInfo: {
        alignItems: 'center',
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    evaluationScore: {
        fontSize: 18,
        fontFamily: 'Inter_800ExtraBold',
        marginBottom: 4,
    },
    scoreStars: {
        flexDirection: 'row',
        gap: 2,
    },
    evaluationOccasion: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
        marginBottom: 4,
    },
    evaluationDate: {
        fontSize: 10,
        fontFamily: 'Inter_500Medium',
    },
    emptyState: {
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    emptyStateTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        textAlign: 'center',
        lineHeight: 20,
    },
    actionsContainer: {
        gap: 16,
    },
    actionCard: {
        padding: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    actionIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    actionSubtitle: {
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
        lineHeight: 20,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 24,
        gap: 12,
    },
    errorText: {
        flex: 1,
        fontSize: 14,
        fontFamily: 'Inter_500Medium',
    },
    retryButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    retryButtonText: {
        fontSize: 12,
        fontFamily: 'Inter_600SemiBold',
    },
    loadingState: {
        padding: 32,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
        marginTop: 12,
    },
});