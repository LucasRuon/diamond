import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '../ui/AppText';
import { theme } from '../../theme';

interface SimpleBarChartProps {
  data: { label: string; value: number }[];
  maxValue?: number;
  height?: number;
}

export function SimpleBarChart({ data, maxValue, height = 150 }: SimpleBarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);

  return (
    <View style={[styles.container, { height }]}>
      {data.map((item, index) => {
        const barHeight = `${(item.value / max) * 100}%` as any;
        return (
          <View key={index} style={styles.barContainer}>
            <View style={styles.valueContainer}>
              <AppText style={styles.valueText}>{item.value}</AppText>
            </View>
            <View style={styles.barBackground}>
              <LinearGradient 
                colors={[theme.colors.dxTeal, 'rgba(0, 201, 167, 0.35)']}
                style={[styles.barFill, { height: barHeight }]} 
              />
            </View>
            <AppText style={styles.labelText} numberOfLines={1}>{item.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 24,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  valueContainer: {
    marginBottom: 4,
  },
  valueText: {
    fontSize: 10,
    color: theme.colors.dxMuted,
  },
  barBackground: {
    width: 24,
    height: '100%',
    backgroundColor: theme.colors.dxSurface2,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.dxTealBorder,
  },
  labelText: {
    fontSize: 10,
    marginTop: 8,
    color: theme.colors.dxMuted,
    position: 'absolute',
    bottom: -20,
  }
});
