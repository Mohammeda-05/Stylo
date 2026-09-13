import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
    Alert,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';

interface ImprovedAuthScreenProps {
    onAuthSuccess: () => void;
    onBack?: () => void;
}

export default function ImprovedAuthScreen({ onAuthSuccess, onBack }: ImprovedAuthScreenProps) {
    const [isSignUp, setIsSignUp] = useState(true);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();
    }, [fadeAnim, slideAnim]);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (isSignUp && !username) {
            Alert.alert('Error', 'Please enter a username');
            return;
        }

        if (!supabase) {
            Alert.alert('Error', 'Authentication service is not available');
            return;
        }

        setLoading(true);

        try {
            if (isSignUp) {
                // Sign up with email and password
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username,
                        },
                    },
                });

                if (error) {
                    Alert.alert('Error', error.message);
                } else if (data.user) {
                    Alert.alert(
                        'Success!',
                        'Account created successfully!',
                        [{ text: 'OK', onPress: onAuthSuccess }]
                    );
                }
            } else {
                // Sign in with email and password
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    Alert.alert('Error', error.message);
                } else if (data.user) {
                    onAuthSuccess();
                }
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setEmail('');
        setUsername('');
        setPassword('');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <LinearGradient
                colors={['#2D1B4E', '#1E1B3C', '#0F172A']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        {/* Logo */}
                        <View style={styles.logoContainer}>
                            <View style={styles.logoBackground}>
                                <Ionicons name="sparkles" size={48} color="white" />
                            </View>
                        </View>

                        {/* Title */}
                        <Text style={styles.title}>
                            {isSignUp ? 'Create Your Account' : 'Welcome Back'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isSignUp
                                ? 'Start your style journey with STYLO'
                                : 'Sign in to continue your style journey'}
                        </Text>

                        {/* Form */}
                        <View style={styles.form}>
                            <View style={styles.inputContainer}>
                                <Ionicons name="mail" size={20} color="rgba(255, 255, 255, 0.7)" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email"
                                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    editable={!loading}
                                />
                            </View>

                            {isSignUp && (
                                <View style={styles.inputContainer}>
                                    <Ionicons name="person" size={20} color="rgba(255, 255, 255, 0.7)" />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Username"
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        value={username}
                                        onChangeText={setUsername}
                                        autoCapitalize="none"
                                        editable={!loading}
                                    />
                                </View>
                            )}

                            <View style={styles.inputContainer}>
                                <Ionicons name="lock-closed" size={20} color="rgba(255, 255, 255, 0.7)" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    autoCapitalize="none"
                                    editable={!loading}
                                />
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleAuth}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#6366F1" />
                                ) : (
                                    <Text style={styles.submitButtonText}>
                                        {isSignUp ? 'Get Started' : 'Sign In'}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {/* Toggle Mode */}
                            <View style={styles.toggleContainer}>
                                <Text style={styles.toggleText}>
                                    {isSignUp ? 'Already have an account?' : 'Don\'t have an account?'}
                                </Text>
                                <TouchableOpacity onPress={toggleMode} disabled={loading}>
                                    <Text style={styles.toggleButton}>
                                        {isSignUp ? 'Sign In' : 'Sign Up'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    content: {
        width: '100%',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: 'white',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
    },
    form: {
        gap: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        gap: 12,
    },
    input: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        paddingVertical: 12,
        fontWeight: '500',
    },
    submitButton: {
        backgroundColor: 'white',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#6366F1',
    },
    toggleContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 16,
    },
    toggleText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '500',
    },
    toggleButton: {
        fontSize: 15,
        color: 'white',
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});