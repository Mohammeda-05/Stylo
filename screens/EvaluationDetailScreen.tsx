import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

export default function EvaluationDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { evaluation } = route.params as { evaluation: any };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I got a ${evaluation.score}/100 style score on STYLO! ${evaluation.feedback}`,
      });
    } catch (error) {
      console.error("Error sharing:");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Evaluation Details
        </Text>
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: theme.colors.surface }]}
          onPress={handleShare}
        >
          <Ionicons name="share-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Outfit Image */}
        <Image source={{ uri: evaluation.imageUri }} style={styles.outfitImage} contentFit="cover" />

        {/* Score Section */}
        <View style={[styles.scoreSection, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.scoreHeader}>
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                Style Score
              </Text>
              <Text style={[styles.scoreValue, { color: getScoreColor(evaluation.score) }]}>
                {evaluation.score}/100
              </Text>
            </View>
            {evaluation.occasionScore && (
              <View style={styles.scoreInfo}>
                <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                  Occasion Score
                </Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(evaluation.occasionScore) }]}>
                  {evaluation.occasionScore}/100
                </Text>
              </View>
            )}
          </View>

          {evaluation.styleArchetype && (
            <View style={styles.archetypeContainer}>
              <Text style={[styles.archetypeLabel, { color: theme.colors.textSecondary }]}>
                Style Archetype
              </Text>
              <Text style={[styles.archetypeValue, { color: theme.colors.primary }]}>
                {evaluation.styleArchetype}
              </Text>
            </View>
          )}

          {evaluation.occasion && (
            <View style={styles.occasionContainer}>
              <Text style={[styles.occasionLabel, { color: theme.colors.textSecondary }]}>
                Evaluated for
              </Text>
              <Text style={[styles.occasionValue, { color: theme.colors.text }]}>
                {evaluation.occasion}
              </Text>
            </View>
          )}
        </View>

        {/* Feedback Section */}
        <View style={[styles.feedbackSection, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Overall Feedback
          </Text>
          <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
            {evaluation.feedback}
          </Text>
        </View>

        {/* Appropriateness (for occasion scoring) */}
        {evaluation.appropriateness && (
          <View style={[styles.feedbackSection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Occasion Appropriateness
            </Text>
            <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
              {evaluation.appropriateness}
            </Text>
          </View>
        )}

        {/* Strengths */}
        {evaluation.strengths && evaluation.strengths.length > 0 && (
          <View style={[styles.feedbackSection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.success }]}>
              What Works Well
            </Text>
            {evaluation.strengths.map((strength: string, index: number) => (
              <View key={index} style={styles.feedbackItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={[styles.feedbackItemText, { color: theme.colors.textSecondary }]}>
                  {strength}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Improvements */}
        {evaluation.improvements && evaluation.improvements.length > 0 && (
          <View style={[styles.feedbackSection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.warning }]}>
              Suggestions for Improvement
            </Text>
            {evaluation.improvements.map((improvement: string, index: number) => (
              <View key={index} style={styles.feedbackItem}>
                <Ionicons name="bulb" size={16} color={theme.colors.warning} />
                <Text style={[styles.feedbackItemText, { color: theme.colors.textSecondary }]}>
                  {improvement}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Occasion Suggestions */}
        {evaluation.suggestions && evaluation.suggestions.length > 0 && (
          <View style={[styles.feedbackSection, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              Occasion-Specific Suggestions
            </Text>
            {evaluation.suggestions.map((suggestion: string, index: number) => (
              <View key={index} style={styles.feedbackItem}>
                <Ionicons name="star" size={16} color={theme.colors.primary} />
                <Text style={[styles.feedbackItemText, { color: theme.colors.textSecondary }]}>
                  {suggestion}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Date */}
        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            Evaluated on {new Date(evaluation.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  outfitImage: {
    width: '100%',
    height: 400,
    borderRadius: 16,
    marginBottom: 24,
  },
  scoreSection: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  scoreInfo: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 36,
    fontFamily: 'Inter_800ExtraBold',
  },
  archetypeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  archetypeLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  archetypeValue: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  occasionContainer: {
    alignItems: 'center',
  },
  occasionLabel: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginBottom: 4,
  },
  occasionValue: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  feedbackSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    lineHeight: 24,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  feedbackItemText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  dateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});