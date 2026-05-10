import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../../theme';

interface CardProps extends ViewProps {
  highlight?: boolean;
}

export function Card({ style, highlight, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        highlight && styles.highlight,
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.dxSurface,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.dxBorder,
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  highlight: {
    borderTopWidth: 2,
    borderTopColor: theme.colors.dxTeal,
  },
});
