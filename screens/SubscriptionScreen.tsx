import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentService, { Product } from '../services/paymentService';
import { useSubscription } from '../context/SubscriptionContext';

const { width } = Dimensions.get('window');

interface SubscriptionScreenProps {
  onSubscriptionComplete?: () => void;
}

const FEATURES = [
  { icon: 'sparkles', text: 'Unlimited outfit evaluations', color: '#F59E0B' },
  { icon: 'chatbubble-ellipses', text: 'AI Style Assistant chat', color: '#8B5CF6' },
  { icon: 'star', text: 'Occasion scoring & recommendations', color: '#EC4899' },
  { icon: 'shirt', text: 'Unlimited wardrobe items', color: '#06B6D4' },
  { icon: 'analytics', text: 'Personal style insights', color: '#10B981' },
  { icon: 'trending-up', text: 'Style trend analysis', color: '#F97316' },
  { icon: 'camera', text: 'Photo outfit analysis', color: '#8B5CF6' },
  { icon: 'add-circle', text: 'And much more...', color: '#6366F1' },
];

export default function SubscriptionScreen({ 
  onSubscriptionComplete,
}: SubscriptionScreenProps) {
  const insets = useSafeAreaInsets();
  const { refreshSubscription } = useSubscription();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const featureAnimations = useRef(FEATURES.map(() => new Animated.Value(0))).current;

  // Check if user is first-time user
  const checkFirstTimeUser = useCallback(async () => {
    try {
      const hasPreviousPurchase = await AsyncStorage.getItem('stylo_has_purchased');
      
      // User is first-time if they haven't made a purchase yet
      const isFirstTime = !hasPreviousPurchase;
      setIsFirstTimeUser(isFirstTime);
    } catch (error) {
      console.error("Error checking first-time user status:");
      // Default to first-time user on error
      setIsFirstTimeUser(true);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check first-time user status
      await checkFirstTimeUser();
      
      // Initialize PaymentService
      await PaymentService.initialize();
      
      // Get available products
      const availableProducts = await PaymentService.getProducts();
      setProducts(availableProducts);
      
      // Select the first product by default (usually monthly)
      if (availableProducts.length > 0) {
        setSelectedProduct(availableProducts[0]);
      }
      
      setLoading(false);
      
      // Start entrance animations
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
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Stagger feature animations
      setTimeout(() => {
        featureAnimations.forEach((anim, index) => {
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            delay: index * 80,
            useNativeDriver: true,
          }).start();
        });
      }, 600);
      
    } catch (error) {
      console.error("Failed to load products:");
      setLoading(false);
      Alert.alert(
        'Error',
        'Failed to load subscription options. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [fadeAnim, slideAnim, scaleAnim, featureAnimations, checkFirstTimeUser]);

  useEffect(() => {
    checkFirstTimeUser();
    loadProducts();
  }, [checkFirstTimeUser, loadProducts]);

  const handlePurchase = async () => {
    if (!selectedProduct) return;

    setPurchasing(true);
    
    try {
      const result = await PaymentService.purchaseProduct(selectedProduct.id);
      
      if (result.success) {
        // Mark that user has made a purchase
        await AsyncStorage.setItem('stylo_has_purchased', 'true');
        
        // Refresh subscription status
        await refreshSubscription();
        
        Alert.alert(
          'Success!',
          'Welcome to STYLO Pro! You now have access to all premium features.',
          [
            {
              text: 'Get Started',
              onPress: () => {
                if (onSubscriptionComplete) {
                  onSubscriptionComplete();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Purchase Failed',
          result.error || 'Something went wrong. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error("Purchase error:");
      Alert.alert(
        'Purchase Failed',
        'Something went wrong. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setLoading(true);
      const results = await PaymentService.restorePurchases();
      
      if (results.length > 0) {
        // Refresh subscription status
        await refreshSubscription();
        
        Alert.alert(
          'Purchases Restored',
          'Your previous purchases have been restored successfully.',
          [
            {
              text: 'Continue',
              onPress: () => {
                if (onSubscriptionComplete) {
                  onSubscriptionComplete();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'No Purchases Found',
          'No previous purchases were found to restore.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error("Restore error:");
      Alert.alert(
        'Restore Failed',
        'Failed to restore purchases. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/');
  };

  const openPrivacy = () => {
    Linking.openURL('https://neuroneconnect.com/privacy-policy');
  };

  const showSubscriptionInfo = () => {
    Alert.alert(
      'Subscription Information',
      'Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.\n\nPayment will be charged to your Apple ID account at confirmation of purchase.\n\nYour account will be charged for renewal within 24 hours prior to the end of the current period.\n\nYou can manage or cancel your subscription at any time by going to your App Store account settings.',
      [{ text: 'OK', style: 'default' }]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#334155']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading subscription options...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#334155']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>STYLO</Text>
          <Text style={styles.subtitle}>PREMIUM</Text>
        </View>

        {/* Scrollable Features List */}
        <ScrollView 
          style={styles.featuresScrollContainer}
          contentContainerStyle={styles.featuresContainer}
          showsVerticalScrollIndicator={false}
        >
          {FEATURES.map((feature, index) => (
            <Animated.View
              key={index}
              style={[
                styles.featureItem,
                {
                  opacity: featureAnimations[index],
                  transform: [{
                    translateX: featureAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 0],
                    })
                  }]
                }
              ]}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <Ionicons name={feature.icon as any} size={18} color={feature.color} />
              </View>
              <Text style={styles.featureText}>{feature.text}</Text>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Fixed Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Subscription Plans */}
          {products.length > 0 && (
            <View style={styles.plansContainer}>
              {products.map((product) => {
                const isYearly = product.title.toLowerCase().includes('yearly') || product.title.toLowerCase().includes('annual');
                const isSelected = selectedProduct?.id === product.id;
                
                return (
                  <TouchableOpacity
                    key={product.id}
                    style={[
                      styles.planCard,
                      isSelected && styles.planCardSelected,
                      isYearly && styles.annualPlan,
                    ]}
                    onPress={() => setSelectedProduct(product)}
                    activeOpacity={0.8}
                  >
                    {isYearly ? (
                      <View style={styles.planContent}>
                        <View style={styles.annualPlanLeft}>
                          <Text style={styles.annualLabel}>ANNUAL</Text>
                          <Text style={styles.annualPrice}>{product.price}</Text>
                          <Text style={styles.annualMonthly}>
                            just ${(product.priceAmountMicros / 1000000 / 12).toFixed(2)} monthly
                          </Text>
                        </View>
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>BEST VALUE</Text>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={styles.planHeader}>
                          {isFirstTimeUser && (
                            <Text style={styles.planTrialText}>3-DAY FREE TRIAL</Text>
                          )}
                          <Text style={styles.planLabel}>MONTHLY</Text>
                        </View>
                        <Text style={styles.planPrice}>{product.price}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handlePurchase}
            disabled={purchasing || !selectedProduct}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.subscribeGradient}
            >
              {purchasing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.subscribeText}>
                    {selectedProduct?.title.toLowerCase().includes('monthly') || selectedProduct?.title.toLowerCase().includes('month')
                      ? (isFirstTimeUser ? 'Start Free Trial' : 'Subscribe to STYLO')
                      : 'Subscribe to STYLO'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Restore Purchases Button */}
          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestorePurchases}
            disabled={loading}
          >
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>

          {/* Legal Footer */}
          <View style={styles.legalContainer}>
            <View style={styles.legalRow}>
              <TouchableOpacity onPress={openTerms}>
                <Text style={styles.linkText}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}> and </Text>
              <TouchableOpacity onPress={openPrivacy}>
                <Text style={styles.linkText}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.linkSeparator}> • </Text>
              <TouchableOpacity onPress={showSubscriptionInfo}>
                <Text style={styles.linkText}>Cancel anytime</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
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
    gap: 16,
  },
  loadingText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  
  // Header Styles
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
    textAlign: 'center',
    marginTop: -4,
  },
  
  // Features Styles
  featuresScrollContainer: {
    flex: 1,
    maxHeight: 380,
  },
  featuresContainer: {
    paddingBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    lineHeight: 22,
  },
  
  // Bottom Section
  bottomSection: {
    paddingTop: 16,
  },
  
  // Plans Styles
  plansContainer: {
    gap: 10,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  planHeader: {
    marginBottom: 6,
  },
  planTrialText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
  },
  planLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 1,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  annualPlan: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  annualPlanLeft: {
    flex: 1,
  },
  annualLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 1,
    marginBottom: 4,
  },
  annualPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  annualMonthly: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  savingsBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  
  // Action Button Styles
  subscribeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  subscribeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  subscribeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  restoreText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  
  // Legal Styles
  legalContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  linkSeparator: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Home Indicator
  homeIndicator: {
    width: 134,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 8,
  },
});
