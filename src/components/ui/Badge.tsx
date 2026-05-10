import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../../theme';
import { AppText } from './AppText';

export type BadgeStatus = 'active' | 'pending' | 'overdue' | 'cancelled';

interface BadgeProps {
  status: BadgeStatus;
  label: string;
}

export function Badge({ status, label }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[status]]}>
      <AppText weight="semibold" style={[styles.text, styles[`${status}Text`]]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: theme.radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
  },
  active: { backgroundColor: theme.colors.statusActiveBg },
  activeText: { color: theme.colors.statusActiveText },
  
  pending: { backgroundColor: theme.colors.statusPendingBg },
  pendingText: { color: theme.colors.statusPendingText },
  
  overdue: { backgroundColor: theme.colors.statusOverdueBg },
  overdueText: { color: theme.colors.statusOverdueText },
  
  cancelled: { backgroundColor: theme.colors.statusCancelledBg },
  cancelledText: { color: theme.colors.statusCancelledText },
});
