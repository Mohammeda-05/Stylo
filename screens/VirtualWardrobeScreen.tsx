import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  Image as RNImage,
  Animated,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useSupabaseAuth } from '../src/context/SupabaseAuthContext';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { useTheme } from '../context/ThemeContext';
import { useHints } from '../context/HintContext';
import { useGuest } from '../context/GuestContext';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { FlatGrid } from 'react-native-super-grid';
import { pickImageFromLibrary, deleteImageFromStorage } from '../services/imageService';
import { useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { generateOutfitSuggestions } from '../services/aiService';
import { LinearGradient } from 'expo-linear-gradient';

interface WardrobeItem {
  id: string;
  imageUri: string;
  category: string;
  name: string;
  color: string;
  createdAt: number;
  wearCount?: number;
  averageScore?: number;
  lastWorn?: number;
  season?: string;
  tags?: string;
}

interface OutfitCombination {
  id: string;
  name: string;
  itemIds: string;
  createdAt: number;
  lastWorn?: number;
  averageScore?: number;
  wearCount?: number;
}

interface FilterChip {
  id: string;
  label: string;
  type: 'category' | 'color' | 'season';
  value: string;
  active: boolean;
}

export default function VirtualWardrobeScreen() {
  const { theme } = useTheme();
  const { isGuestMode } = useGuest();
  const { user } = useSupabaseAuth();
  const { safeGetAll, safeAdd, safeDelete, safeUpdate } = useSupabaseDB();
  const navigation = useNavigation();
  const { showHint } = useHints();
  
  // Core state
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [outfitCombinations, setOutfitCombinations] = useState<OutfitCombination[]>([]);
  const [isLoadingWardrobe, setIsLoadingWardrobe] = useState(true);
  const [isGeneratingOutfits, setIsGeneratingOutfits] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'outfits'>('items');
  
  // Filter state - simplified to just search
  const [filteredItems, setFilteredItems] = useState<WardrobeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showOutfitSuggestionsModal, setShowOutfitSuggestionsModal] = useState(false);
  const [selectedWardrobeItem, setSelectedWardrobeItem] = useState<WardrobeItem | null>(null);
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([]);
  
  // Add item state
  const [customItemType, setCustomItemType] = useState('');
  const [selectedItemType, setSelectedItemType] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageSize, setSelectedImageSize] = useState<{ width: number; height: number } | null>(null);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Popular clothing types
  const popularTypes = [
    'T-Shirt', 'Blouse', 'Dress', 'Jeans', 'Skirt', 'Sweater',
    'Jacket', 'Coat', 'Sneakers', 'Heels', 'Boots', 'Sandals',
    'Scarf', 'Hat', 'Belt', 'Bag', 'Jewelry', 'Shorts',
    'Cardigan', 'Blazer', 'Leggings', 'Jumpsuit', 'Romper'
  ];

  const seasons = ['Spring', 'Summer', 'Fall', 'Winter', 'Year-round'];
  
  const colors = [
    'Black', 'White', 'Gray', 'Navy', 'Brown', 'Beige',
    'Red', 'Pink', 'Orange', 'Yellow', 'Green', 'Blue',
    'Purple', 'Multicolor', 'Metallic', 'Denim'
  ];

  // Create styles inside component to access theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    guidelinesButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.text,
      marginLeft: 12,
    },
    filtersContainer: {
      marginBottom: 8,
    },
    filtersScrollView: {
      paddingHorizontal: 24,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      marginRight: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
      marginHorizontal: 24,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 24,
      marginBottom: 16,
      gap: 12,
    },
    styleThisButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      borderRadius: 16,
      gap: 8,
    },
    styleThisButtonText: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.colors.background,
    },
    addItemButton: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 48,
    },
    emptyStateIcon: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
    },
    emptyStateText: {
      fontSize: 24,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyStateSubtext: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 24,
    },
    addFirstItemButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 24,
      gap: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    addFirstItemText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.background,
    },
    wardrobeGrid: {
      flex: 1,
      paddingHorizontal: 12,
    },
    // NEW BEAUTIFUL ITEM CARD DESIGN
    wardrobeItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border + '40',
    },
    itemImageContainer: {
      width: '100%',
      height: 200,
      position: 'relative',
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    itemGradientOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 80,
      justifyContent: 'flex-end',
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    itemStatsOverlay: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    itemStatsText: {
      fontSize: 10,
      fontFamily: 'Inter_600SemiBold',
      color: '#FFFFFF',
    },
    itemInfo: {
      padding: 16,
      paddingTop: 12,
    },
    itemName: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    itemCategory: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.textSecondary,
      opacity: 0.8,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalCloseButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
    },
    modalContent: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: theme.colors.text,
      marginBottom: 16,
    },
    customInput: {
      fontSize: 16,
      fontFamily: 'Inter_400Regular',
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 2,
      marginBottom: 16,
    },
    orText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 16,
    },
    popularTypesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    popularTypeButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    },
    popularTypeText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
    },
    imageUploadButton: {
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: 'dashed',
      overflow: 'hidden',
      minHeight: 200,
      backgroundColor: theme.colors.surface,
    },
    selectedImage: {
      width: '100%',
      height: '100%',
      borderRadius: 10,
    },
    imageUploadPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    imageUploadText: {
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.textSecondary,
    },
    modalFooter: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: theme.colors.surface,
    },
    addButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.background,
    },
    outfitSuggestion: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    outfitTitle: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: theme.colors.text,
      marginBottom: 12,
    },
    outfitItems: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    outfitItemImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    outfitActions: {
      flexDirection: 'row',
      gap: 12,
    },
    outfitActionButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 1,
    },
    outfitActionText: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    loadingText: {
      fontSize: 16,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.text,
    },
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 24,
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    tabButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    tabButtonInactive: {
      backgroundColor: 'transparent',
    },
    tabText: {
      fontSize: 14,
      fontFamily: 'Inter_600SemiBold',
    },
    tabTextActive: {
      color: theme.colors.background,
    },
    tabTextInactive: {
      color: theme.colors.textSecondary,
    },
    // NEW BEAUTIFUL OUTFIT CARD DESIGN
    savedOutfitCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      marginHorizontal: 24,
      marginBottom: 16,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: theme.colors.border + '40',
    },
    savedOutfitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    savedOutfitName: {
      fontSize: 18,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.text,
      flex: 1,
    },
    savedOutfitDate: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.textSecondary,
      opacity: 0.7,
      marginRight: 12,
    },
    savedOutfitImagesContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    savedOutfitImages: {
      flexDirection: 'row',
      gap: 10,
    },
    savedOutfitItemImage: {
      width: 70,
      height: 70,
      borderRadius: 12,
      backgroundColor: theme.colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    savedOutfitMoreItems: {
      width: 70,
      height: 70,
      borderRadius: 12,
      backgroundColor: theme.colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary + '40',
      borderStyle: 'dashed',
    },
    savedOutfitMoreText: {
      fontSize: 14,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.primary,
    },
    deleteOutfitButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.error + '15',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.error + '30',
    },
    // BEAUTIFUL ITEM MODAL DESIGN
    itemModalContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      maxWidth: 400,
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.25,
      shadowRadius: 25,
      elevation: 25,
      overflow: 'hidden',
    },
    itemModalContent: {
      alignItems: 'center',
    },
    itemModalImage: {
      width: '100%',
      aspectRatio: 3/4,
      backgroundColor: theme.colors.surface,
    },
    itemModalSeasonContainer: {
      paddingVertical: 20,
      paddingHorizontal: 24,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    itemModalSeasonText: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    itemModalSeasonLabel: {
      fontSize: 14,
      fontFamily: 'Inter_500Medium',
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    itemStatNumber: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: theme.colors.primary,
    },
    itemStatLabel: {
      fontSize: 10,
      fontFamily: 'Inter_400Regular',
      color: theme.colors.textSecondary,
    },
  });

  // Initialize animations
  useEffect(() => {
    const currentFadeAnim = fadeAnim;
    const currentSlideAnim = slideAnim;
    const currentScaleAnim = scaleAnim;

    Animated.parallel([
      Animated.timing(currentFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(currentSlideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(currentScaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Debug logging for wardrobe items
  useEffect(() => {
  }, [wardrobeItems]);

  // Load wardrobe data
  const loadWardrobeItems = useCallback(async () => {
    if (isGuestMode || !user) {
      // For guest mode, set empty state
      setWardrobeItems([]);
      setOutfitCombinations([]);
      setFilteredItems([]);
      setIsLoadingWardrobe(false);
      return;
    }

    try {
      setIsLoadingWardrobe(true);
      
      const [items, combinations] = await Promise.all([
        safeGetAll('wardrobeItems'),
        safeGetAll('outfitCombinations')
      ]);
      
      const sortedItems = (items || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
      const sortedCombinations = (combinations || []).sort((a: any, b: any) => b.createdAt - a.createdAt);
      
      setWardrobeItems(sortedItems as any);
      setOutfitCombinations(sortedCombinations as any);
      setFilteredItems(sortedItems as any);

      // Show hints based on wardrobe state - only on first app launch
      if (sortedItems.length === 0) {
        setTimeout(() => {
          showHint('wardrobe_first_visit');
        }, 1000);
      }
    } catch (error) {
      console.error("Error loading wardrobe items:");
    } finally {
      setIsLoadingWardrobe(false);
    }
  }, [safeGetAll, isGuestMode, user, showHint]);

  useEffect(() => {
    loadWardrobeItems();
  }, [loadWardrobeItems]);

  // Filter logic - simplified to just search
  useEffect(() => {
    let filtered = wardrobeItems;

    // Apply search query only
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  }, [wardrobeItems, searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Style This functionality
  const handleStyleThis = async () => {
    if (wardrobeItems.length < 3) {
      Alert.alert(
        'Need More Items',
        `Add ${3 - wardrobeItems.length} more items to your wardrobe to generate outfit suggestions.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGeneratingOutfits(true);
    setShowOutfitSuggestionsModal(true);

    // Show hint about rating suggestions
    setTimeout(() => {
      showHint('after_style_this_used');
    }, 2000);

    try {
      // Generate outfit suggestions using real AI
      const aiOutfits = await generateOutfitSuggestions(wardrobeItems);
      setGeneratedOutfits(aiOutfits);
    } catch (error) {
      console.error("Error generating outfits:");
      Alert.alert('Error', 'Failed to generate outfit suggestions. Please try again.');
      setShowOutfitSuggestionsModal(false);
    } finally {
      setIsGeneratingOutfits(false);
    }
  };

  // Add item functionality
  const handleAddItem = async () => {
    setShowAddModal(true);
    setCustomItemType('');
    setSelectedItemType('');
    setSelectedImage(null);
    setSelectedImageSize(null);
    setSelectedSeason('');
    setSelectedColor('');
  };

  const handleSelectImage = async () => {
    try {
      const result = await pickImageFromLibrary();
      if (result) {
        setSelectedImage(result.uri);
        
        RNImage.getSize(
          result.uri,
          (width, height) => {
            const screenWidth = Dimensions.get('window').width - 48;
            const maxHeight = 320;
            
            const aspectRatio = width / height;
            let finalWidth = screenWidth;
            let finalHeight = screenWidth / aspectRatio;
            
            if (finalHeight > maxHeight) {
              finalHeight = maxHeight;
              finalWidth = maxHeight * aspectRatio;
            }
            
            finalWidth = Math.min(finalWidth * 1.05, screenWidth);
            finalHeight = finalHeight * 1.05;
            
            setSelectedImageSize({ width: finalWidth, height: finalHeight });
          },
          (error) => {
            console.error("Error getting image size:");
            setSelectedImageSize({ width: Dimensions.get('window').width - 48, height: 200 });
          }
        );
      }
    } catch {
      Alert.alert('Error', 'Failed to select photo. Please try again.');
    }
  };

  const handleAddToWardrobe = async () => {
    if (isGuestMode) {
      Alert.alert(
        'Sign Up Required',
        'Create an account to add items to your wardrobe!',
        [{ text: 'OK' }]
      );
      return;
    }

    const itemType = customItemType.trim() || selectedItemType;
    
    if (!itemType) {
      Alert.alert('Missing Information', 'Please enter or select an item type.');
      return;
    }
    
    if (!selectedImage) {
      Alert.alert('Missing Photo', 'Please select a photo of your item.');
      return;
    }

    try {
      const newItem = {
        imageUri: selectedImage,
        category: itemType,
        name: itemType,
        color: selectedColor || 'Not specified',
        season: selectedSeason || 'Year-round',
        createdAt: Date.now(),
        wearCount: 0,
        averageScore: 0,
        lastWorn: 0,
        tags: '',
      };

      await safeAdd('wardrobeItems', newItem);
      await loadWardrobeItems();
      setShowAddModal(false);
      
      // Show hint after first item added
      if (wardrobeItems.length === 0) {
        setTimeout(() => {
          showHint('after_first_item_added', { itemCount: 1 });
        }, 1000);
      }
      
      // Reset form
      setCustomItemType('');
      setSelectedItemType('');
      setSelectedImage(null);
      setSelectedImageSize(null);
      setSelectedSeason('');
      setSelectedColor('');
    } catch {
      Alert.alert('Error', 'Failed to add item to wardrobe.');
    }
  };

  const handleSelectPopularType = (type: string) => {
    setSelectedItemType(type);
    setCustomItemType('');
  };

  const handleViewItem = (item: WardrobeItem) => {
    setSelectedWardrobeItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async () => {
    if (!selectedWardrobeItem) return;

    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${selectedWardrobeItem.name}" from your wardrobe?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await safeDelete('wardrobeItems', selectedWardrobeItem.id);
              await deleteImageFromStorage(selectedWardrobeItem.imageUri);
              
              loadWardrobeItems();
              setShowItemModal(false);
              setSelectedWardrobeItem(null);
            } catch {
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          },
        },
      ]
    );
  };

  const saveOutfitCombination = async (outfit: any) => {
    try {
      const newCombination = {
        name: outfit.name,
        itemIds: JSON.stringify(outfit.items.map((item: WardrobeItem) => item.id)),
        createdAt: Date.now(),
        wearCount: 0,
        averageScore: 0,
        lastWorn: 0,
      };

      await safeAdd('outfitCombinations', newCombination);
      await loadWardrobeItems();
      
      Alert.alert('Saved!', `"${outfit.name}" has been saved to your outfit combinations.`);
    } catch (error) {
      console.error("Error saving outfit:");
      Alert.alert('Error', 'Failed to save outfit combination.');
    }
  };

  const getOutfitItems = (outfit: OutfitCombination): WardrobeItem[] => {
    try {
      const itemIds = JSON.parse(outfit.itemIds);
      return wardrobeItems.filter(item => itemIds.includes(item.id));
    } catch {
      return [];
    }
  };

  const handleDeleteOutfit = async (outfitId: string, outfitName: string) => {
    Alert.alert(
      'Delete Outfit',
      `Are you sure you want to delete "${outfitName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await safeDelete('outfitCombinations', outfitId);
              await loadWardrobeItems();
            } catch (error) {
              console.error("Error deleting outfit:");
              Alert.alert('Error', 'Failed to delete outfit. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  // Calculate stats
  const totalItems = wardrobeItems.length;
  const totalOutfits = outfitCombinations.length;

  if (isLoadingWardrobe) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading your wardrobe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        {wardrobeItems.length === 0 ? (
          // Empty state
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="shirt-outline" size={48} color={theme.colors.textSecondary} />
            </View>
            <Text style={styles.emptyStateText}>Your wardrobe awaits</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first clothing item to unlock outfit suggestions, style insights, and personalized recommendations
            </Text>
            <TouchableOpacity
              style={styles.addFirstItemButton}
              onPress={handleAddItem}
            >
              <Ionicons name="add" size={24} color={theme.colors.background} />
              <Text style={styles.addFirstItemText}>Add Your First Item</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView 
            style={{ flex: 1 }} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Header - now scrollable */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.headerTitle}>Virtual Wardrobe</Text>
                  <Text style={styles.headerSubtitle}>
                    {totalItems} items • {totalOutfits} saved outfits
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.guidelinesButton}
                  onPress={() => (navigation as any).navigate('WardrobeGuidelines')}
                >
                  <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search Bar - now scrollable */}
            <View style={[styles.searchContainer, { marginHorizontal: 24 }]}>
              <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search your wardrobe..."
                placeholderTextColor={theme.colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery && (
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Stats - now scrollable */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalItems}</Text>
                <Text style={styles.statLabel}>Items</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalOutfits}</Text>
                <Text style={styles.statLabel}>Outfits</Text>
              </View>
            </View>

            {/* Action Buttons - now scrollable */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.styleThisButton,
                  {
                    opacity: wardrobeItems.length < 3 ? 0.6 : 1,
                  }
                ]}
                onPress={handleStyleThis}
                disabled={wardrobeItems.length < 3}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={20} color={theme.colors.background} />
                <Text style={styles.styleThisButtonText}>
                  {wardrobeItems.length < 3 ? `Style Me (${wardrobeItems.length}/3)` : 'Style Me'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={handleAddItem}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'items' ? styles.tabButtonActive : styles.tabButtonInactive
                ]}
                onPress={() => setActiveTab('items')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'items' ? styles.tabTextActive : styles.tabTextInactive
                ]}>
                  Items ({totalItems})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'outfits' ? styles.tabButtonActive : styles.tabButtonInactive
                ]}
                onPress={() => setActiveTab('outfits')}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === 'outfits' ? styles.tabTextActive : styles.tabTextInactive
                ]}>
                  Outfits ({totalOutfits})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content based on active tab */}
            {activeTab === 'items' ? (
              // REDESIGNED WARDROBE GRID
              <View style={{ paddingHorizontal: 12 }}>
                <FlatGrid
                  itemDimension={160}
                  data={filteredItems}
                  spacing={16}
                  staticDimension={undefined}
                  fixed={false}
                  maxItemsPerRow={2}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.wardrobeItem}
                      onPress={() => handleViewItem(item)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.itemImageContainer}>
                        <Image 
                          source={{ uri: item.imageUri }} 
                          style={styles.itemImage} 
                          contentFit="cover"
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.7)']}
                          style={styles.itemGradientOverlay}
                        >
                          <Text style={[styles.itemName, { color: '#FFFFFF', fontSize: 14 }]} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </LinearGradient>
                        {(item.wearCount || 0) > 0 && (
                          <View style={styles.itemStatsOverlay}>
                            <Text style={styles.itemStatsText}>
                              {item.wearCount}x
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemCategory}>
                          {item.category}{item.color && item.color !== 'Not specified' ? ` • ${item.color}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item.id}
                />
              </View>
            ) : (
              // REDESIGNED SAVED OUTFITS
              <View>
                {outfitCombinations.length === 0 ? (
                  <View style={[styles.emptyState, { flex: 0, paddingVertical: 60 }]}>
                    <View style={[styles.emptyStateIcon, { width: 80, height: 80, borderRadius: 40 }]}>
                      <Ionicons name="shirt-outline" size={32} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={[styles.emptyStateText, { fontSize: 18 }]}>No saved outfits yet</Text>
                    <Text style={[styles.emptyStateSubtext, { fontSize: 14, marginBottom: 0 }]}>
                      Use &quot;Style Me&quot; to generate outfit suggestions and save your favorites
                    </Text>
                  </View>
                ) : (
                  outfitCombinations.map((outfit) => {
                    const outfitItems = getOutfitItems(outfit);
                    return (
                      <View key={outfit.id} style={styles.savedOutfitCard}>
                        <View style={styles.savedOutfitHeader}>
                          <Text style={styles.savedOutfitName} numberOfLines={1}>
                            {outfit.name}
                          </Text>
                          <TouchableOpacity
                            style={styles.deleteOutfitButton}
                            onPress={() => handleDeleteOutfit(outfit.id, outfit.name)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.savedOutfitImagesContainer}>
                          <View style={styles.savedOutfitImages}>
                            {outfitItems.slice(0, 5).map((item) => (
                              <Image
                                key={item.id}
                                source={{ uri: item.imageUri }}
                                style={styles.savedOutfitItemImage}
                                contentFit="cover"
                              />
                            ))}
                            {outfitItems.length > 5 && (
                              <View style={styles.savedOutfitMoreItems}>
                                <Text style={styles.savedOutfitMoreText}>
                                  +{outfitItems.length - 5}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Add Item Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add New Item</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionTitle}>What type of item is this?</Text>
              
              <TextInput
                style={[
                  styles.customInput,
                  { 
                    borderColor: customItemType ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                placeholder="Type custom item name (e.g., Maxi Dress, Crop Top, etc.)"
                placeholderTextColor={theme.colors.textSecondary}
                value={customItemType}
                onChangeText={(text) => {
                  setCustomItemType(text);
                  if (text.trim()) {
                    setSelectedItemType('');
                  }
                }}
              />

              <Text style={styles.orText}>or choose from popular types:</Text>

              <View style={styles.popularTypesContainer}>
                {popularTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.popularTypeButton,
                      {
                        backgroundColor: selectedItemType === type 
                          ? theme.colors.primary 
                          : theme.colors.surface,
                        borderColor: selectedItemType === type 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }
                    ]}
                    onPress={() => handleSelectPopularType(type)}
                  >
                    <Text
                      style={[
                        styles.popularTypeText,
                        {
                          color: selectedItemType === type 
                            ? theme.colors.background 
                            : theme.colors.text,
                        }
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Select color (optional)</Text>
              <View style={styles.popularTypesContainer}>
                {colors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.popularTypeButton,
                      {
                        backgroundColor: selectedColor === color 
                          ? theme.colors.primary 
                          : theme.colors.surface,
                        borderColor: selectedColor === color 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    <Text
                      style={[
                        styles.popularTypeText,
                        {
                          color: selectedColor === color 
                            ? theme.colors.background 
                            : theme.colors.text,
                        }
                      ]}
                    >
                      {color}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Season (optional)</Text>
              <View style={styles.popularTypesContainer}>
                {seasons.map((season) => (
                  <TouchableOpacity
                    key={season}
                    style={[
                      styles.popularTypeButton,
                      {
                        backgroundColor: selectedSeason === season 
                          ? theme.colors.primary 
                          : theme.colors.surface,
                        borderColor: selectedSeason === season 
                          ? theme.colors.primary 
                          : theme.colors.border,
                      }
                    ]}
                    onPress={() => setSelectedSeason(season)}
                  >
                    <Text
                      style={[
                        styles.popularTypeText,
                        {
                          color: selectedSeason === season 
                            ? theme.colors.background 
                            : theme.colors.text,
                        }
                      ]}
                    >
                      {season}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Add a photo</Text>

              <TouchableOpacity
                style={[
                  styles.imageUploadButton,
                  { 
                    borderColor: selectedImage ? theme.colors.primary : theme.colors.border,
                    height: selectedImageSize ? selectedImageSize.height : 200,
                    width: selectedImageSize ? selectedImageSize.width : '100%',
                    alignSelf: selectedImageSize ? 'center' : 'stretch',
                  }
                ]}
                onPress={handleSelectImage}
              >
                {selectedImage ? (
                  <View style={{ 
                    flex: 1, 
                    margin: 2,
                    borderRadius: 10,
                    overflow: 'hidden'
                  }}>
                    <Image 
                      source={{ uri: selectedImage }} 
                      style={{
                        width: '100%',
                        height: '100%',
                      }} 
                      contentFit="cover"
                    />
                  </View>
                ) : (
                  <View style={styles.imageUploadPlaceholder}>
                    <Ionicons name="camera" size={48} color={theme.colors.textSecondary} />
                    <Text style={styles.imageUploadText}>
                      Tap to select photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ height: 60 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  { 
                    opacity: (!customItemType.trim() && !selectedItemType) || !selectedImage ? 0.5 : 1,
                  }
                ]}
                onPress={handleAddToWardrobe}
                disabled={(!customItemType.trim() && !selectedItemType) || !selectedImage}
              >
                <Text style={styles.addButtonText}>
                  Add to Wardrobe
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Outfit Suggestions Modal */}
        <Modal
          visible={showOutfitSuggestionsModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowOutfitSuggestionsModal(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowOutfitSuggestionsModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Outfit Suggestions</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              {isGeneratingOutfits ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Creating perfect outfits for you...</Text>
                </View>
              ) : (
                generatedOutfits.map((outfit) => (
                  <View key={outfit.id} style={styles.outfitSuggestion}>
                    <Text style={styles.outfitTitle}>{outfit.name}</Text>
                    <Text style={[styles.orText, { textAlign: 'left', marginBottom: 12 }]}>
                      {outfit.description}
                    </Text>
                    
                    <View style={styles.outfitItems}>
                      {outfit.items.map((item: WardrobeItem) => (
                        <Image
                          key={item.id}
                          source={{ uri: item.imageUri }}
                          style={styles.outfitItemImage}
                          contentFit="cover"
                        />
                      ))}
                    </View>

                    <View style={styles.outfitActions}>
                      <TouchableOpacity
                        style={[
                          styles.outfitActionButton,
                          { 
                            backgroundColor: theme.colors.primary,
                            borderColor: theme.colors.primary,
                          }
                        ]}
                        onPress={() => saveOutfitCombination(outfit)}
                      >
                        <Text style={[styles.outfitActionText, { color: theme.colors.background }]}>
                          Save Outfit
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* REDESIGNED ITEM MODAL */}
        <Modal
          visible={showItemModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowItemModal(false)}
        >
          <BlurView intensity={80} style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
              {selectedWardrobeItem && (
                <View style={styles.itemModalContainer}>
                  <View style={styles.modalHeader}>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setShowItemModal(false)}
                    >
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle} numberOfLines={1}>
                      {selectedWardrobeItem.name}
                    </Text>
                    <TouchableOpacity
                      style={[styles.modalCloseButton, { backgroundColor: theme.colors.error }]}
                      onPress={handleDeleteItem}
                    >
                      <Ionicons name="trash" size={20} color={theme.colors.background} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.itemModalContent}>
                    <Image 
                      source={{ uri: selectedWardrobeItem.imageUri }} 
                      style={styles.itemModalImage}
                      contentFit="cover"
                    />
                    
                    <View style={styles.itemModalSeasonContainer}>
                      <Text style={styles.itemModalSeasonText}>
                        {selectedWardrobeItem.season || 'Year-round'}
                      </Text>
                      <Text style={styles.itemModalSeasonLabel}>season</Text>
                    </View>
                  </View>
                </View>
              )}
            </SafeAreaView>
          </BlurView>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}
