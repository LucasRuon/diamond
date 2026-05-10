import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { FilterPills } from '../../components/ui/FilterPills';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { BarChart2 } from 'lucide-react-native';

const PERIOD_OPTIONS = [
  { label: 'Este Mês', value: 'current' },
  { label: 'Todo Período', value: 'all' },
];

export function AdminReportsScreen() {
  const [period, setPeriod] = useState('current');
  const [schoolAvg, setSchoolAvg] = useState<number | null>(null);
  const [chartData, setChartData] = useState<{ label: string; value: number }[]>([]);
  const [ranking, setRanking] = useState<{ name: string; count: number; percent: number }[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = async (p: string) => {
    setLoading(true);

    let sessionQuery = supabase
      .from('training_sessions')
      .select('*', { count: 'exact', head: true })
      .lte('scheduled_at', new Date().toISOString());

    let attendanceQuery = supabase
      .from('attendance')
      .select('student_id, checked_in_at, student:users!student_id(full_name)');

    if (p === 'current') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      sessionQuery = sessionQuery.gte('scheduled_at', startOfMonth.toISOString());
      attendanceQuery = attendanceQuery.gte('checked_in_at', startOfMonth.toISOString());
    }

    const { count: sessCount } = await sessionQuery;
    const sessions = sessCount || 0;
    setTotalSessions(sessions);

    if (sessions === 0) {
      setSchoolAvg(0); setChartData([]); setRanking([]);
      setLoading(false); return;
    }

    const { data: attendance } = await attendanceQuery;
    const safeAttendance = attendance || [];

    // School average
    const { count: studentCount } = await supabase
      .from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');
    const totalPossible = (studentCount || 1) * sessions;
    setSchoolAvg(Math.round((safeAttendance.length / totalPossible) * 100));

    // Chart data
    const now = new Date();
    if (p === 'current') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
      const weeklyCounts = [0, 0, 0, 0, 0];
      safeAttendance.forEach(item => {
        const date = new Date(item.checked_in_at);
        const weekIdx = Math.min(Math.floor((date.getDate() + firstDay - 1) / 7), 4);
        weeklyCounts[weekIdx]++;
      });
      setChartData(weeklyCounts.map((v, i) => ({ label: `S${i + 1}`, value: v })));
    } else {
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const buckets: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets[`${d.getFullYear()}-${d.getMonth()}`] = 0;
      }
      safeAttendance.forEach(item => {
        const d = new Date(item.checked_in_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (buckets[key] !== undefined) buckets[key]++;
      });
      setChartData(Object.entries(buckets).map(([key, value]) => {
        const [y, m] = key.split('-').map(Number);
        return { label: months[m], value };
      }));
    }

    // Ranking
    const stats: Record<string, { name: string; count: number }> = {};
    safeAttendance.forEach(entry => {
      if (entry.student) {
        if (!stats[entry.student_id]) stats[entry.student_id] = { name: entry.student.full_name, count: 0 };
        stats[entry.student_id].count++;
      }
    });
    const sorted = Object.values(stats)
      .sort((a, b) => b.count - a.count)
      .map(s => ({ ...s, percent: Math.round((s.count / sessions) * 100) }));
    setRanking(sorted);
    setLoading(false);
  };

  useEffect(() => { loadData(period); }, [period]);

  const getBarColor = (pct: number) => pct > 70 ? theme.colors.dxTeal : pct > 40 ? theme.colors.dxWarn : theme.colors.dxDanger;

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <PageHeader title="FREQUÊNCIA" />
          <FilterPills options={PERIOD_OPTIONS} selected={period} onSelect={p => setPeriod(p)} />
        </View>

        <Card highlight style={styles.avgCard}>
          <View>
            <AppText style={styles.avgLabel}>MÉDIA GERAL DA ESCOLA</AppText>
            <AppText weight="bold" style={styles.avgValue}>
              {schoolAvg === null ? '--%' : `${schoolAvg}%`}
            </AppText>
          </View>
          <BarChart2 size={40} color={`${theme.colors.dxTeal}44`} />
        </Card>

        <Card style={{ marginBottom: 24 }}>
          <View style={styles.rowBetween}>
            <View>
              <AppText style={styles.sectionLabel}>Volume</AppText>
              <AppText weight="bold" style={styles.chartTitle}>
                {period === 'current' ? 'PRESENÇAS POR SEMANA' : 'PRESENÇAS NOS ÚLTIMOS 6 MESES'}
              </AppText>
            </View>
            <BarChart2 size={28} color={theme.colors.dxTeal} />
          </View>
          <View style={{ marginTop: 16 }}>
            {loading ? (
              <AppText style={styles.empty}>Carregando gráfico...</AppText>
            ) : (
              <SimpleBarChart data={chartData} />
            )}
          </View>
        </Card>

        <AppText style={[styles.sectionLabel, { marginBottom: 12 }]}>RANKING DE ASSIDUIDADE</AppText>
        {loading ? (
          <AppText style={styles.empty}>Gerando relatório...</AppText>
        ) : ranking.length === 0 ? (
          <AppText style={styles.empty}>Nenhum treino realizado{period === 'current' ? ' este mês' : ''}.</AppText>
        ) : ranking.map((student, idx) => {
          const color = getBarColor(student.percent);
          return (
            <Card key={idx} style={styles.rankCard}>
              <View style={styles.rowBetween}>
                <AppText weight="bold" style={{ fontSize: 15 }}>{student.name}</AppText>
                <AppText weight="bold" style={{ color }}>{student.percent}%</AppText>
              </View>
              <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${student.percent}%`, backgroundColor: color }]} />
              </View>
              <AppText style={styles.presenceText}>
                Presente em {student.count} de {totalSessions} treinos realizados.
              </AppText>
            </Card>
          );
        })}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },
  headerRow: { marginBottom: 20, gap: 12 },
  avgCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  avgLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.dxMuted },
  avgValue: { fontSize: 36, color: theme.colors.dxTeal, marginTop: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.dxMuted, textTransform: 'uppercase' },
  chartTitle: { fontSize: 16, marginTop: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rankCard: { marginBottom: 12 },
  progressBg: { height: 6, backgroundColor: theme.colors.dxSurface2, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  presenceText: { fontSize: 11, color: theme.colors.dxMuted, marginTop: 8 },
  empty: { textAlign: 'center', color: theme.colors.dxMuted, marginTop: 20 },
});
