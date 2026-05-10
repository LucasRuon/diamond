import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { CalendarMonth } from '../../components/training/CalendarMonth';
import { Card } from '../../components/ui/Card';
import { theme } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export function StudentAttendanceScreen() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('attendance')
      .select(`
          checked_in_at,
          method,
          session:training_sessions (
              title,
              scheduled_at
          )
      `)
      .eq('student_id', profile.id)
      .order('checked_in_at', { ascending: false })
      .then(({ data }) => {
        setHistory(data || []);
        setLoading(false);
      });
  }, [profile]);

  const now = new Date();
  const currentMonthItems = history.filter(item => {
    const d = new Date(item.checked_in_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const attendanceDates = currentMonthItems.map(item => new Date(item.checked_in_at).toISOString().split('T')[0]);

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const weeklyCounts = [0, 0, 0, 0, 0, 0];

  currentMonthItems.forEach(item => {
      const date = new Date(item.checked_in_at);
      const weekIndex = Math.floor((date.getDate() + firstDay - 1) / 7);
      if (weekIndex >= 0 && weekIndex < 6) {
        weeklyCounts[weekIndex] += 1;
      }
  });

  const chartData = weeklyCounts.map((count, i) => ({
    label: `S${i + 1}`,
    value: count
  }));

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="MINHA FREQUÊNCIA" />
        
        <View style={styles.statsRow}>
          <Card highlight style={styles.statCard}>
            <AppText style={styles.statLabel}>PRESENÇAS</AppText>
            <AppText weight="bold" style={styles.statValue}>{history.length}</AppText>
          </Card>
          <Card style={[styles.statCard, { borderColor: theme.colors.dxBorder }]}>
            <AppText style={styles.statLabel}>ESTE MÊS</AppText>
            <AppText weight="bold" style={[styles.statValue, { color: theme.colors.dxText }]}>{currentMonthItems.length}</AppText>
          </Card>
        </View>

        <Card style={{ marginBottom: 20 }}>
          <View style={{ marginBottom: 12 }}>
            <AppText style={styles.sectionLabel}>Calendário</AppText>
            <AppText weight="bold" style={{ fontSize: 16 }}>
              {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}
            </AppText>
          </View>
          <CalendarMonth 
            currentDate={now}
            attendance={attendanceDates}
          />
        </Card>

        <Card style={styles.chartCard}>
          <AppText style={styles.sectionLabel}>Gráfico</AppText>
          <AppText weight="bold" style={styles.chartTitle}>PRESENÇAS POR SEMANA</AppText>
          <SimpleBarChart data={chartData} />
        </Card>

        <AppText style={[styles.sectionLabel, { marginTop: 24, marginBottom: 12 }]}>HISTÓRICO</AppText>
        
        {loading ? (
          <AppText style={{ textAlign: 'center', color: theme.colors.dxMuted }}>Carregando histórico...</AppText>
        ) : history.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <AppText style={{ color: theme.colors.dxMuted }}>Nenhuma presença registrada ainda.</AppText>
          </View>
        ) : (
          history.map((item, idx) => {
            const date = new Date(item.checked_in_at);
            return (
              <Card key={idx} style={[styles.rowBetween, { marginBottom: 12 }]}>
                <View>
                  <AppText weight="bold" style={{ fontSize: 15 }}>{item.session?.title || 'Treino'}</AppText>
                  <AppText style={{ fontSize: 12, color: theme.colors.dxMuted, marginTop: 2 }}>
                    {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • {item.method === 'qrcode' ? 'QR Code' : 'Manual'}
                  </AppText>
                </View>
                <View style={styles.confirmBadge}>
                  <AppText weight="bold" style={{ color: theme.colors.dxTeal, fontSize: 11 }}>CONFIRMADO</AppText>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.dxMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 28,
    color: theme.colors.dxTeal,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.dxMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  chartCard: {
    padding: 20,
  },
  chartTitle: {
    fontSize: 16,
    color: theme.colors.dxText,
    marginTop: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmBadge: {
    backgroundColor: theme.colors.dxTealDim,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  }
});
