import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function WardrobeGuidelinesScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();

  const guidelines = [
    {
      icon: 'camera-outline',
      title: 'Take Clear Photos',
      description: 'Use good lighting and capture the full item. Lay clothes flat or hang them for best results.',
    },
    {
      icon: 'pricetag-outline',
      title: 'Categorize Items',
      description: 'Choose accurate categories or create custom ones. This helps organize your wardrobe effectively.',
    },
    {
      icon: 'color-palette-outline',
      title: 'Include All Items',
      description: 'Add tops, bottoms, shoes, accessories, and outerwear. The more complete your wardrobe, the better outfit suggestions.',
    },
    {
      icon: 'refresh-outline',
      title: 'Keep It Updated',
      description: 'Remove items you no longer wear and add new purchases to keep your virtual wardrobe current.',
    },
    {
      icon: 'shirt-outline',
      title: 'Seasonal Organization',
      description: 'Consider adding seasonal items and removing out-of-season clothes to focus on current options.',
    },
    {
      icon: 'star-outline',
      title: 'Quality Over Quantity',
      description: 'Focus on items you actually wear. A curated wardrobe leads to better outfit recommendations.',
    },
  ];

  const tips = [
    'Use natural lighting when photographing items',
    'Take photos against a neutral background',
    'Include both casual and formal pieces',
    'Add accessories like belts, jewelry, and bags',
    'Update your wardrobe seasonally',
    'Remove items that no longer fit or you don\'t wear',
  ];

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
          Wardrobe Guidelines
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction */}
        <View style={[styles.introCard, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="bulb" size={32} color={theme.colors.primary} />
          <Text style={[styles.introTitle, { color: theme.colors.text }]}>
            Build Your Perfect Virtual Wardrobe
          </Text>
          <Text style={[styles.introText, { color: theme.colors.textSecondary }]}>
            Follow these guidelines to create a comprehensive digital wardrobe that helps you make better outfit decisions.
          </Text>
        </View>

        {/* Guidelines */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Best Practices
          </Text>
          
          {guidelines.map((guideline, index) => (
            <View key={index} style={[styles.guidelineCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.guidelineIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name={guideline.icon as any} size={24} color={theme.colors.primary} />
              </View>
              <View style={styles.guidelineContent}>
                <Text style={[styles.guidelineTitle, { color: theme.colors.text }]}>
                  {guideline.title}
                </Text>
                <Text style={[styles.guidelineDescription, { color: theme.colors.textSecondary }]}>
                  {guideline.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Tips
          </Text>
          
          <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface }]}>
            {tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Call to Action */}
        <View style={[styles.ctaCard, { backgroundColor: theme.colors.primary + '20', borderColor: theme.colors.primary + '40' }]}>
          <Ionicons name="add-circle" size={32} color={theme.colors.primary} />
          <Text style={[styles.ctaTitle, { color: theme.colors.text }]}>
            Ready to Start?
          </Text>
          <Text style={[styles.ctaText, { color: theme.colors.textSecondary }]}>
            Begin building your virtual wardrobe by adding your first clothing item.
          </Text>
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.ctaButtonText, { color: theme.colors.background }]}>
              Start Adding Items
            </Text>
          </TouchableOpacity>
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
    paddingVertical: 16,
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
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  introCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  introTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginBottom: 16,
  },
  guidelineCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  guidelineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  guidelineContent: {
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  guidelineDescription: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  tipsCard: {
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  ctaCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 16,
  },
  ctaTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  ctaText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
});