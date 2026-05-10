import React from 'react';
import { Text, TextProps } from 'react-native';
import { theme } from '../../theme';

interface AppTextProps extends TextProps {
  variant?: 'brand' | 'display' | 'body';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
  color?: keyof typeof theme.colors;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function AppText({
  style,
  variant = 'body',
  weight = 'regular',
  color = 'dxText',
  align,
  ...props
}: AppTextProps) {
  const getFontFamily = () => {
    if (variant === 'brand') return theme.fonts.brand;
    switch (weight) {
      case 'medium': return theme.fonts.medium;
      case 'semibold': return theme.fonts.semiBold;
      case 'bold': return theme.fonts.bold;
      case 'extrabold': return theme.fonts.extraBold;
      case 'black': return theme.fonts.black;
      default: return theme.fonts.regular;
    }
  };

  return (
    <Text
      style={[
        {
          fontFamily: getFontFamily(),
          color: theme.colors[color],
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}
