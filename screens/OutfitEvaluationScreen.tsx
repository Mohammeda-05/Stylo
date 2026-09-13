import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { useGuest } from '../context/GuestContext';
import { useTheme } from '../context/ThemeContext';
import { useDataRefresh } from '../context/DataRefreshContext';
import { useHints } from '../context/HintContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { pickImageFromCamera, pickImageFromLibrary } from '../services/imageService';
import { evaluateOutfitForOccasion, generateStyleJourneyInsights } from '../services/aiService';

export default function OutfitEvaluationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { isGuestMode } = useGuest();
  const { safeAdd, safeGetAll, safeUpdate } = useSupabaseDB();
  const { triggerRefresh } = useDataRefresh();
  const { showHint } = useHints();
  const [selectedImageData, setSelectedImageData] = useState<{uri: string, base64?: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [prefilledOutfit, setPrefilledOutfit] = useState<any>(null);

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

  // Handle pre-filled outfit from wardrobe
  useEffect(() => {
    const params = route.params as any;
    if (params?.prefilledOutfit) {
      setPrefilledOutfit(params.prefilledOutfit);
      setSelectedImageData({ uri: params.prefilledOutfit.imageUri });
    } else {
      // Show hint for first-time users on evaluation screen
      setTimeout(() => {
        showHint('evaluate_first_visit');
      }, 1000);
    }
  }, [route.params, showHint]);

  const handleTakePhoto = async () => {
    try {
      const result = await pickImageFromCamera();
      if (result) {
        setSelectedImageData({
          uri: result.uri,
          base64: result.base64
        });
        setEvaluation(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const handleSelectPhoto = async () => {
    try {
      const result = await pickImageFromLibrary();
      if (result) {
        setSelectedImageData({
          uri: result.uri,
          base64: result.base64
        });
        setEvaluation(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const handleEvaluate = async () => {
    if (!selectedImageData || (!selectedImageData.base64 && !prefilledOutfit)) return;

    setIsLoading(true);
    try {
      
      setEvaluation(null);
      if (!selectedImageData.base64) {
        throw new Error('Choose or take a photo of the full outfit before analysis.');
      }
      const aiEvaluation = await evaluateOutfitForOccasion(
        'Please evaluate this outfit for general style and provide detailed feedback.',
        [],
        selectedImageData.base64
      );
      const evaluationResult = {
        score: aiEvaluation.overallScore,
        feedback: aiEvaluation.feedback,
        styleArchetype: aiEvaluation.styleArchetype,
        strengths: aiEvaluation.strengths,
        improvements: aiEvaluation.improvements,
      };

      setEvaluation(evaluationResult);

      // Save evaluation to database (only for signed-in users)
      if (!isGuestMode) {
        try {
          // BATCHED: Do all database operations together with minimal calls
          await updateAllStatsAndEvaluation(evaluationResult);

          // Trigger immediate refresh on ProfileScreen's Style Progress section
          triggerRefresh('evaluation_completed');

          // Show hints for first-time users
          const evaluations = await safeGetAll('evaluations');
          if (evaluations && evaluations.length === 1) {
            // First evaluation
            setTimeout(() => {
              showHint('after_first_score');
            }, 1500);
          } else if (evaluationResult.score >= 85) {
            // High score celebration
            setTimeout(() => {
              showHint('high_score_achieved');
            }, 2000);
          }
        } catch (dbError) {
          console.error("Database error:");
          // Don't fail the whole evaluation if database save fails
          Alert.alert(
            'Save Failed',
            'Your evaluation was completed but couldn\'t be saved. Please check your connection and try again.',
            [{ text: 'OK' }]
          );
        }
      } else if (isGuestMode) {
        // For guest mode, show a hint about signing up
        setTimeout(() => {
          showHint('guest_evaluation_completed');
        }, 1500);
      }
    } catch (error) {
      console.error("Evaluation error:");
      Alert.alert('Error', `Failed to evaluate outfit: ${error instanceof Error ? error.message : 'Analysis unavailable'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Batched database operations to reduce API calls
  const updateAllStatsAndEvaluation = async (evaluationResult: any) => {
    if (isGuestMode) return;

    try {
      const today = new Date().toDateString();
      
      // 1. Save evaluation first
      await safeAdd('evaluations', {
        imageUri: selectedImageData!.uri,
        score: evaluationResult.score,
        feedback: evaluationResult.feedback,
        styleArchetype: evaluationResult.styleArchetype,
        occasion: prefilledOutfit ? `Wardrobe: ${prefilledOutfit.name}` : '',
        createdAt: Date.now(),
      });

      // 2. Get current stats (single call)
      const stats = await safeGetAll('userStats');
      
      if (stats && stats.length > 0) {
        const currentStats = stats[0];
        const lastEvaluationDate = currentStats.lastEvaluationDate;
        
        // Calculate new streak
        let newStreak = 1;
        if (lastEvaluationDate !== today) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayString = yesterday.toDateString();
          
          if (lastEvaluationDate === yesterdayString) {
            const currentStreak = typeof currentStats.styleStreak === 'number' ? currentStats.styleStreak : 0;
            newStreak = currentStreak + 1;
          }
        } else {
          const currentStreak = typeof currentStats.styleStreak === 'number' ? currentStats.styleStreak : 0;
          newStreak = currentStreak;
        }
        
        // 3. Update stats with streak (insights will be generated separately in ProfileScreen)
        await safeUpdate('userStats', currentStats.id, {
          styleStreak: newStreak,
          lastEvaluationDate: today,
          lastUpdated: Date.now(),
        });
      } else {
        // First time user, create new stats record
        await safeAdd('userStats', {
          styleStreak: 1,
          lastEvaluationDate: today,
          averageScore: 0,
          weeklyOutfitCount: 0,
          dominantStyle: '',
          bestScore: 0,
          lastUpdated: Date.now(),
        });
      }
    } catch (error) {
      console.error("Error updating stats and evaluation:");
      throw error;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

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
        {/* Enhanced Header with Gradient */}
        <LinearGradient
          colors={[theme.colors.background, theme.colors.background + '00']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                {prefilledOutfit ? `Rate: ${prefilledOutfit.name}` : 'Outfit Evaluation'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                Get AI-powered style feedback
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Enhanced prefilled outfit info */}
          {prefilledOutfit && (
            <View style={[styles.prefilledOutfitInfo, { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' }]}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primary + '80']}
                style={styles.prefilledIconContainer}
              >
                <Ionicons name="shirt" size={20} color={theme.colors.background} />
              </LinearGradient>
              <View style={styles.prefilledTextContainer}>
                <Text style={[styles.prefilledOutfitText, { color: theme.colors.text }]}>
                  Rating outfit from your wardrobe
                </Text>
                <Text style={[styles.prefilledOutfitSubtext, { color: theme.colors.textSecondary }]}>
                  {prefilledOutfit.name}
                </Text>
              </View>
            </View>
          )}

          {/* Enhanced Image Selection */}
          {!selectedImageData ? (
            <View style={styles.imageSelectionContainer}>
              <View style={styles.imageHeaderRow}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    Upload Outfit Photo
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                    Take or select a clear, full-body photo
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.guidelinesButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => setShowGuidelines(true)}
                >
                  <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />
                  <Text style={[styles.guidelinesButtonText, { color: theme.colors.primary }]}>
                    Tips
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.imagePlaceholder, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
                <LinearGradient
                  colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
                  style={styles.placeholderGradient}
                >
                  <Ionicons name="camera-outline" size={64} color={theme.colors.primary} />
                  <Text style={[styles.placeholderText, { color: theme.colors.text }]}>
                    Select or take a photo of your outfit
                  </Text>
                  <Text style={[styles.placeholderSubtext, { color: theme.colors.textSecondary }]}>
                    Best results with good lighting and full-body shots
                  </Text>
                </LinearGradient>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.photoButton, styles.primaryButton]}
                  onPress={handleTakePhoto}
                >
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="camera" size={24} color={theme.colors.background} />
                    <Text style={[styles.buttonText, { color: theme.colors.background }]}>
                      Take Photo
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoButton, styles.secondaryButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={handleSelectPhoto}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="images" size={24} color={theme.colors.text} />
                    <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                      Choose from Library
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <View style={[styles.selectedImageContainer, { backgroundColor: theme.colors.surface }]}>
                <Image source={{ uri: selectedImageData.uri }} style={styles.selectedImage} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)']}
                  style={styles.imageOverlay}
                />
              </View>
              
              <View style={styles.imageActions}>
                {!isLoading && !evaluation && !prefilledOutfit && (
                  <TouchableOpacity
                    style={[styles.changePhotoButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => {
                      setSelectedImageData(null);
                      setEvaluation(null);
                      setPrefilledOutfit(null);
                    }}
                  >
                    <Ionicons name="refresh" size={16} color={theme.colors.text} />
                    <Text style={[styles.changePhotoText, { color: theme.colors.text }]}>
                      Change Photo
                    </Text>
                  </TouchableOpacity>
                )}

                {!evaluation && (
                  <TouchableOpacity
                    style={[
                      styles.evaluateButton, 
                      { 
                        flex: isLoading ? 1 : (prefilledOutfit ? 2 : 3)
                      }
                    ]}
                    onPress={handleEvaluate}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={isLoading ? [theme.colors.border, theme.colors.border] : [theme.colors.primary, theme.colors.primary + 'CC']}
                      style={styles.buttonGradient}
                    >
                      {isLoading ? (
                        <ActivityIndicator color={theme.colors.background} />
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={20} color={theme.colors.background} />
                          <Text style={[styles.evaluateButtonText, { color: theme.colors.background }]}>
                            {prefilledOutfit ? 'Rate Outfit' : 'Evaluate Outfit'}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Enhanced Evaluation Results */}
          {evaluation && (
            <View style={styles.resultsContainer}>
              <View style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]}>
                <LinearGradient
                  colors={[getScoreColor(evaluation.score) + '20', getScoreColor(evaluation.score) + '10']}
                  style={styles.scoreCardGradient}
                >
                  <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                    Style Score
                  </Text>
                  <Text style={[styles.scoreValue, { color: getScoreColor(evaluation.score) }]}>
                    {evaluation.score}/100
                  </Text>
                  {evaluation.styleArchetype && (
                    <View style={[styles.archetypeBadge, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary + '40' }]}>
                      <Text style={[styles.styleArchetype, { color: theme.colors.primary }]}>
                        {evaluation.styleArchetype}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </View>

              <View style={[styles.feedbackCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.feedbackHeader}>
                  <Ionicons name="chatbubble-ellipses" size={24} color={theme.colors.primary} />
                  <Text style={[styles.feedbackTitle, { color: theme.colors.text }]}>
                    AI Feedback
                  </Text>
                </View>
                <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
                  {evaluation.feedback}
                </Text>
              </View>

              {evaluation.strengths && evaluation.strengths.length > 0 && (
                <View style={[styles.feedbackCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.feedbackHeader}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
                    <Text style={[styles.feedbackTitle, { color: theme.colors.success }]}>
                      What Works Well
                    </Text>
                  </View>
                  {evaluation.strengths.map((strength: string, index: number) => (
                    <View key={index} style={styles.feedbackItem}>
                      <View style={[styles.feedbackItemIcon, { backgroundColor: theme.colors.success + '20' }]}>
                        <Ionicons name="checkmark" size={14} color={theme.colors.success} />
                      </View>
                      <Text style={[styles.feedbackItemText, { color: theme.colors.textSecondary }]}>
                        {strength}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {evaluation.improvements && evaluation.improvements.length > 0 && (
                <View style={[styles.feedbackCard, { backgroundColor: theme.colors.surface }]}>
                  <View style={styles.feedbackHeader}>
                    <Ionicons name="bulb" size={24} color={theme.colors.warning} />
                    <Text style={[styles.feedbackTitle, { color: theme.colors.warning }]}>
                      Suggestions for Improvement
                    </Text>
                  </View>
                  {evaluation.improvements.map((improvement: string, index: number) => (
                    <View key={index} style={styles.feedbackItem}>
                      <View style={[styles.feedbackItemIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                        <Ionicons name="bulb-outline" size={14} color={theme.colors.warning} />
                      </View>
                      <Text style={[styles.feedbackItemText, { color: theme.colors.textSecondary }]}>
                        {improvement}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Enhanced Bottom Actions */}
              <View style={styles.bottomActions}>
                <TouchableOpacity
                  style={styles.occasionButton}
                  onPress={() => {
                    (navigation as any).navigate('OccasionScoring', { 
                      imageData: selectedImageData 
                    });
                  }}
                >
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.primary + 'CC']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="calendar-outline" size={20} color={theme.colors.background} />
                    <Text style={[styles.occasionButtonText, { color: theme.colors.background }]}>
                      Evaluate for Occasion
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.resetButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => {
                    setSelectedImageData(null);
                    setEvaluation(null);
                  }}
                >
                  <Ionicons name="refresh-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.resetButtonText, { color: theme.colors.text }]}>
                    Evaluate Another Outfit
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Enhanced Loading Message */}
          {isLoading && !evaluation && (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient
                colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
                style={styles.loadingGradient}
              >
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={[styles.loadingText, { color: theme.colors.text }]}>
                  {prefilledOutfit ? 'Rating your outfit...' : 'Stylo is analyzing...'}
                </Text>
                <Text style={[styles.loadingSubtext, { color: theme.colors.textSecondary }]}>
                  This may take up to 30 seconds
                </Text>
              </LinearGradient>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Enhanced Guidelines Modal */}
      <Modal
        visible={showGuidelines}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGuidelines(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <BlurView intensity={80} tint={theme.name === 'default' ? 'dark' : 'light'} style={styles.modalBlur}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: theme.colors.surface }]}
                onPress={() => setShowGuidelines(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Photo Guidelines
              </Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.guidelineSection, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.guidelineHeader}>
                  <Ionicons name="camera" size={24} color={theme.colors.success} />
                  <Text style={[styles.guidelineSectionTitle, { color: theme.colors.success }]}>
                    Best Photo Tips
                  </Text>
                </View>
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  • Take photos in good natural lighting (near a window works great){'\n'}
                  • Show your full outfit from head to toe{'\n'}
                  • Stand straight with arms at your sides or slightly away from body{'\n'}
                  • Use a plain background when possible{'\n'}
                  • Make sure the photo is clear and not blurry{'\n'}
                  • Face the camera directly for best results
                </Text>
              </View>

              <View style={[styles.guidelineSection, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.guidelineHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  <Text style={[styles.guidelineSectionTitle, { color: theme.colors.primary }]}>
                    What Works Well
                  </Text>
                </View>
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  • Full-body shots showing complete outfit{'\n'}
                  • Mirror selfies or photos taken by someone else{'\n'}
                  • Multiple angles if you want detailed feedback{'\n'}
                  • Casual, everyday outfits and special occasion looks{'\n'}
                  • Both indoor and outdoor photos{'\n'}
                  • Any style - formal, casual, trendy, or classic
                </Text>
              </View>

              <View style={[styles.guidelineSection, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.guidelineHeader}>
                  <Ionicons name="shield-checkmark" size={24} color={theme.colors.warning} />
                  <Text style={[styles.guidelineSectionTitle, { color: theme.colors.warning }]}>
                    Content Guidelines
                  </Text>
                </View>
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  • Keep photos appropriate and family-friendly{'\n'}
                  • Focus on clothing and styling rather than poses{'\n'}
                  • Avoid overly revealing or inappropriate content{'\n'}
                  • No offensive text, symbols, or imagery on clothing{'\n'}
                  • Respect others if they appear in your photos{'\n'}
                  • Photos should primarily showcase your outfit choices
                </Text>
              </View>

              <View style={[styles.guidelineSection, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.guidelineHeader}>
                  <Ionicons name="information-circle" size={24} color={theme.colors.text} />
                  <Text style={[styles.guidelineSectionTitle, { color: theme.colors.text }]}>
                    Privacy & Safety
                  </Text>
                </View>
                <Text style={[styles.guidelineText, { color: theme.colors.textSecondary }]}>
                  • Your photos are only used for AI style analysis{'\n'}
                  • Images are processed securely and not stored permanently{'\n'}
                  • No personal information should be visible in photos{'\n'}
                  • Avoid showing identifying details like addresses or license plates{'\n'}
                  • You can delete photos anytime from your device{'\n'}
                  • We respect your privacy and data security
                </Text>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.gotItButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => setShowGuidelines(false)}
                >
                  <Text style={[styles.gotItButtonText, { color: theme.colors.background }]}>
                    Got It!
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </BlurView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backButton: {
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
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
  },
  imageSelectionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 24,
  },
  guidelinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  guidelinesButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    marginBottom: 32,
  },
  placeholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  placeholderText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  photoButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButton: {},
  secondaryButton: {
    borderWidth: 1,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedImageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  selectedImage: {
    width: 280,
    height: 280,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minWidth: 120,
  },
  changePhotoText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  evaluateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  evaluateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  resultsContainer: {
    gap: 20,
    paddingBottom: 32,
  },
  scoreCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  scoreCardGradient: {
    padding: 32,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 48,
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: 16,
  },
  archetypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  styleArchetype: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  feedbackCard: {
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  feedbackTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  feedbackText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 16,
  },
  feedbackItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  feedbackItemText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    flex: 1,
  },
  loadingContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  loadingGradient: {
    padding: 48,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  bottomActions: {
    gap: 16,
    marginTop: 8,
  },
  occasionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  occasionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  prefilledOutfitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  prefilledIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  prefilledTextContainer: {
    flex: 1,
  },
  prefilledOutfitText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  prefilledOutfitSubtext: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  modalContainer: {
    flex: 1,
  },
  modalBlur: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  guidelineSection: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  guidelineSectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  guidelineText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 22,
  },
  modalFooter: {
    paddingVertical: 24,
  },
  gotItButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  gotItButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
});
