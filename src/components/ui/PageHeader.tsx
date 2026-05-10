import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { AppText } from './AppText';
import { theme } from '../../theme';

interface PageHeaderProps {
  title: string;
  showLogo?: boolean;
  action?: React.ReactNode;
}

export function PageHeader({ title, showLogo = true, action }: PageHeaderProps) {
  // When an action button is provided, hide the logo to avoid clipping
  const displayLogo = showLogo && !action;

  return (
    <View style={styles.container}>
      <AppText variant="brand" style={styles.title}>{title}</AppText>
      <View style={styles.right}>
        {displayLogo && (
          <Image
            source={require('../../../base_icon_transparent_background.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
        {action && action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    flexShrink: 1,
    flex: 1,
    color: theme.colors.dxText,
  },
  right: {
    flexShrink: 0,
    marginLeft: 8,
  },
  logo: {
    width: 64,
    height: 46,
    opacity: 0.95,
  },
});
