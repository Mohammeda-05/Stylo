import React, { createContext, useContext, ReactNode } from 'react';

interface GuestContextType {
  isGuestMode: boolean;
  exitGuestMode?: () => void;
}

const GuestContext = createContext<GuestContextType | undefined>(undefined);

interface GuestProviderProps {
  children: ReactNode;
  isGuestMode: boolean;
  onExitGuestMode?: () => void;
}

export function GuestProvider({ children, isGuestMode, onExitGuestMode }: GuestProviderProps) {
  const value: GuestContextType = {
    isGuestMode,
    exitGuestMode: onExitGuestMode,
  };

  return (
    <GuestContext.Provider value={value}>
      {children}
    </GuestContext.Provider>
  );
}

export function useGuest(): GuestContextType {
  const context = useContext(GuestContext);
  if (context === undefined) {
    throw new Error('useGuest must be used within a GuestProvider');
  }
  return context;
}
