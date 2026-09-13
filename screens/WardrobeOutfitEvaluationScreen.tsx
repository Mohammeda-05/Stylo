import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { generateAIResponse } from '../services/aiService';

interface WardrobeItem {
  id: string;
  imageUri: string;
  category: string;
  name: string;
  color: string;
  season?: string;
}

interface OutfitData {
  name: string;
  items: WardrobeItem[];
  imageUri: string;
  isFromWardrobe: boolean;
}

export default function WardrobeOutfitEvaluationScreen() {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const [isEvaluating, setIsEvaluating] = useState(true);

  const outfitData = (route.params as any)?.prefilledOutfit as OutfitData;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    loadingContainer: {
      alignItems: 'center',
      gap: 24,
    },
    title: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    outfitName: {
      fontSize: 20,
      fontFamily: 'Inter_600SemiBold',
      color: theme.colors.primary,
      textAlign: 'center',
      marginTop: 16,
    },
  });

  useEffect(() => {
    if (!outfitData) {
      Alert.alert('Error', 'No outfit data found', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      return;
    }

    evaluateOutfit();
  }, [outfitData]);

  const evaluateOutfit = async () => {
    try {
      setIsEvaluating(true);

      // Create detailed description of the outfit for AI
      const outfitDescription = outfitData.items.map(item => 
        `${item.name} (${item.category}${item.color && item.color !== 'Not specified' ? `, ${item.color}` : ''}${item.season ? `, ${item.season}` : ''})`
      ).join(', ');

      const prompt = `As a professional fashion stylist and outfit evaluator, please analyze this outfit combination and provide a comprehensive evaluation:

OUTFIT: "${outfitData.name}"
ITEMS: ${outfitDescription}

Please evaluate this outfit as if someone were to wear these items together and provide:

1. OVERALL SCORE (1-10): Rate the overall styling, coordination, and fashion appeal
2. STYLE ANALYSIS: What style category does this outfit represent? (e.g., casual chic, professional, bohemian, etc.)
3. COLOR HARMONY: How well do the colors work together?
4. VERSATILITY: How versatile is this outfit for different occasions?
5. STRENGTHS: What works really well about this combination?
6. IMPROVEMENTS: What could be changed or added to enhance the look?
7. OCCASION SUITABILITY: What occasions/settings would this outfit be perfect for?

Keep your response detailed but concise, focusing on practical styling advice. Be encouraging while providing honest, constructive feedback.`;

      const aiResponse = await generateAIResponse(prompt, []);

      // Navigate to results screen with the AI evaluation
      (navigation as any).navigate('WardrobeEvaluationResults', {
        outfitData,
        aiEvaluation: aiResponse,
      });

    } catch (error) {
      console.error("Error evaluating outfit:");
      Alert.alert(
        'Evaluation Failed',
        'Unable to evaluate the outfit right now. Please try again later.',
        [
          { text: 'Try Again', onPress: evaluateOutfit },
          { text: 'Cancel', onPress: () => navigation.goBack() }
        ]
      );
    }
  };

  if (!outfitData) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <View>
          <Text style={styles.title}>Evaluating Outfit</Text>
          <Text style={styles.subtitle}>
            Our AI stylist is analyzing your outfit combination and preparing detailed feedback...
          </Text>
          <Text style={styles.outfitName}>&quot;{outfitData.name}&quot;</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
