import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { AppText } from './AppText';
import { theme } from '../../theme';
import { ChevronDown, Check } from 'lucide-react-native';

interface SelectOption {
  label: string;
  value: string;
}

interface FormSelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function FormSelect({ label, options, value, onChange, placeholder = 'Selecione...' }: FormSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <View style={styles.group}>
      <AppText weight="bold" style={styles.label}>{label}</AppText>
      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)}>
        <AppText style={[styles.triggerText, !selected && { color: theme.colors.dxMuted }]}>
          {selected ? selected.label : placeholder}
        </AppText>
        <ChevronDown size={16} color={theme.colors.dxMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => { onChange(item.value); setOpen(false); }}
                >
                  <AppText style={[styles.optionText, item.value === value && { color: theme.colors.dxTeal }]}>
                    {item.label}
                  </AppText>
                  {item.value === value && <Check size={16} color={theme.colors.dxTeal} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
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
  trigger: {
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1,
    borderColor: theme.colors.dxBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerText: {
    fontSize: 14,
    color: theme.colors.dxText,
    fontFamily: 'Montserrat-Regular',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  dropdown: {
    backgroundColor: theme.colors.dxSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.dxBorder,
    maxHeight: 320,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.dxBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    color: theme.colors.dxText,
    fontFamily: 'Montserrat-Regular',
  },
});
