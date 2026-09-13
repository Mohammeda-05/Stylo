import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Hint {
  id: string;
  emoji: string;
  message: string;
  type: 'info' | 'success' | 'tip' | 'celebration';
  trigger: string;
  conditions?: {
    minItems?: number;
    maxShownCount?: number;
    cooldownHours?: number;
  };
}

interface HintState {
  [hintId: string]: {
    shownCount: number;
    lastShown: number;
    dismissed: boolean;
  };
}

interface HintContextType {
  activeHint: Hint | null;
  showHint: (trigger: string, context?: any) => Promise<void>;
  dismissHint: (hintId: string) => void;
  resetHints: () => Promise<void>;
}

const HintContext = createContext<HintContextType | undefined>(undefined);

const HINT_STORAGE_KEY = '@stylo_hints_state';
const FIRST_LAUNCH_KEY = '@stylo_first_launch';

// Predefined hints for the app
const AVAILABLE_HINTS: Hint[] = [
  // Home Screen - First time welcome
  {
    id: 'welcome_to_stylo',
    emoji: '👋',
    message: 'Welcome to STYLO! Get started by evaluating your first outfit.',
    type: 'info',
    trigger: 'home_first_visit',
    conditions: { maxShownCount: 1 }
  },

  // Evaluation Screen - First upload
  {
    id: 'upload_first_outfit',
    emoji: '📸',
    message: 'Upload your first outfit here to get AI-powered style feedback.',
    type: 'info',
    trigger: 'evaluate_first_visit',
    conditions: { maxShownCount: 1 }
  },

  // Wardrobe Screen - First visit
  {
    id: 'wardrobe_getting_started',
    emoji: '👕',
    message: 'Build your virtual wardrobe by adding clothing items for personalized outfit suggestions.',
    type: 'info',
    trigger: 'wardrobe_first_visit',
    conditions: { maxShownCount: 1 }
  },

  // Assistant Screen - First visit
  {
    id: 'assistant_welcome',
    emoji: '💬',
    message: 'Ask me about your wardrobe! Try "What should I wear from my closet?" or "Style an outfit with my items".',
    type: 'info',
    trigger: 'assistant_first_visit',
    conditions: { maxShownCount: 1 }
  },

  // Profile Screen - First visit
  {
    id: 'profile_style_journey',
    emoji: '📊',
    message: 'Track your style progress and unlock insights as you evaluate more outfits.',
    type: 'info',
    trigger: 'profile_first_visit',
    conditions: { maxShownCount: 1 }
  },

  // Achievement hints (can show multiple times with cooldown)
  {
    id: 'high_score_celebration',
    emoji: '🎉',
    message: 'Amazing score! You\'re developing great style instincts.',
    type: 'celebration',
    trigger: 'high_score_achieved',
    conditions: { maxShownCount: 3, cooldownHours: 24 }
  },

  {
    id: 'archetype_unlocked',
    emoji: '🌟',
    message: 'Your style archetype has been unlocked! It evolves as you upload more outfits.',
    type: 'celebration',
    trigger: 'archetype_unlocked',
    conditions: { maxShownCount: 1 }
  },
];

