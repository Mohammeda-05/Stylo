import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SupabaseAuthProvider, useSupabaseAuth } from './src/context/SupabaseAuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { DataRefreshProvider } from './context/DataRefreshContext';
import { HintProvider } from './context/HintContext';
import { GuestProvider } from './context/GuestContext';
import HintWrapper from './components/HintWrapper';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PaymentService from './services/paymentService';
import { supabase } from './src/lib/supabase';
import * as Font from 'expo-font';
import {
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

// Import screens
import SplashScreen from './screens/SplashScreen';
import NewOnboardingFlow from './screens/onboarding/NewOnboardingFlow';
import ImprovedAuthScreen from './screens/ImprovedAuthScreen';
import SubscriptionScreen from './screens/SubscriptionScreen';
import MainTabNavigator from './navigation/MainTabNavigator';
import OccasionScoringScreen from './screens/OccasionScoringScreen';
import EvaluationDetailScreen from './screens/EvaluationDetailScreen';
import WardrobeGuidelinesScreen from './screens/WardrobeGuidelinesScreen';
import SettingsScreen from './screens/SettingsScreen';
import AllEvaluationsScreen from './screens/AllEvaluationsScreen';
import WardrobeOutfitEvaluationScreen from './screens/WardrobeOutfitEvaluationScreen';
import WardrobeEvaluationResultsScreen from './screens/WardrobeEvaluationResultsScreen';

const Stack = createStackNavigator();

const PERSONAL_INFO_COMPLETED_KEY = '@stylo_personal_info_completed';
const PERSONAL_INFO_DATA_KEY = '@stylo_personal_info_data';
const ONBOARDING_COMPLETED_KEY = '@stylo_onboarding_completed';

function AppContent() {
    const { isSignedIn, isLoading: authLoading } = useSupabaseAuth();
    const [showSplash, setShowSplash] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showCustomAuth, setShowCustomAuth] = useState(false);
    const [showSubscription, setShowSubscription] = useState(false);
    const [showMainApp, setShowMainApp] = useState(false);
    const [fontsLoaded, setFontsLoaded] = useState(false);
    const [appReady, setAppReady] = useState(false);
    const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
    const [isGuestMode, setIsGuestMode] = useState(false);
    const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

    // Listen for sign out - when user signs out, reset to onboarding
    useEffect(() => {
        if (!authLoading && !isSignedIn && showMainApp && !isGuestMode) {
            setShowMainApp(false);
            setShowSubscription(false);
            setShowCustomAuth(false);
            setShowOnboarding(true);
        }
    }, [isSignedIn, authLoading, showMainApp, isGuestMode]);

    // Load fonts
    useEffect(() => {
        const loadFonts = async () => {
            try {
                await Font.loadAsync({
                    Inter_400Regular,
                    Inter_500Medium,
                    Inter_600SemiBold,
                    Inter_700Bold,
                    Inter_800ExtraBold,
                });
                setFontsLoaded(true);
            } catch (error) {
                console.error("Error loading fonts:");
                setFontsLoaded(true); // Continue anyway
            }
        };

        loadFonts();
    }, []);

    // Check onboarding completion status
    useEffect(() => {
        const checkOnboarding = async () => {
            try {
                const completed = await AsyncStorage.getItem('@stylo_onboarding_completed');
                setOnboardingCompleted(completed === 'true');
            } catch (error) {
                console.error("Error checking onboarding:");
                setOnboardingCompleted(false);
            }
        };

        checkOnboarding();
    }, []);

    // Check app status
    useEffect(() => {
        const checkAppStatus = async () => {
            if (!fontsLoaded || showSplash || onboardingCompleted === null) {
                return;
            }

            // Don't re-check if we're already showing auth or subscription
            if (showCustomAuth || showSubscription || showMainApp) {
                return;
            }


            try {
                // If onboarding hasn't been completed, show onboarding first
                if (!onboardingCompleted) {
                    setShowOnboarding(true);
                    setAppReady(true);
                    return;
                }

                // Check if user is already signed in
                if (supabase) {
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session) {
                        setIsCheckingSubscription(true);

                        try {
                            if (!PaymentService.isReady()) {
                                await PaymentService.initialize();
                            }

                            const isSubscribed = await PaymentService.isProUser();

                            if (isSubscribed) {
                                setShowMainApp(true);
                            } else {
                                setShowSubscription(true);
                            }
                        } catch (error) {
                            console.error("Error checking subscription:");
                            setShowSubscription(true);
                        } finally {
                            setIsCheckingSubscription(false);
                        }

                        setAppReady(true);
                        return;
                    }
                }

                // No session but onboarding completed, show auth screen
                setShowCustomAuth(true);
                setAppReady(true);
            } catch (error) {
                console.error("Error checking app status:");
                setShowCustomAuth(true);
                setAppReady(true);
            }
        };

        checkAppStatus();
    }, [fontsLoaded, showSplash, onboardingCompleted, showCustomAuth, showSubscription, showMainApp]);

    const handleSplashFinish = () => {
        setShowSplash(false);
    };

    const handleOnboardingComplete = async () => {
        try {
            await AsyncStorage.setItem('@stylo_onboarding_completed', 'true');
            setOnboardingCompleted(true);
            setShowOnboarding(false);
            setShowCustomAuth(true);
        } catch (error) {
            console.error("Error saving onboarding completion:");
            setOnboardingCompleted(true);
            setShowOnboarding(false);
            setShowCustomAuth(true);
        }
    };

    const handleAuthSuccess = async () => {
        setShowCustomAuth(false);
        setIsCheckingSubscription(true);

        // Check subscription status
        try {
            if (!PaymentService.isReady()) {
                await PaymentService.initialize();
            }

            const isSubscribed = await PaymentService.isProUser();

            if (isSubscribed) {
                setShowMainApp(true);
            } else {
                setShowSubscription(true);
            }
        } catch (error) {
            console.error("Error checking subscription status:");
            setShowSubscription(true);
        } finally {
            setIsCheckingSubscription(false);
        }
    };

    const handleGuestMode = () => {
        setIsGuestMode(true);
        setShowCustomAuth(false);
        setShowSubscription(true);
    };

    const handleExitGuestMode = () => {
        setIsGuestMode(false);
        setShowMainApp(false);
        setShowOnboarding(true);
    };

    const handleSubscriptionComplete = () => {
        setShowSubscription(false);
        setShowMainApp(true);
    };

    // Show splash screen first
    if (showSplash || !fontsLoaded) {
        return <SplashScreen onFinish={handleSplashFinish} />;
    }

    // Show loading if not ready
    if (!appReady || onboardingCompleted === null) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#0F172A', '#1E293B']}
                    style={StyleSheet.absoluteFillObject}
                />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 16, marginBottom: 20 }}>Loading STYLO...</Text>
                </View>
            </View>
        );
    }

    // Show loading if checking subscription
    if (isCheckingSubscription) {
        return (
            <View style={styles.container}>
                <LinearGradient
                    colors={['#0F172A', '#1E293B']}
                    style={StyleSheet.absoluteFillObject}
                />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 16, marginBottom: 20 }}>Setting up your account...</Text>
                </View>
            </View>
        );
    }

    // Show onboarding flow
    if (showOnboarding) {
        return <NewOnboardingFlow onComplete={handleOnboardingComplete} />;
    }

    // Show improved auth screen
    if (showCustomAuth) {
        return (
            <ImprovedAuthScreen
                onAuthSuccess={handleAuthSuccess}
                onBack={() => setShowCustomAuth(false)}
            />
        );
    }

    // Show subscription screen if needed
    if (showSubscription) {
        return (
            <SubscriptionScreen
                onSubscriptionComplete={handleSubscriptionComplete}
            />
        );
    }

    // Show main app with navigation
    if (showMainApp) {
        return (
            <GuestProvider isGuestMode={isGuestMode} onExitGuestMode={handleExitGuestMode}>
                <NavigationContainer>
                    <DataRefreshProvider>
                        <HintWrapper>
                            <Stack.Navigator screenOptions={{ headerShown: false }}>
                                <Stack.Screen name="MainTabs" component={MainTabNavigator} />
                                <Stack.Screen name="OccasionScoring" component={OccasionScoringScreen} />
                                <Stack.Screen name="EvaluationDetail" component={EvaluationDetailScreen} />
                                <Stack.Screen name="WardrobeGuidelines" component={WardrobeGuidelinesScreen} />
                                <Stack.Screen name="Settings" component={SettingsScreen} />
                                <Stack.Screen name="AllEvaluations" component={AllEvaluationsScreen} />
                                <Stack.Screen name="WardrobeOutfitEvaluation" component={WardrobeOutfitEvaluationScreen} />
                                <Stack.Screen name="WardrobeEvaluationResults" component={WardrobeEvaluationResultsScreen} />
                            </Stack.Navigator>
                            <SyncStatusIndicator />
                        </HintWrapper>
                    </DataRefreshProvider>
                </NavigationContainer>
            </GuestProvider>
        );
    }

    // Fallback
    return <NewOnboardingFlow onComplete={handleOnboardingComplete} />;
}

export default function App() {
    return (
        <SafeAreaProvider>
            <SupabaseAuthProvider>
                <ThemeProvider>
                    <SubscriptionProvider>
                        <HintProvider>
                            <AppContent />
                        </HintProvider>
                    </SubscriptionProvider>
                </ThemeProvider>
            </SupabaseAuthProvider>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});