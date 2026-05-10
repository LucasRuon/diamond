import React, { createContext, useState, useContext, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { AppText } from './AppText';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="none">
        {toasts.map((toast) => (
          <View key={toast.id} style={[styles.toast, styles[toast.type]]}>
            <AppText weight="bold" style={styles.text}>{toast.message}</AppText>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
    gap: 10,
  },
  toast: {
    padding: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  success: {
    backgroundColor: theme.colors.statusActiveBg,
    borderColor: theme.colors.statusActiveText,
  },
  error: {
    backgroundColor: theme.colors.statusOverdueBg,
    borderColor: theme.colors.statusOverdueText,
  },
  info: {
    backgroundColor: theme.colors.dxSurface2,
    borderColor: theme.colors.dxBorder,
  },
  text: {
    color: theme.colors.dxText,
    fontSize: 13,
    textAlign: 'center',
  },
});
