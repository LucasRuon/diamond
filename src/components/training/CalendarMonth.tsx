import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { AppText } from '../ui/AppText';
import { getMonthMatrix, getWeekdayLabels, DayMatrix } from '../../utils/calendar';
import { theme } from '../../theme';

interface CalendarMonthProps {
  currentDate?: Date;
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  reservations?: string[];
  attendance?: string[];
}

export function CalendarMonth({ 
  currentDate = new Date(), 
  onSelectDate,
  selectedDate,
  reservations = [],
  attendance = []
}: CalendarMonthProps) {
  const matrix = getMonthMatrix(currentDate);
  const weekdays = getWeekdayLabels();
  
  const selectedKey = selectedDate ? selectedDate.toISOString().split('T')[0] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {weekdays.map(day => (
          <View key={day} style={styles.dayHeader}>
            <AppText style={styles.dayHeaderText}>{day}</AppText>
          </View>
        ))}
      </View>

      {matrix.map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map(day => {
            const isSelected = selectedKey === day.key;
            const hasReservation = reservations.includes(day.key);
            const hasAttendance = attendance.includes(day.key);
            
            return (
              <TouchableOpacity
                key={day.key}
                style={[
                  styles.dayCell,
                  !day.isCurrentMonth && styles.dayCellInactive,
                  hasAttendance && styles.dayCellAttendance,
                  isSelected && styles.dayCellSelected,
                  day.isToday && !isSelected && styles.dayCellToday
                ]}
                onPress={() => onSelectDate && onSelectDate(day.date)}
              >
                <AppText 
                  weight={isSelected || hasAttendance ? "bold" : "regular"}
                  style={[
                    styles.dayText,
                    !day.isCurrentMonth && styles.dayTextInactive,
                    hasAttendance && styles.dayTextAttendance,
                    isSelected && styles.dayTextSelected
                  ]}
                >
                  {day.day}
                </AppText>
                {hasReservation && (
                  <View style={styles.dot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    gap: 6,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  dayHeaderText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.dxMuted,
    textTransform: 'uppercase',
  },
  dayCell: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: theme.borderWidth,
    borderColor: theme.colors.dxBorder,
  },
  dayCellInactive: {
    opacity: 0.35,
  },
  dayCellAttendance: {
    backgroundColor: theme.colors.dxTealDim,
    borderColor: theme.colors.dxTealBorder,
  },
  dayCellToday: {
    borderColor: theme.colors.dxTeal,
  },
  dayCellSelected: {
    backgroundColor: theme.colors.dxTealDim,
    borderColor: theme.colors.dxTealBorder,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.dxText,
  },
  dayTextInactive: {
    color: theme.colors.dxMuted,
  },
  dayTextAttendance: {
    color: theme.colors.dxTeal,
  },
  dayTextSelected: {
    color: theme.colors.dxTeal,
  },
  dot: {
    position: 'absolute',
    bottom: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.dxTeal,
  }
});
