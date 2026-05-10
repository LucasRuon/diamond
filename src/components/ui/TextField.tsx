import React, { useState } from 'react';
import { View, TextInput, TextInputProps, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { AppText } from './AppText';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextField({ label, error, style, onFocus, onBlur, ...props }: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <AppText weight="semibold" style={styles.label}>
          {label}
        </AppText>
      )}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={theme.colors.dxMuted}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <AppText color="dxDanger" style={styles.errorText}>
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: theme.colors.dxMuted,
  },
  input: {
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.dxBorder,
    borderRadius: theme.radius.md,
    padding: 12,
    color: theme.colors.dxText,
    fontFamily: theme.fonts.regular,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: theme.colors.dxTeal,
  },
  inputError: {
    borderColor: theme.colors.dxDanger,
  },
  errorText: {
    fontSize: 12,
    marginTop: -4,
  },
});
