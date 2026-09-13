import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHints } from '../context/HintContext';
import HintBanner from './HintBanner';

interface HintWrapperProps {
  children: React.ReactNode;
}

export default function HintWrapper({ children }: HintWrapperProps) {
  const { activeHint, dismissHint } = useHints();
  const insets = useSafeAreaInsets();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    hintContainer: {
      position: 'absolute',
      top: insets.top,
      left: 0,
      right: 0,
      zIndex: 1000,
    },
  });

  return (
    <View style={styles.container}>
      {children}
      
      {activeHint && (
        <View style={styles.hintContainer}>
          <HintBanner
            hint={activeHint}
            onDismiss={dismissHint}
            autoDismissDelay={4000}
          />
        </View>
      )}
    </View>
  );
}