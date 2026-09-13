import React, { createContext, useContext, useCallback, useRef } from 'react';

interface DataRefreshContextType {
    triggerRefresh: (eventType?: string) => void;
    onRefresh: (callback: (eventType?: string) => void) => () => void;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export function DataRefreshProvider({ children }: { children: React.ReactNode }) {
    const listenersRef = useRef<Set<(eventType?: string) => void>>(new Set());

    const triggerRefresh = useCallback((eventType?: string) => {
        listenersRef.current.forEach(callback => {
            try {
                callback(eventType);
            } catch (error) {
                console.error("Error in refresh callback:");
            }
        });
    }, []);

    const onRefresh = useCallback((callback: (eventType?: string) => void) => {
        if (typeof callback !== 'function') {
            console.error("onRefresh: callback must be a function");
            return () => {}; // Return empty cleanup function
        }

        listenersRef.current.add(callback);

        // Return cleanup function
        return () => {
            listenersRef.current.delete(callback);
        };
    }, []);

    return (
        <DataRefreshContext.Provider value={{ triggerRefresh, onRefresh }}>
            {children}
        </DataRefreshContext.Provider>
    );
}

export function useDataRefresh() {
    const context = useContext(DataRefreshContext);
    if (context === undefined) {
        throw new Error('useDataRefresh must be used within a DataRefreshProvider');
    }
    return context;
}