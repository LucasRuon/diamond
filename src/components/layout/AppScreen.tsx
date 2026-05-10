import React from 'react';
import { StyleSheet, ViewProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../theme';

interface AppScreenProps extends ViewProps {
  children: React.ReactNode;
  safeAreaTop?: boolean;
  safeAreaBottom?: boolean;
}

export function AppScreen({
  children,
  style,
  safeAreaTop = true,
  safeAreaBottom = true,
  ...props
}: AppScreenProps) {
  return (
    <View style={styles.container}>
      {safeAreaTop ? (
        <SafeAreaView edges={['top']} style={styles.safeAreaTop} />
      ) : null}
      <View style={[styles.content, style]} {...props}>
        {children}
      </View>
      {safeAreaBottom ? (
        <SafeAreaView edges={['bottom']} style={styles.safeAreaBottom} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dxBg,
  },
  safeAreaTop: {
    backgroundColor: theme.colors.dxBg,
  },
  safeAreaBottom: {
    backgroundColor: theme.colors.dxBg,
  },
  content: {
    flex: 1,
  },
});
