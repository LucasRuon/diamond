import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText } from '../ui/AppText';
import { theme } from '../../theme';

interface QrCodeDisplayProps {
  value: string;
}

export function QrCodeDisplay({ value }: QrCodeDisplayProps) {
  return (
    <View style={styles.container}>
      <AppText style={styles.placeholderText}>
        QR Code Nativo Gerado
      </AppText>
      <AppText style={styles.valueText}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  placeholderText: {
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  valueText: {
    color: theme.colors.dxTeal,
    fontSize: 10,
    textAlign: 'center',
  }
});
