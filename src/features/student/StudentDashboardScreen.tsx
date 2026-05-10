import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { ShieldCheck, BarChart2, MapPin } from 'lucide-react-native';

export function StudentDashboardScreen() {
  const { profile } = useAuth();
  const [studentPlan, setStudentPlan] = useState<any>(null);
  const [presences, setPresences] = useState(0);
  const [nextTraining, setNextTraining] = useState<any>(null);
  const [responsible, setResponsible] = useState<any>(null);

  useEffect(() => {
    if (!profile) return;
    const userId = profile.id;

    // 1. Plano e Presenças
    supabase.from('student_plans')
      .select('status, created_at, plan:plans(name, duration_days)')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setStudentPlan(data));

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    
    supabase.from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', userId)
      .gte('checked_in_at', startOfMonth.toISOString())
      .then(({ count }) => setPresences(count || 0));

    // 2. Próximo Treino
    supabase.from('training_sessions')
      .select('*')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(1)
      .single()
      .then(({ data }) => setNextTraining(data));

    // 3. Responsável
    supabase.from('responsible_students')
      .select('responsible:users!responsible_id(full_name, phone, email)')
      .eq('student_id', userId)
      .single()
      .then(({ data }) => {
        if (data && data.responsible) setResponsible(data.responsible);
      });
  }, [profile]);

  let validityStr = '--';
  if (studentPlan && studentPlan.status === 'active' && studentPlan.plan) {
      const date = new Date(studentPlan.created_at);
      date.setDate(date.getDate() + studentPlan.plan.duration_days);
      validityStr = date.toLocaleDateString('pt-BR');
  }

  const getPlanStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
          'active': 'ATIVO',
          'pending_payment': 'PENDENTE',
          'expired': 'VENCIDO',
          'cancelled': 'CANCELADO'
      };
      return labels[status] || status.toUpperCase();
  };

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="DIAMOND X" />
        
        <View style={styles.headerTitle}>
          <AppText style={styles.titleBrand}>OLÁ, {profile?.full_name?.split(' ')[0]}</AppText>
          <AppText style={styles.subtitle}>Painel do Atleta</AppText>
        </View>

        <Card highlight style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <AppText style={styles.label}>Plano Ativo</AppText>
              <AppText weight="bold" style={styles.planValue}>
                {studentPlan?.plan?.name || 'NENHUM PLANO'}
              </AppText>
            </View>
            {studentPlan && (
              <Badge 
                status={studentPlan.status === 'active' ? 'active' : 'pending'} 
                label={getPlanStatusLabel(studentPlan.status)} 
              />
            )}
          </View>
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <AppText style={styles.infoText}>
              Válido até: <AppText weight="bold" style={{ color: theme.colors.dxText }}>{validityStr}</AppText>
            </AppText>
            <AppText weight="bold" style={styles.linkText}>VER OUTROS</AppText>
          </View>
        </Card>

        <Card style={[styles.card, styles.surface2Card]}>
          <View>
            <AppText style={styles.label}>Frequência (Mês)</AppText>
            <AppText weight="bold" style={styles.freqValue}>
              {presences} <AppText style={styles.freqLabel}>treinos</AppText>
            </AppText>
          </View>
          <View style={styles.iconBox}>
            <BarChart2 color={theme.colors.dxTeal} size={20} />
          </View>
        </Card>

        {nextTraining && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>PRÓXIMO TREINO</AppText>
            <Card style={styles.nextTrainingCard}>
              <View style={styles.bgIconContainer}>
                {/* Fallback for bg icon */}
              </View>
              <AppText weight="bold" style={styles.trainingDate}>
                {new Date(nextTraining.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()} • {new Date(nextTraining.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </AppText>
              <AppText weight="bold" style={styles.trainingTitle}>{nextTraining.title}</AppText>
              <View style={styles.locationRow}>
                <MapPin size={14} color={theme.colors.dxMuted} />
                <AppText style={styles.locationText}>{nextTraining.location}</AppText>
              </View>
            </Card>
          </View>
        )}

        {responsible && (
          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>MEU RESPONSÁVEL</AppText>
            <Card style={[styles.card, styles.surface2Card, { justifyContent: 'flex-start', gap: 12 }]}>
              <View style={styles.iconBox}>
                <ShieldCheck color={theme.colors.dxTeal} size={20} />
              </View>
              <View>
                <AppText weight="bold" style={{ color: theme.colors.dxText }}>{responsible.full_name}</AppText>
                <AppText style={{ fontSize: 12, color: theme.colors.dxMuted }}>{responsible.email}</AppText>
              </View>
            </Card>
          </View>
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
  headerTitle: {
    marginBottom: 24,
  },
  titleBrand: {
    fontFamily: 'Abnes-Regular',
    fontSize: 28,
    color: theme.colors.dxTeal,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.dxMuted,
  },
  card: {
    marginBottom: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 11,
    color: theme.colors.dxMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  planValue: {
    fontSize: 18,
    marginTop: 4,
    color: theme.colors.dxText,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.dxMuted,
  },
  linkText: {
    fontSize: 12,
    color: theme.colors.dxTeal,
  },
  surface2Card: {
    backgroundColor: theme.colors.dxSurface2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  freqValue: {
    fontSize: 22,
    marginTop: 4,
    color: theme.colors.dxText,
  },
  freqLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.dxMuted,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.dxTealDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.dxTealBorder,
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.dxMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  nextTrainingCard: {
    borderColor: theme.colors.dxTealBorder,
    overflow: 'hidden',
  },
  bgIconContainer: {
    position: 'absolute',
    right: -10,
    top: -10,
    opacity: 0.1,
  },
  trainingDate: {
    color: theme.colors.dxTeal,
    fontSize: 12,
  },
  trainingTitle: {
    fontSize: 20,
    marginVertical: 4,
    color: theme.colors.dxText,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: theme.colors.dxMuted,
  }
});
