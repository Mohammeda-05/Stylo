import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SupabaseAuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    isSignedIn: boolean;
    signIn: () => Promise<void>;
    signOut: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

interface SupabaseAuthProviderProps {
    children: ReactNode;
}

export function SupabaseAuthProvider({ children }: SupabaseAuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // If Supabase is not configured, just set loading to false
        if (!isSupabaseConfigured() || !supabase) {
            setIsLoading(false);
            return;
        }

        // Get initial session - this will automatically restore from AsyncStorage
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error("SupabaseAuth: Error loading session:");
                setSession(null);
                setUser(null);
                setIsLoading(false);
                return;
            }

            if (session) {
                setSession(session);
                setUser(session.user);
            } else {
                setSession(null);
                setUser(null);
            }
            setIsLoading(false);
        }).catch((error) => {
            console.error("SupabaseAuth: Error in getSession:");
            setSession(null);
            setUser(null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async () => {
        if (!isSupabaseConfigured() || !supabase) {
            throw new Error('Supabase is not configured');
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'stylo://auth/callback',
            },
        });

        if (error) throw error;
    };

    const signOut = async () => {
        if (!isSupabaseConfigured() || !supabase) {
            throw new Error('Supabase is not configured');
        }

        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const value: SupabaseAuthContextType = {
        user,
        session,
        isLoading,
        isSignedIn: !!session,
        signIn,
        signOut,
    };

    return (
        <SupabaseAuthContext.Provider value={value}>
            {children}
        </SupabaseAuthContext.Provider>
    );
}

export function useSupabaseAuth() {
    const context = useContext(SupabaseAuthContext);
    if (context === undefined) {
        throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
    }
    return context;
}