import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, TouchableOpacityProps } from 'react-native';
import { theme } from '../../theme';
import { AppText } from './AppText';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'diamond' | 'ghost';
  title: string;
  loading?: boolean;
}

export function Button({
  style,
  variant = 'primary',
  title,
  loading,
  disabled,
  ...props
}: ButtonProps) {
  const isDiamond = variant === 'diamond';
  const isGhost = variant === 'ghost';
  
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.base,
        isDiamond && styles.diamond,
        isGhost && styles.ghost,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isDiamond || isGhost ? theme.colors.dxTeal : theme.colors.dxBg} />
      ) : (
        <AppText
          weight="extrabold"
          style={[
            styles.text,
            isDiamond && styles.diamondText,
            isGhost && styles.ghostText,
          ]}
        >
          {title}
        </AppText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.dxTeal,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  diamond: {
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: theme.colors.dxTeal,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: theme.colors.dxBg,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  diamondText: {
    color: theme.colors.dxTeal,
  },
  ghostText: {
    color: theme.colors.dxTeal,
  },
});
