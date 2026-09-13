import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { pickImageFromCamera, pickImageFromLibrary } from '../services/imageService';
import { evaluateOutfitForOccasion } from '../services/aiService';

const OCCASIONS = [
  { id: 'work', name: 'Work/Business', icon: 'briefcase-outline' },
  { id: 'casual', name: 'Casual Day Out', icon: 'walk-outline' },
  { id: 'date', name: 'Date Night', icon: 'heart-outline' },
  { id: 'formal', name: 'Formal Event', icon: 'wine-outline' },
  { id: 'party', name: 'Party/Club', icon: 'musical-notes-outline' },
  { id: 'wedding', name: 'Wedding', icon: 'flower-outline' },
  { id: 'interview', name: 'Job Interview', icon: 'person-outline' },
  { id: 'gym', name: 'Gym/Workout', icon: 'fitness-outline' },
];

export default function OccasionScoringScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const [selectedImageData, setSelectedImageData] = useState<{uri: string, base64?: string} | null>(null);
  const [selectedOccasion, setSelectedOccasion] = useState<string | null>(null);
  const [customOccasion, setCustomOccasion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Check if image data was passed from OutfitEvaluationScreen
  useEffect(() => {
    const params = route.params as { imageData?: {uri: string, base64?: string} } | undefined;
    if (params?.imageData) {
      setSelectedImageData(params.imageData);
    }
  }, [route.params]);

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
    if (!selectedImageData?.base64) return;
    
    const occasionToUse = customOccasion.trim() || (selectedOccasion ? OCCASIONS.find(o => o.id === selectedOccasion)?.name : null);
    if (!occasionToUse) return;

    setIsLoading(true);
    try {
      const evaluationResult = await evaluateOutfitForOccasion(
        `Please evaluate this outfit for ${occasionToUse}. Provide both a style score (0-100) and occasion appropriateness score (0-100), along with detailed feedback, strengths, and improvements specifically for this occasion.`,
        [],
        selectedImageData.base64
      );
      setEvaluation(evaluationResult);
      
      // Note: We don't save to database or update streaks for occasion scoring
      // This is just an extra feature for users to get feedback
    } catch (error) {
      console.error("Occasion evaluation error:");
      Alert.alert('Error', `Failed to evaluate outfit: ${error instanceof Error ? error.message : 'Analysis unavailable'}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return theme.colors.success;
    if (score >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  const handleOccasionSelect = (occasionId: string) => {
    setSelectedOccasion(occasionId);
    setCustomOccasion(''); // Clear custom input when selecting preset
  };

  const handleCustomOccasionChange = (text: string) => {
    setCustomOccasion(text);
    if (text.trim()) {
      setSelectedOccasion(null); // Clear preset selection when typing custom
    }
  };

  const isReadyToEvaluate = selectedImageData && (customOccasion.trim() || selectedOccasion);

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
          Occasion Scoring
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Occasion Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Select Occasion
          </Text>
          <View style={styles.occasionsGrid}>
            {OCCASIONS.map((occasion) => (
              <TouchableOpacity
                key={occasion.id}
                style={[
                  styles.occasionCard,
                  {
                    backgroundColor: selectedOccasion === occasion.id 
                      ? theme.colors.primary 
                      : theme.colors.surface,
                    borderColor: selectedOccasion === occasion.id 
                      ? theme.colors.primary 
                      : theme.colors.border,
                  }
                ]}
                onPress={() => handleOccasionSelect(occasion.id)}
              >
                <Ionicons 
                  name={occasion.icon as keyof typeof Ionicons.glyphMap} 
                  size={24} 
                  color={selectedOccasion === occasion.id 
                    ? theme.colors.background 
                    : theme.colors.text
                  } 
                />
                <Text style={[
                  styles.occasionText,
                  {
                    color: selectedOccasion === occasion.id 
                      ? theme.colors.background 
                      : theme.colors.text
                  }
                ]}>
                  {occasion.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Occasion Input */}
          <Text style={[styles.orText, { color: theme.colors.textSecondary }]}>
            or type your own occasion:
          </Text>
          <TextInput
            style={[
              styles.customOccasionInput,
              { 
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                borderColor: customOccasion.trim() ? theme.colors.primary : theme.colors.border,
              }
            ]}
            placeholder="e.g., Family dinner, Concert, Beach day..."
            placeholderTextColor={theme.colors.textSecondary}
            value={customOccasion}
            onChangeText={handleCustomOccasionChange}
            maxLength={50}
          />
        </View>

        {/* Image Selection */}
        <View style={styles.section}>
          <View style={styles.imageHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Upload Outfit Photo
            </Text>
            <TouchableOpacity
              style={[styles.guidelinesButton, { backgroundColor: theme.colors.surface }]}
              onPress={() => setShowGuidelines(true)}
            >
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.guidelinesButtonText, { color: theme.colors.primary }]}>
                Guidelines
              </Text>
            </TouchableOpacity>
          </View>
          
          {!selectedImageData ? (
            <View style={styles.imageSelectionContainer}>
              <TouchableOpacity
                style={[styles.imagePlaceholder, { borderColor: theme.colors.border }]}
                onPress={handleSelectPhoto}
              >
                <Ionicons name="camera-outline" size={48} color={theme.colors.textSecondary} />
                <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                  Tap to select photo
                </Text>
              </TouchableOpacity>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: theme.colors.primary }]}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color={theme.colors.background} />
                  <Text style={[styles.buttonText, { color: theme.colors.background }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 }]}
                  onPress={handleSelectPhoto}
                >
                  <Ionicons name="images" size={20} color={theme.colors.text} />
                  <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                    Choose from Library
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImageData.uri }} style={styles.selectedImage} contentFit="cover" />
              {!isLoading && !evaluation && (
                <TouchableOpacity
                  style={[styles.changePhotoButton, { backgroundColor: theme.colors.surface }]}
                  onPress={() => {
                    setSelectedImageData(null);
                    setEvaluation(null);
                  }}
                >
                  <Ionicons name="refresh" size={16} color={theme.colors.text} />
                  <Text style={[styles.changePhotoText, { color: theme.colors.text }]}>
                    Change Photo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Evaluate Button */}
        {isReadyToEvaluate && !evaluation && (
          <TouchableOpacity
            style={[styles.evaluateButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleEvaluate}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={theme.colors.background} />
                <Text style={[styles.evaluateButtonText, { color: theme.colors.background }]}>
                  Evaluate for Occasion
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Loading Message */}
        {isLoading && !evaluation && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text }]}>
              Stylo is analyzing...
            </Text>
            <Text style={[styles.loadingSubtext, { color: theme.colors.textSecondary }]}>
              This may take up to 30 seconds
            </Text>
          </View>
        )}

        {/* Evaluation Results */}
        {evaluation && (
          <View style={styles.resultsContainer}>
            <View style={styles.scoresRow}>
              <View style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                  Style Score
                </Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(evaluation.overallScore || evaluation.score) }]}>
                  {evaluation.overallScore || evaluation.score}
                </Text>
              </View>
              
              <View style={[styles.scoreCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
                  Occasion Score
                </Text>
                <Text style={[styles.scoreValue, { color: getScoreColor(evaluation.occasionScore) }]}>
                  {evaluation.occasionScore}
                </Text>
              </View>
            </View>

            <View style={[styles.feedbackCard, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.feedbackTitle, { color: theme.colors.text }]}>
                Occasion Feedback
              </Text>
              <Text style={[styles.feedbackText, { color: theme.colors.textSecondary }]}>
                {evaluation.feedback}
              </Text>
            </View>

            {evaluation.strengths && evaluation.strengths.length > 0 && (
              <View style={[styles.feedbackCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.feedbackTitle, { color: theme.colors.success }]}>
                  What Works for This Occasion
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

            {evaluation.improvements && evaluation.improvements.length > 0 && (
              <View style={[styles.feedbackCard, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.feedbackTitle, { color: theme.colors.warning }]}>
                  Suggestions for This Occasion
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

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
              <TouchableOpacity
                style={[styles.newEvaluationButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setSelectedImageData(null);
                  setSelectedOccasion(null);
                  setCustomOccasion('');
                  setEvaluation(null);
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color={theme.colors.background} />
                <Text style={[styles.newEvaluationButtonText, { color: theme.colors.background }]}>
                  New Occasion Evaluation
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.resetButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => {
                  setSelectedOccasion(null);
                  setCustomOccasion('');
                  setEvaluation(null);
                }}
              >
                <Ionicons name="refresh-outline" size={20} color={theme.colors.text} />
                <Text style={[styles.resetButtonText, { color: theme.colors.text }]}>
                  Try Different Occasion
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Image Guidelines Modal */}
      <Modal
        visible={showGuidelines}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGuidelines(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <View style={styles.modalHeader}>
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
        </SafeAreaView>
      </Modal>
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
    paddingVertical: 2,
  },
  backButton: {
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
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 0,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  guidelinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  guidelinesButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  occasionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  occasionCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  occasionText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  orText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 12,
  },
  customOccasionInput: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  imageSelectionContainer: {
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  imageContainer: {
    alignItems: 'center',
  },
  selectedImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 12,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  changePhotoText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  evaluateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  evaluateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingTop: 40,
    paddingBottom: 50,
    minHeight: 150,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginTop: 8,
    textAlign: 'center',
  },
  resultsContainer: {
    gap: 16,
    paddingBottom: 32,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 12,
  },
  scoreCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 32,
    fontFamily: 'Inter_800ExtraBold',
  },
  feedbackCard: {
    padding: 16,
    borderRadius: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  feedbackItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  feedbackItemText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
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
  bottomActions: {
    gap: 12,
    marginTop: 16,
    marginBottom: 32,
  },
  newEvaluationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  newEvaluationButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});
