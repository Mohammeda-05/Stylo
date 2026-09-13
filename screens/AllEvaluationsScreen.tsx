import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useDataRefresh } from '../context/DataRefreshContext';

interface Evaluation {
    id: string;
    score: number;
    occasion: string;
    createdAt: number | string;
    imageUri?: string;
    feedback?: string;
    styleArchetype?: string;
}

export default function AllEvaluationsScreen() {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { safeGetAll, safeDelete } = useSupabaseDB();
    const navigation = useNavigation();
    const { onRefresh } = useDataRefresh();

    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [filteredEvaluations, setFilteredEvaluations] = useState<Evaluation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'newest' | 'oldest' | 'highest' | 'lowest'>('all');

    // Helper function for consistent star conversion
    const getStarRating = (score: number) => {
        if (score >= 90) return 5;
        if (score >= 80) return 4;
        if (score >= 70) return 3;
        if (score >= 60) return 2;
        if (score >= 50) return 1;
        return 0;
    };

    const applyFiltersAndSort = React.useCallback(() => {
        let filtered = [...evaluations];

        // Apply search filter
        if (searchQuery.trim()) {
            filtered = filtered.filter(evaluation =>
                evaluation.occasion.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (evaluation.styleArchetype && evaluation.styleArchetype.toLowerCase().includes(searchQuery.toLowerCase())) ||
                evaluation.score.toString().includes(searchQuery)
            );
        }

        // Apply sorting based on selected filter
        filtered.sort((a, b) => {
            switch (selectedFilter) {
                case 'oldest':
                    const dateA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt as string).getTime();
                    const dateB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt as string).getTime();
                    return dateA - dateB;
                case 'highest':
                    return b.score - a.score;
                case 'lowest':
                    return a.score - b.score;
                case 'newest':
                case 'all':
                default:
                    const dateC = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt as string).getTime();
                    const dateD = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt as string).getTime();
                    return dateD - dateC;
            }
        });

        setFilteredEvaluations(filtered);
    }, [evaluations, searchQuery, selectedFilter]);

    const loadEvaluations = React.useCallback(async () => {
        try {
            const allEvaluations = await safeGetAll('evaluations');

            if (!allEvaluations || allEvaluations.length === 0) {
                setEvaluations([]);
                setFilteredEvaluations([]);
                setIsLoading(false);
                return;
            }

            // Process and sort evaluations
            const processedEvaluations = allEvaluations
                .filter(e => e.createdAt && typeof e.score === 'number')
                .map(evaluation => ({
                    id: evaluation.id,
                    score: evaluation.score as number,
                    occasion: typeof evaluation.occasion === 'string' ? evaluation.occasion : 'Casual',
                    createdAt: evaluation.createdAt as number | string,
                    imageUri: evaluation.imageUri as string | undefined,
                    feedback: evaluation.feedback as string | undefined,
                    styleArchetype: evaluation.styleArchetype as string | undefined,
                }))
                .sort((a, b) => {
                    const dateA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt as string).getTime();
                    const dateB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt as string).getTime();
                    return dateB - dateA; // Newest first by default
                });

            setEvaluations(processedEvaluations);
            setFilteredEvaluations(processedEvaluations);
            setIsLoading(false);
        } catch (error) {
            console.error("Error loading evaluations:");
            Alert.alert('Error', 'Failed to load evaluations. Please try again.');
            setIsLoading(false);
        }
    }, [safeGetAll]);

    const getRelativeTime = (timestamp: any) => {
        const now = new Date();
        const evalTimestamp = typeof timestamp === 'number' ? timestamp : new Date(timestamp as string).getTime();
        const evalDate = new Date(evalTimestamp);
        const diffInHours = Math.floor((now.getTime() - evalDate.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Yesterday';
        if (diffInDays < 7) return `${diffInDays} days ago`;
        if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;

        return evalDate.toLocaleDateString();
    };

    // Load evaluations when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            loadEvaluations();
        }, [loadEvaluations])
    );

    // Listen for refresh events (e.g., after evaluation)
    useEffect(() => {
        const unsubscribe = onRefresh((eventType) => {
            loadEvaluations();
        });

        return unsubscribe;
    }, [onRefresh, loadEvaluations]);

    // Apply filters whenever dependencies change
    useEffect(() => {
        applyFiltersAndSort();
    }, [applyFiltersAndSort]);

    const handleEvaluationPress = (evaluation: Evaluation) => {
        (navigation as any).navigate('EvaluationDetail', { evaluation });
    };

    const handleDeleteEvaluation = async (evaluationId: string) => {
        Alert.alert(
            'Delete Evaluation',
            'Are you sure you want to delete this evaluation? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await safeDelete('evaluations', evaluationId);
                            // Reload evaluations
                            loadEvaluations();
                        } catch (error) {
                            console.error("Error deleting evaluation:");
                            Alert.alert('Error', 'Failed to delete evaluation. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const renderFilterButton = (filter: typeof selectedFilter, label: string) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                {
                    backgroundColor: selectedFilter === filter ? theme.colors.primary : theme.colors.surface,
                    borderColor: selectedFilter === filter ? theme.colors.primary : theme.colors.border,
                }
            ]}
            onPress={() => setSelectedFilter(filter)}
        >
            <Text style={[
                styles.filterButtonText,
                { color: selectedFilter === filter ? 'white' : theme.colors.text }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Single ScrollView for everything */}
            <ScrollView
                style={styles.mainScrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: insets.top + 20 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                    </TouchableOpacity>

                    <View style={styles.headerContent}>
                        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>All Evaluations</Text>
                        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                            {filteredEvaluations.length} evaluation{filteredEvaluations.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
                        <TextInput
                            style={[styles.searchInput, { color: theme.colors.text }]}
                            placeholder="Search by occasion, style, or score..."
                            placeholderTextColor={theme.colors.textSecondary}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Filters */}
                <View style={styles.filtersContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
                        {renderFilterButton('all', 'All')}
                        {renderFilterButton('newest', 'Newest')}
                        {renderFilterButton('oldest', 'Oldest')}
                        {renderFilterButton('highest', 'Highest Score')}
                        {renderFilterButton('lowest', 'Lowest Score')}
                    </ScrollView>
                </View>

                {/* Evaluations List */}
                <View style={styles.evaluationsList}>
                    {isLoading ? (
                        <View style={styles.loadingContainer}>
                            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading evaluations...</Text>
                        </View>
                    ) : filteredEvaluations.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="shirt-outline" size={64} color={theme.colors.textSecondary} />
                            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                                {searchQuery || selectedFilter !== 'all' ? 'No matching evaluations' : 'No evaluations yet'}
                            </Text>
                            <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                                {searchQuery || selectedFilter !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Rate your first outfit to get started'
                                }
                            </Text>
                        </View>
                    ) : (
                        filteredEvaluations.map((evaluation) => (
                            <TouchableOpacity
                                key={evaluation.id}
                                style={[styles.evaluationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                onPress={() => handleEvaluationPress(evaluation)}
                            >
                                <View style={styles.cardContent}>
                                    {evaluation.imageUri && (
                                        <Image
                                            source={{ uri: evaluation.imageUri }}
                                            style={styles.evaluationImage}
                                            contentFit="cover"
                                        />
                                    )}

                                    <View style={styles.evaluationInfo}>
                                        <View style={styles.evaluationHeader}>
                                            <Text style={[styles.occasionText, { color: theme.colors.text }]}>
                                                {evaluation.occasion}
                                            </Text>
                                            <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                                                {getRelativeTime(evaluation.createdAt)}
                                            </Text>
                                        </View>

                                        <View style={styles.scoreContainer}>
                                            <Text style={[styles.scoreText, { color: theme.colors.primary }]}>
                                                {evaluation.score}/100
                                            </Text>
                                            <View style={styles.starsContainer}>
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Ionicons
                                                        key={star}
                                                        name={star <= getStarRating(evaluation.score) ? 'star' : 'star-outline'}
                                                        size={16}
                                                        color={star <= getStarRating(evaluation.score) ? '#FFD700' : theme.colors.textSecondary}
                                                    />
                                                ))}
                                            </View>
                                        </View>

                                        {evaluation.styleArchetype && (
                                            <Text style={[styles.archetypeText, { color: theme.colors.textSecondary }]}>
                                                {evaluation.styleArchetype}
                                            </Text>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.deleteButton}
                                        onPress={() => handleDeleteEvaluation(evaluation.id)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainScrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 28,
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
    },
    filtersContainer: {
        marginBottom: 20,
    },
    filtersScroll: {
        paddingHorizontal: 20,
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        marginRight: 12,
    },
    filterButtonText: {
        fontSize: 14,
        fontFamily: 'Inter_600SemiBold',
    },
    evaluationsList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
    },
    emptyState: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontFamily: 'Inter_600SemiBold',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyStateSubtitle: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        textAlign: 'center',
    },
    evaluationCard: {
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
        overflow: 'hidden',
    },
    cardContent: {
        flexDirection: 'row',
        padding: 16,
    },
    evaluationImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        marginRight: 16,
    },
    evaluationInfo: {
        flex: 1,
    },
    evaluationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    occasionText: {
        fontSize: 18,
        fontFamily: 'Inter_600SemiBold',
    },
    timeText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    scoreText: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
        marginRight: 12,
    },
    starsContainer: {
        flexDirection: 'row',
    },
    archetypeText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    deleteButton: {
        padding: 8,
    },
});