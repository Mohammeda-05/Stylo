import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    border: string;
    success: string;
    warning: string;
    error: string;
  };
}

const themes: Record<string, Theme> = {
  default: {
    name: 'Modern',
    colors: {
      primary: '#6366F1', // Modern indigo - gender neutral
      secondary: '#1F2937',
      background: '#0F172A', // Slate dark
      surface: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      accent: '#8B5CF6', // Purple accent
      border: '#334155',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
  light: {
    name: 'Light',
    colors: {
      primary: '#6366F1',
      secondary: '#F1F5F9',
      background: '#FFFFFF',
      surface: '#F1F5F9', // Changed from #F8FAFC to create more contrast
      text: '#0F172A',
      textSecondary: '#64748B',
      accent: '#8B5CF6',
      border: '#E2E8F0',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
  dark: {
    name: 'Dark',
    colors: {
      primary: '#A855F7', // Purple primary
      secondary: '#1F1F1F',
      background: '#121212',
      surface: '#1F1F1F',
      text: '#FFFFFF',
      textSecondary: '#B3B3B3',
      accent: '#A855F7',
      border: '#2F2F2F',
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#CF6679',
    },
  },
  midnight: {
    name: 'Midnight',
    colors: {
      primary: '#06B6D4', // Cyan - modern and fresh
      secondary: '#0D1421',
      background: '#000000',
      surface: '#0D1421',
      text: '#FFFFFF',
      textSecondary: '#8A8A8A',
      accent: '#06B6D4',
      border: '#1A2332',
      success: '#4CAF50',
      warning: '#FFB74D',
      error: '#E57373',
    },
  },
  warm: {
    name: 'Warm',
    colors: {
      primary: '#F97316', // Orange - energetic and modern
      secondary: '#FEF3E2',
      background: '#FFFBF5',
      surface: '#F7EDD3', // Changed from #FEF3E2 to create more contrast with background
      text: '#1C1917',
      textSecondary: '#78716C',
      accent: '#F97316',
      border: '#E7E5E4',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
  rose: {
    name: 'Rose',
    colors: {
      primary: '#EC4899', // Pink - modern and inclusive
      secondary: '#FDF2F8',
      background: '#FFFBFE',
      surface: '#F9E6F2', // Changed from #FDF2F8 to create more contrast with background
      text: '#1F2937',
      textSecondary: '#6B7280',
      accent: '#EC4899',
      border: '#F3E8FF',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  },
};

interface ThemeContextType {
  theme: Theme;
  themeName: string;
  setTheme: (themeName: string) => void;
  availableThemes: string[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState('default');

  const setTheme = (newThemeName: string) => {
    if (themes[newThemeName]) {
      setThemeName(newThemeName);
    }
  };

  const value: ThemeContextType = {
    theme: themes[themeName],
    themeName,
    setTheme,
    availableThemes: Object.keys(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
