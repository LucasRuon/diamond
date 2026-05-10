import React from 'react';
import { View, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { theme } from '../../theme';

interface FormInputProps extends TextInputProps {
  label: string;
}

export function FormInput({ label, style, ...props }: FormInputProps) {
  return (
    <View style={styles.group}>
      <AppText weight="bold" style={styles.label}>{label}</AppText>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={theme.colors.dxMuted}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    color: theme.colors.dxMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1,
    borderColor: theme.colors.dxBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.dxText,
    fontFamily: 'Montserrat-Regular',
  },
});
