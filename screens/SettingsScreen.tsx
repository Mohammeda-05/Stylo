import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSupabaseAuth } from '../src/context/SupabaseAuthContext';
import { useSupabaseDB } from '../hooks/useSupabaseDB';
import { useGuest } from '../context/GuestContext';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    notificationService,
    getNotificationPermissionStatus,
    NotificationSettings
} from '../services/notificationService';
import { supabase } from '../src/lib/supabase';

export default function SettingsScreen() {
    const navigation = useNavigation();
    const { theme, themeName, setTheme, availableThemes } = useTheme();
    const { signOut, user } = useSupabaseAuth();
    const { safeGetAll, safeAdd, safeUpdate } = useSupabaseDB();
    const { isGuestMode, exitGuestMode } = useGuest();

    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
        styleEncouragement: false,
        weeklyReports: false,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [notificationPermissionStatus, setNotificationPermissionStatus] = useState<string>('undetermined');
    const [isNotificationServiceReady, setIsNotificationServiceReady] = useState(false);

    useEffect(() => {
        const initializeNotifications = async () => {
            // Skip notification initialization for guests
            if (isGuestMode) {
                setIsNotificationServiceReady(false);
                setIsLoading(false);
                return;
            }

            try {
                // Initialize notification service
                await notificationService.initialize();
                setIsNotificationServiceReady(notificationService.isReady());

                // Get permission status
                const permissionStatus = await getNotificationPermissionStatus();
                setNotificationPermissionStatus(permissionStatus);

            } catch (error) {
                console.error("Failed to initialize notifications:");
            }
        };

        initializeNotifications();
    }, [isGuestMode]);

    useEffect(() => {
        const loadNotificationSettings = async () => {
            // Skip loading notification settings for guests
            if (isGuestMode) {
                setIsLoading(false);
                return;
            }

            try {
                const settings = await safeGetAll('notificationSettings');
                if (settings && settings.length > 0) {
                    const setting = settings[0];
                    const loadedSettings = {
                        styleEncouragement: Boolean(setting.styleEncouragement),
                        weeklyReports: Boolean(setting.weeklyReports),
                        lastEncouragementSent: Number(setting.lastEncouragementSent) || 0,
                        lastWeeklyReportSent: Number(setting.lastWeeklyReportSent) || 0,
                    };
                    setNotificationSettings(loadedSettings);

                    // Update notification service with loaded settings if permissions are granted
                    if (notificationService.canScheduleNotifications()) {
                        await notificationService.updateNotificationSettings(loadedSettings);
                    }
                }
            } catch (error) {
                console.error("Error loading notification settings:");
            } finally {
                setIsLoading(false);
            }
        };

        if (isNotificationServiceReady !== null) {
            loadNotificationSettings();
        }
    }, [safeGetAll, isNotificationServiceReady, isGuestMode]);

    const saveNotificationSettings = async (newSettings: NotificationSettings) => {
        // Skip saving for guests
        if (isGuestMode) return;

        try {
            const existingSettings = await safeGetAll('notificationSettings');

            const settingsData = {
                styleEncouragement: newSettings.styleEncouragement,
                weeklyReports: newSettings.weeklyReports,
                lastEncouragementSent: newSettings.lastEncouragementSent || 0,
                lastWeeklyReportSent: newSettings.lastWeeklyReportSent || 0,
            };

            if (existingSettings && existingSettings.length > 0) {
                await safeUpdate('notificationSettings', existingSettings[0].id, settingsData);
            } else {
                await safeAdd('notificationSettings', settingsData);
            }

        } catch (error) {
            console.error("Error saving notification settings:");
        }
    };

    const handleNotificationToggle = async (type: 'styleEncouragement' | 'weeklyReports', enabled: boolean) => {
        // Show guest mode message
        if (isGuestMode) {
            Alert.alert(
                'Sign In Required',
                'Notifications are only available for signed-in users. Sign in to enable personalized notifications and save your preferences.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Check if notification service is ready
        if (!isNotificationServiceReady) {
            Alert.alert(
                'Notifications Not Available',
                'Notification service is not available on this device or platform.',
                [{ text: 'OK' }]
            );
            return;
        }

        // If enabling notifications, check/request permissions
        if (enabled) {
            const currentStatus = await notificationService.getPermissionStatus();
            setNotificationPermissionStatus(currentStatus);

            if (currentStatus !== 'granted') {
                // Request permissions
                Alert.alert(
                    'Enable Notifications',
                    'STYLO would like to send you personalized style tips and weekly progress reports. Please allow notifications to continue.',
                    [
                        { text: 'Not Now', style: 'cancel' },
                        {
                            text: 'Allow',
                            onPress: async () => {
                                const granted = await notificationService.requestPermissions();
                                const newStatus = await notificationService.getPermissionStatus();
                                setNotificationPermissionStatus(newStatus);

                                if (granted) {
                                    // Permissions granted, proceed with enabling notification
                                    await enableNotification(type, enabled);
                                } else {
                                    Alert.alert(
                                        'Permissions Required',
                                        'To receive notifications, please enable them in your device settings. Go to Settings > Notifications > STYLO and turn on Allow Notifications.',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Open Settings',
                                                onPress: () => notificationService.openSettings()
                                            }
                                        ]
                                    );
                                }
                            }
                        }
                    ]
                );
                return;
            }
        }

        // Permissions are granted or we're disabling, proceed
        await enableNotification(type, enabled);
    };

    const enableNotification = async (type: 'styleEncouragement' | 'weeklyReports', enabled: boolean) => {
        const newSettings = {
            ...notificationSettings,
            [type]: enabled,
        };

        setNotificationSettings(newSettings);

        // Update notification service
        const success = await notificationService.updateNotificationSettings(newSettings);

        if (success || !enabled) { // Always save if disabling, even if scheduling failed
            await saveNotificationSettings(newSettings);
        }

        // Show confirmation
        if (enabled && success) {
            const message = type === 'styleEncouragement'
                ? 'Style encouragement notifications enabled! You\'ll receive motivational tips every 48 hours.'
                : 'Weekly reports enabled! You\'ll receive your style summary every Sunday at 9 AM.';

            Alert.alert('Notifications Enabled', message, [{ text: 'Great!' }]);
        } else if (enabled && !success) {
            // Revert the setting if scheduling failed
            setNotificationSettings(notificationSettings);
            Alert.alert(
                'Failed to Enable',
                'There was a problem setting up your notifications. Please try again.',
                [{ text: 'OK' }]
            );
        }
    };

    const handleSignOut = async () => {
        // Handle guest mode differently
        if (isGuestMode) {
            Alert.alert(
                'Exit Guest Mode',
                'You are currently using STYLO as a guest. If you exit guest mode, any unsaved progress will be lost. Are you sure you want to continue?',
                [
                    { text: 'Stay as Guest', style: 'cancel' },
                    {
                        text: 'Exit Guest Mode',
                        style: 'destructive',
                        onPress: () => {
                            // Exit guest mode to return to auth screen
                            if (exitGuestMode) {
                                exitGuestMode();
                            }
                        }
                    }
                ]
            );
            return;
        }

        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Sign Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Cancel all notifications before signing out
                            await notificationService.cancelAllNotifications();

                            // Clear auth state from AsyncStorage
                            await AsyncStorage.removeItem('@stylo_auth_state');

                            // Sign out from Supabase
                            await signOut();

                        } catch (error) {
                            console.error("Error signing out:");
                            Alert.alert('Error', 'Failed to sign out. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteAccount = async () => {
        // Don't allow account deletion for guest users
        if (isGuestMode) {
            Alert.alert(
                'Not Available',
                'Account deletion is only available for signed-in users.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Show first confirmation
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // Show second confirmation for extra safety
                        Alert.alert(
                            'Final Confirmation',
                            'This will permanently delete your account and all associated data. Are you absolutely sure?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Yes, Delete My Account',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            if (!supabase) {
                                                throw new Error('Supabase is not configured');
                                            }


                                            // Call the delete_user function
                                            const { error } = await supabase.rpc('delete_user');

                                            if (error) {
                                                console.error("Error deleting account:");
                                                Alert.alert(
                                                    'Error',
                                                    'Failed to delete account. Please try again or contact support.',
                                                    [{ text: 'OK' }]
                                                );
                                                return;
                                            }


                                            // Cancel all notifications
                                            await notificationService.cancelAllNotifications();

                                            // Clear all local data
                                            await AsyncStorage.clear();

                                            // Sign out (this will trigger navigation back to auth screen)
                                            await signOut();

                                            // Show success message
                                            Alert.alert(
                                                'Account Deleted',
                                                'Your account has been successfully deleted.',
                                                [{ text: 'OK' }]
                                            );
                                        } catch (error) {
                                            console.error("Error during account deletion:");
                                            Alert.alert(
                                                'Error',
                                                'An unexpected error occurred. Please try again or contact support.',
                                                [{ text: 'OK' }]
                                            );
                                        }
                                    },
                                },
                            ]
                        );
                    },
                },
            ]
        );
    };

    const handleThemeChange = (newThemeName: string) => {
        setTheme(newThemeName);
    };

    const handleHelpSupport = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://neuroneconnect.com/contact', {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
                controlsColor: theme.colors.primary,
            });
        } catch (error) {
            console.error("Error opening support page:");
            Alert.alert(
                'Unable to Open',
                'Please visit neuroneconnect.com/contact in your browser for support.',
                [{ text: 'OK' }]
            );
        }
    };

    const renderThemeOption = (themeOption: string) => {
        const isSelected = themeName === themeOption;
        const displayName = themeOption.charAt(0).toUpperCase() + themeOption.slice(1) + ' Theme';

        return (
            <TouchableOpacity
                key={themeOption}
                style={styles.settingItem}
                onPress={() => handleThemeChange(themeOption)}
            >
                <View style={styles.settingLeft}>
                    <Ionicons
                        name="color-palette-outline"
                        size={24}
                        color={theme.colors.text}
                    />
                    <Text style={[styles.settingText, { color: theme.colors.text }]}>
                        {displayName}
                    </Text>
                </View>
                <View style={styles.settingRight}>
                    {isSelected && (
                        <Ionicons name="checkmark" size={24} color={theme.colors.primary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const getNotificationStatusText = () => {
        if (isGuestMode) return 'Sign in required';
        if (!isNotificationServiceReady) return 'Not available';
        if (notificationPermissionStatus === 'granted') return 'Enabled';
        if (notificationPermissionStatus === 'denied') return 'Disabled in settings';
        return 'Tap to enable';
    };

    const getNotificationStatusColor = () => {
        if (isGuestMode || !isNotificationServiceReady) return theme.colors.textSecondary;
        if (notificationPermissionStatus === 'granted') return theme.colors.primary;
        if (notificationPermissionStatus === 'denied') return theme.colors.error;
        return theme.colors.textSecondary;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
                    Settings
                </Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.userInfo}>
                        <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                            <Text style={[styles.avatarText, { color: theme.colors.background }]}>
                                {isGuestMode
                                    ? 'G'
                                    : ((user as any)?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U')
                                }
                            </Text>
                        </View>
                        <View style={styles.userDetails}>
                            <Text style={[styles.userName, { color: theme.colors.text }]}>
                                {isGuestMode ? 'Guest User' : ((user as any)?.name || 'User')}
                            </Text>
                            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                                {isGuestMode ? 'Continue as guest' : (user?.email || 'user@example.com')}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.sectionContainer, styles.firstSectionContainer]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                        Appearance
                    </Text>
                    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                        {availableThemes.map(renderThemeOption)}
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <View style={styles.sectionTitleContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                            Notifications
                        </Text>
                        <Text style={[styles.statusText, { color: getNotificationStatusColor() }]}>
                            {getNotificationStatusText()}
                        </Text>
                    </View>

                    {isGuestMode ? (
                        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.guestNotificationMessage}>
                                <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
                                <View style={styles.guestMessageText}>
                                    <Text style={[styles.settingText, { color: theme.colors.text }]}>
                                        Sign In for Notifications
                                    </Text>
                                    <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                        Create an account to receive personalized style tips and weekly progress reports
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <Ionicons name="heart-outline" size={24} color={theme.colors.text} />
                                    <View style={styles.settingTextContainer}>
                                        <Text style={[styles.settingText, { color: theme.colors.text }]}>
                                            Style Encouragement
                                        </Text>
                                        <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                            Motivational tips every 48 hours
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={notificationSettings.styleEncouragement}
                                    onValueChange={(value) => handleNotificationToggle('styleEncouragement', value)}
                                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                                    thumbColor={notificationSettings.styleEncouragement ? theme.colors.primary : theme.colors.textSecondary}
                                    disabled={isLoading}
                                />
                            </View>

                            <View style={styles.settingItem}>
                                <View style={styles.settingLeft}>
                                    <Ionicons name="bar-chart-outline" size={24} color={theme.colors.text} />
                                    <View style={styles.settingTextContainer}>
                                        <Text style={[styles.settingText, { color: theme.colors.text }]}>
                                            Weekly Reports
                                        </Text>
                                        <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                                            Style progress summary every Sunday at 9 AM
                                        </Text>
                                    </View>
                                </View>
                                <Switch
                                    value={notificationSettings.weeklyReports}
                                    onValueChange={(value) => handleNotificationToggle('weeklyReports', value)}
                                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
                                    thumbColor={notificationSettings.weeklyReports ? theme.colors.primary : theme.colors.textSecondary}
                                    disabled={isLoading}
                                />
                            </View>
                        </View>
                    )}
                </View>

                <View style={styles.sectionContainer}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Support</Text>
                    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={handleHelpSupport}
                        >
                            <View style={styles.settingLeft}>
                                <Ionicons name="help-circle-outline" size={24} color={theme.colors.primary} />
                                <Text style={[styles.settingText, { color: theme.colors.text }]}>Help & Support</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Management Section */}
                {!isGuestMode && (
                    <View style={styles.sectionContainer}>
                        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>
                        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
                            <TouchableOpacity
                                style={[styles.settingItem, { borderBottomWidth: 0 }]}
                                onPress={handleDeleteAccount}
                            >
                                <View style={styles.settingLeft}>
                                    <Ionicons name="trash-outline" size={24} color={theme.colors.error} />
                                    <Text style={[styles.settingText, { color: theme.colors.error }]}>Delete Account</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.signOutButton, { backgroundColor: isGuestMode ? theme.colors.primary : theme.colors.error }]}
                    onPress={handleSignOut}
                >
                    <Ionicons
                        name={isGuestMode ? "log-out-outline" : "log-out-outline"}
                        size={24}
                        color={theme.colors.background}
                    />
                    <Text style={[styles.signOutText, { color: theme.colors.background }]}>
                        {isGuestMode ? 'Exit Guest Mode' : 'Sign Out'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                        STYLO v1.0.0
                    </Text>
                    <Text style={[styles.footerSubtext, { color: theme.colors.textSecondary }]}>
                        made with ❤️ for fashion lovers
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
    headerTitle: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
    },
    headerSpacer: {
        width: 44,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
    },
    section: {
        borderRadius: 16,
        padding: 20,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    firstSectionContainer: {
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        marginBottom: 12,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusText: {
        fontSize: 12,
        fontFamily: 'Inter_500Medium',
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 24,
        fontFamily: 'Inter_700Bold',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontFamily: 'Inter_700Bold',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    settingTextContainer: {
        flex: 1,
    },
    settingRight: {
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 24,
    },
    settingText: {
        fontSize: 16,
        fontFamily: 'Inter_500Medium',
    },
    settingDescription: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
        marginTop: 2,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 24,
        gap: 12,
    },
    signOutText: {
        fontSize: 16,
        fontFamily: 'Inter_700Bold',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    footerText: {
        fontSize: 12,
        fontFamily: 'Inter_400Regular',
    },
    footerSubtext: {
        fontSize: 11,
        fontFamily: 'Inter_400Regular',
        marginTop: 4,
    },
    guestNotificationMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
    },
    guestMessageText: {
        flex: 1,
    },
});