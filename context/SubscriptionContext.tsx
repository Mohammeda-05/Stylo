import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import PaymentService from '../services/paymentService';

interface SubscriptionContextType {
  isPro: boolean;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  logOut: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = async () => {
    try {
      setIsLoading(true);
      const proStatus = await PaymentService.refreshEntitlements();
      setIsPro(proStatus);
    } catch (error) {
      console.error("Failed to refresh subscription:");
      setIsPro(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logOut = async () => {
    try {
      await PaymentService.logOut();
      setIsPro(false);
    } catch (error) {
      console.error("Failed to log out:");
    }
  };

  useEffect(() => {
    let removeListener: (() => void) | null = null;

    const initializeSubscription = async () => {
      try {
        // Initialize PaymentService
        await PaymentService.initialize();
        
        // Set up listener for entitlement changes
        removeListener = PaymentService.setupCustomerInfoListener((newIsPro: boolean) => {
          setIsPro(newIsPro);
        });

        // Get initial subscription status
        await refreshSubscription();
      } catch (error) {
        console.error("Failed to initialize subscription:");
        setIsLoading(false);
      }
    };

    initializeSubscription();

    // Cleanup listener on unmount
    return () => {
      if (removeListener) {
        removeListener();
      }
      PaymentService.cleanup();
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isPro, isLoading, refreshSubscription, logOut }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}