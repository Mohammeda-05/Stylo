import { useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import { useSupabaseAuth } from '../src/context/SupabaseAuthContext';

export function useSupabaseDB() {
    const { user, isSignedIn } = useSupabaseAuth();

    // Direct Supabase operations - no caching, no local storage
    const safeGetAll = useCallback(async (table: string) => {
        if (!isSignedIn || !user || !isSupabaseConfigured() || !supabase) {
            console.warn("User not signed in or Supabase not configured");
            return [];
        }

        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error("Stylo: operation failed (useSupabaseDB.ts)");
            return [];
        }
    }, [isSignedIn, user]);

    const safeGet = useCallback(async (table: string, id: string) => {
        if (!isSignedIn || !user || !isSupabaseConfigured() || !supabase) {
            console.warn("User not signed in or Supabase not configured");
            return null;
        }

        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error("Stylo: operation failed (useSupabaseDB.ts)");
            return null;
        }
    }, [isSignedIn, user]);

    const safeAdd = useCallback(async (table: string, data: any) => {
        if (!isSignedIn || !user || !isSupabaseConfigured() || !supabase) {
            throw new Error('User not signed in or Supabase not configured');
        }

        try {
            const record = {
                ...data,
                user_id: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            const { data: result, error } = await supabase
                .from(table)
                .insert(record)
                .select()
                .single();

            if (error) throw error;

            return result;
        } catch (error) {
            console.error("Stylo: operation failed (useSupabaseDB.ts)");
            throw error;
        }
    }, [isSignedIn, user]);

    const safeUpdate = useCallback(async (table: string, id: string, data: any) => {
        if (!isSignedIn || !user || !isSupabaseConfigured() || !supabase) {
            throw new Error('User not signed in or Supabase not configured');
        }

        try {
            const record = {
                ...data,
                updated_at: new Date().toISOString(),
            };

            const { data: result, error } = await supabase
                .from(table)
                .update(record)
                .eq('id', id)
                .eq('user_id', user.id)
                .select()
                .single();

            if (error) throw error;

            return result;
        } catch (error) {
            console.error("Stylo: operation failed (useSupabaseDB.ts)");
            throw error;
        }
    }, [isSignedIn, user]);

    const safeDelete = useCallback(async (table: string, id: string) => {
        if (!isSignedIn || !user || !isSupabaseConfigured() || !supabase) {
            throw new Error('User not signed in or Supabase not configured');
        }

        try {
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

            if (error) throw error;
        } catch (error) {
            console.error("Stylo: operation failed (useSupabaseDB.ts)");
            throw error;
        }
    }, [isSignedIn, user]);

    return {
        supabase,
        safeGetAll,
        safeGet,
        safeAdd,
        safeUpdate,
        safeDelete,
    };
}