export function HintProvider({ children }: { children: ReactNode }) {
  const [activeHint, setActiveHint] = useState<Hint | null>(null);
  const [hintState, setHintState] = useState<HintState>({});
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);

  // Check if this is the first app launch
  const checkFirstLaunch = useCallback(async () => {
    try {
      const hasLaunchedBefore = await AsyncStorage.getItem(FIRST_LAUNCH_KEY);
      const isFirst = hasLaunchedBefore === null;
      setIsFirstLaunch(isFirst);
      
      if (isFirst) {
        // Mark as launched
        await AsyncStorage.setItem(FIRST_LAUNCH_KEY, 'true');
      }
    } catch (error) {
      console.error("Error checking first launch:");
      setIsFirstLaunch(false);
    }
  }, []);

  // Load hint state from storage
  const loadHintState = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(HINT_STORAGE_KEY);
      if (stored) {
        setHintState(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading hint state:");
    }
  }, []);

  // Save hint state to storage
  const saveHintState = useCallback(async (newState: HintState) => {
    try {
      await AsyncStorage.setItem(HINT_STORAGE_KEY, JSON.stringify(newState));
      setHintState(newState);
    } catch (error) {
      console.error("Error saving hint state:");
    }
  }, []);

  // Check if a hint should be shown
  const shouldShowHint = useCallback((hint: Hint, context: any = {}) => {
    // Only show first-time hints on the very first app launch
    const isFirstTimeHint = ['welcome_to_stylo', 'upload_first_outfit', 'wardrobe_getting_started', 'assistant_welcome', 'profile_style_journey'].includes(hint.id);
    
    if (isFirstTimeHint && !isFirstLaunch) {
      return false;
    }

    const state = hintState[hint.id];
    const now = Date.now();

    // Check if hint was dismissed
    if (state?.dismissed) {
      return false;
    }

    // Check max shown count
    if (hint.conditions?.maxShownCount && state?.shownCount >= hint.conditions.maxShownCount) {
      return false;
    }

    // Check cooldown period
    if (hint.conditions?.cooldownHours && state?.lastShown) {
      const cooldownMs = hint.conditions.cooldownHours * 60 * 60 * 1000;
      if (now - state.lastShown < cooldownMs) {
        return false;
      }
    }

    // Check minimum items condition
    if (hint.conditions?.minItems && context.itemCount < hint.conditions.minItems) {
      return false;
    }

    return true;
  }, [hintState, isFirstLaunch]);

  // Show a hint based on trigger
  const showHint = useCallback(async (trigger: string, context: any = {}) => {
    // Don't show if there's already an active hint
    if (activeHint) {
      return;
    }

    // Find matching hint
    const hint = AVAILABLE_HINTS.find(h => h.trigger === trigger);
    if (!hint) {
      return;
    }

    // Check if hint should be shown
    if (!shouldShowHint(hint, context)) {
      return;
    }

    // Update hint state
    const currentState = hintState[hint.id] || { shownCount: 0, lastShown: 0, dismissed: false };
    const newState = {
      ...hintState,
      [hint.id]: {
        ...currentState,
        shownCount: currentState.shownCount + 1,
        lastShown: Date.now(),
      }
    };

    await saveHintState(newState);
    setActiveHint(hint);
  }, [activeHint, hintState, shouldShowHint, saveHintState]);

  // Dismiss a hint
  const dismissHint = useCallback((hintId: string) => {
    setActiveHint(null);
    
    // Optionally mark as dismissed permanently for certain hints
    const hint = AVAILABLE_HINTS.find(h => h.id === hintId);
    if (hint?.conditions?.maxShownCount === 1) {
      const newState = {
        ...hintState,
        [hintId]: {
          ...hintState[hintId],
          dismissed: true,
        }
      };
      saveHintState(newState);
    }
  }, [hintState, saveHintState]);

  // Reset all hints (for testing or user preference)
  const resetHints = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(HINT_STORAGE_KEY);
      setHintState({});
      setActiveHint(null);
    } catch (error) {
      console.error("Error resetting hints:");
    }
  }, []);

  // Load hint state on mount
  React.useEffect(() => {
    const initialize = async () => {
      await checkFirstLaunch();
      await loadHintState();
    };
    initialize();
  }, [checkFirstLaunch, loadHintState]);

  const value: HintContextType = {
    activeHint,
    showHint,
    dismissHint,
    resetHints,
  };

  return (
    <HintContext.Provider value={value}>
      {children}
    </HintContext.Provider>
  );
}

export function useHints() {
  const context = useContext(HintContext);
  if (context === undefined) {
    throw new Error('useHints must be used within a HintProvider');
  }
  return context;
}
