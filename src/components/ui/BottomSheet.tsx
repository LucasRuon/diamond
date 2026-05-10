import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { theme } from '../../theme';
import { X } from 'lucide-react-native';
import { AppText } from './AppText';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View style={styles.sheet}>
            <View style={styles.header}>
              {title ? <AppText weight="bold" style={styles.title}>{title}</AppText> : <View />}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X color={theme.colors.dxMuted} size={20} />
              </TouchableOpacity>
            </View>
            <View style={styles.content}>
              {children}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.dxSurface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    borderTopWidth: theme.borderWidth,
    borderTopColor: theme.colors.dxBorder,
    paddingTop: 8,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: theme.borderWidth,
    borderBottomColor: theme.colors.dxBorder,
  },
  title: {
    fontSize: 16,
    color: theme.colors.dxText,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
});
