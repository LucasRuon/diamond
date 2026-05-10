import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { theme } from '../../theme';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterPillsProps {
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  accentColor?: string;
}

export function FilterPills({ options, selected, onSelect, accentColor = theme.colors.dxTeal }: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map(opt => {
        const isActive = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[
              styles.pill,
              isActive && { backgroundColor: `${accentColor}22`, borderColor: accentColor }
            ]}
          >
            <AppText
              weight={isActive ? 'bold' : 'regular'}
              style={[styles.pillText, isActive && { color: accentColor }]}
            >
              {opt.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1,
    borderColor: theme.colors.dxBorder,
  },
  pillText: {
    fontSize: 13,
    color: theme.colors.dxMuted,
    fontWeight: '600',
  },
});
