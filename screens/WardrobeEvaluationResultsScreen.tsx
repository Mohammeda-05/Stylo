import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { extractWardrobeScore } from '../services/aiValidation';
import { NavigationProp } from '@react-navigation/native';

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

export default function WardrobeEvaluationResultsScreen() {
  const { theme } = useTheme();
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<{ MainTabs: { screen: string } }>>();
  const { safeAdd } = useSupabaseDB();
  
  const [isSaving, setIsSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const { outfitData, aiEvaluation } = (route.params as { outfitData?: OutfitData; aiEvaluation?: string }) || {};

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 6,
    },
    saveButtonText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
      color: theme.colors.background,
    },
    content: {
      flex: 1,
    },
    outfitSection: {
      padding: 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    outfitName: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    itemsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 16,
    },
    itemImage: {
      width: 80,
      height: 80,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    itemsCount: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    evaluationSection: {
      padding: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    evaluationText: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.text,
      lineHeight: 24,
    },
    scoreContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    scoreNumber: {
      fontSize: 48,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.primary,
    },
    scoreLabel: {
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    actionButtons: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      paddingVertical: 16,
      gap: 12,
      backgroundColor: theme.colors.surface,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
    },
    primaryButtonText: {
      color: theme.colors.background,
    },
    secondaryButtonText: {
      color: theme.colors.text,
    },
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const saveOutfitCombination = async () => {
    if (!outfitData || !aiEvaluation) return;

    try {
      setIsSaving(true);
      
      await safeAdd('outfitCombinations', {
        name: outfitData.name,
        itemIds: JSON.stringify(outfitData.items.map(item => item.id)),
        createdAt: Date.now(),
        aiEvaluation,
      });
      const score = extractWardrobeScore(aiEvaluation);

      Alert.alert(
        'Outfit Saved! ✨',
        `"${outfitData.name}" has been saved.${score === null ? '' : ` Score: ${score}/10.`}`,
        [
          { text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Wardrobe' }) }
        ]
      );
    } catch (error) {
      console.error("Error saving outfit:");
      Alert.alert('Save Failed', 'Your outfit could not be saved. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const goBackToWardrobe = () => {
    navigation.navigate('MainTabs', { screen: 'Wardrobe' });
  };

  if (!outfitData || !aiEvaluation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.evaluationText}>No evaluation data found.</Text>
          <TouchableOpacity 
            style={[styles.actionButton, styles.primaryButton, { marginTop: 16 }]}
            onPress={goBackToWardrobe}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>Back to Wardrobe</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const score = extractWardrobeScore(aiEvaluation);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBackToWardrobe}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Outfit Evaluation</Text>
        <TouchableOpacity 
          style={styles.saveButton} 
          onPress={saveOutfitCombination}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Ionicons name="hourglass" size={16} color={theme.colors.background} />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </>
          ) : (
            <>
              <Ionicons name="bookmark" size={16} color={theme.colors.background} />
              <Text style={styles.saveButtonText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Outfit Display */}
          <View style={styles.outfitSection}>
            <Text style={styles.outfitName}>{outfitData.name}</Text>
            <View style={styles.itemsContainer}>
              {outfitData.items.slice(0, 4).map((item, index) => (
                <Image
                  key={item.id}
                  source={{ uri: item.imageUri }}
                  style={styles.itemImage}
                  contentFit="cover"
                />
              ))}
              {outfitData.items.length > 4 && (
                <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: theme.colors.textSecondary, fontFamily: 'Inter_600SemiBold' }}>
                    +{outfitData.items.length - 4}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.itemsCount}>
              {outfitData.items.length} items • AI Evaluated
            </Text>
          </View>

          {/* Score */}
          <View style={styles.evaluationSection}>
            <View style={styles.scoreContainer}>
              <Text style={styles.scoreNumber}>{score ?? '—'}</Text>
              <Text style={styles.scoreLabel}>{score === null ? 'Score unavailable' : 'out of 10'}</Text>
            </View>

            {/* AI Evaluation */}
            <Text style={styles.sectionTitle}>AI Stylist Feedback</Text>
            <Text style={styles.evaluationText}>{aiEvaluation}</Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]}
          onPress={goBackToWardrobe}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Back to Wardrobe</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.primaryButton]}
          onPress={saveOutfitCombination}
          disabled={isSaving}
        >
          <Ionicons name="bookmark" size={20} color={theme.colors.background} />
          <Text style={[styles.buttonText, styles.primaryButtonText]}>
            {isSaving ? 'Saving...' : 'Save Outfit'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
