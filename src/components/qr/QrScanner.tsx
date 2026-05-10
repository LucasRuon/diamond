import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText } from '../ui/AppText';
import { Button } from '../ui/Button';
import { theme } from '../../theme';

interface QrScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
}

export function QrScanner({ onScan, onCancel }: QrScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <AppText style={styles.text}>O aplicativo precisa de permissão para usar a câmera.</AppText>
        <Button title="Conceder permissão" onPress={requestPermission} style={styles.button} />
        <Button variant="ghost" title="Cancelar" onPress={onCancel} style={styles.button} />
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data);
  };

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        <View style={styles.overlay}>
          <AppText weight="bold" style={styles.overlayText}>
            Aponte para o QR Code
          </AppText>
          <View style={styles.targetBox} />
          <Button title="Cancelar Scanner" onPress={onCancel} style={styles.cancelButton} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.dxBg,
  },
  text: {
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginBottom: 12,
    width: '100%',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  targetBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.dxTeal,
    backgroundColor: 'transparent',
    marginBottom: 40,
  },
  overlayText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  cancelButton: {
    width: '100%',
  }
});
