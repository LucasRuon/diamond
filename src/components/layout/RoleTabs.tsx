import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { AppText } from '../ui/AppText';
import {
  Home, Users, Calendar, CreditCard, User,
  Settings, Dumbbell, DollarSign, TrendingUp, CheckCircle,
} from 'lucide-react-native';

export type RoleTabsItem = {
  id: string;
  label: string;
  icon: keyof typeof icons;
  isActive?: boolean;
};

const icons = {
  Home, Users, Calendar, CreditCard, User,
  Settings, Dumbbell, DollarSign, TrendingUp, CheckCircle,
};

interface RoleTabsProps {
  items: RoleTabsItem[];
  onSelect: (id: string) => void;
}

export function RoleTabs({ items, onSelect }: RoleTabsProps) {
  const insets = useSafeAreaInsets();
  const count = items.length;
  // Scale down icons and labels when there are many tabs
  const iconSize = count > 5 ? 18 : 22;
  const fontSize = count > 5 ? 8 : 10;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {items.map((item) => {
        const IconComponent = icons[item.icon];
        const color = item.isActive ? theme.colors.dxTeal : theme.colors.dxMuted;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => onSelect(item.id)}
            activeOpacity={0.7}
          >
            <IconComponent color={color} size={iconSize} />
            <AppText
              weight={item.isActive ? 'bold' : 'medium'}
              style={[styles.label, { color, fontSize }]}
              numberOfLines={1}
            >
              {item.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.dxSurface,
    borderTopWidth: theme.borderWidth,
    borderTopColor: theme.colors.dxBorder,
    height: 72,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  label: {
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});
