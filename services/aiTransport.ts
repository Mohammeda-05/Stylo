import { supabase } from '../src/lib/supabase';

// Contract for a separately deployed, authenticated Supabase Edge Function.
// The function must enforce quotas and validate messages before calling a provider.
// No provider credential or configurable upstream URL belongs in the mobile app.
export async function requestAIText(request: { messages: unknown[] }): Promise<{ text: string }> {
    if (!supabase) throw new Error('AI service is not configured.');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
        throw new Error('Sign in to use AI analysis.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
        const { data, error } = await supabase.functions.invoke('stylo-ai', {
            body: { messages: request.messages },
            signal: controller.signal,
        });
        if (error || typeof data?.text !== 'string' || !data.text.trim()) {
            throw new Error('AI analysis is unavailable. Please try again.');
        }
        return { text: data.text };
    } catch {
        // Do not expose upstream response bodies, URLs, auth headers or prompts.
        throw new Error('AI analysis is unavailable. Please try again.');
    } finally {
        clearTimeout(timeout);
    }
}
