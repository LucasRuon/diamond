import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { SimpleBarChart } from '../../components/charts/SimpleBarChart';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';

export function AdminDashboardScreen() {
  const { profile } = useAuth();
  const [totalStudents, setTotalStudents] = useState(0);
  const [activePlans, setActivePlans] = useState(0);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<{label: string, value: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Total Students
      const { count: studentCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');
      setTotalStudents(studentCount || 0);

      // 2. Active Plans & Revenue
      const { data: plansData, count: plansCount } = await supabase
        .from('student_plans')
        .select('created_at, plan:plans(price)', { count: 'exact' })
        .eq('status', 'active');
      setActivePlans(plansCount || 0);

      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const chartData: Record<string, number> = {};
      const now = new Date();

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        chartData[months[d.getMonth()]] = 0;
      }

      if (plansData) {
        plansData.forEach(p => {
          const d = new Date(p.created_at);
          const key = months[d.getMonth()];
          if (chartData[key] !== undefined && p.plan) {
            chartData[key] += parseFloat(p.plan.price);
          }
        });
      }

      setRevenueData(Object.entries(chartData).map(([label, value]) => ({ label, value })));

      // 3. Today's Trainings
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const endOfDay = new Date();
      endOfDay.setHours(23,59,59,999);

      const { data: sessions } = await supabase
        .from('training_sessions')
        .select('*')
        .gte('scheduled_at', startOfDay.toISOString())
        .lte('scheduled_at', endOfDay.toISOString())
        .order('scheduled_at');

      setTodaySessions(sessions || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="PAINEL GERAL" />
        
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <AppText style={styles.statLabel}>ALUNOS</AppText>
            <AppText weight="bold" style={styles.statValue}>{totalStudents}</AppText>
          </Card>
          <Card style={styles.statCard}>
            <AppText style={styles.statLabel}>ATIVOS</AppText>
            <AppText weight="bold" style={[styles.statValue, { color: theme.colors.dxTeal }]}>{activePlans}</AppText>
          </Card>
        </View>

        <Card style={styles.card}>
          <AppText style={styles.sectionLabel}>FATURAMENTO MENSAL (ESTIMADO)</AppText>
          <View style={{ marginTop: 16 }}>
            <SimpleBarChart data={revenueData} />
          </View>
        </Card>

        <Card highlight style={styles.card}>
          <AppText style={styles.sectionLabel}>PRÓXIMOS TREINOS (HOJE)</AppText>
          <View style={{ marginTop: 12 }}>
            {loading ? (
              <AppText style={{ color: theme.colors.dxMuted }}>Buscando agenda...</AppText>
            ) : todaySessions.length === 0 ? (
              <AppText style={{ color: theme.colors.dxMuted }}>Nenhum treino agendado para hoje.</AppText>
            ) : (
              todaySessions.map((session, idx) => (
                <View key={idx} style={[styles.rowBetween, { marginBottom: 12 }]}>
                  <AppText weight="bold" style={{ fontSize: 15 }}>{session.title}</AppText>
                  <AppText weight="bold" style={{ color: theme.colors.dxTeal }}>
                    {new Date(session.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </AppText>
                </View>
              ))
            )}
          </View>
        </Card>

        <AppText style={[styles.sectionLabel, { marginTop: 8, marginBottom: 16 }]}>COBRANÇAS RECENTES</AppText>
        <Card style={styles.card}>
          <AppText style={{ color: theme.colors.dxMuted, textAlign: 'center' }}>Nenhuma cobrança encontrada.</AppText>
        </Card>

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
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
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
    color: theme.colors.dxText,
    marginTop: 4,
  },
  card: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.dxMuted,
    textTransform: 'uppercase',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});
