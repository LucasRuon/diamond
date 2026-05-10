import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { Info } from 'lucide-react-native';

export function ResponsibleDashboardScreen() {
  const { profile } = useAuth();
  const [dependents, setDependents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchDependents = async () => {
      const { data: links } = await supabase
        .from('responsible_students')
        .select(`
            student_id,
            student:users!student_id (
                full_name,
                email
            )
        `)
        .eq('responsible_id', profile.id);

      if (!links || links.length === 0) {
        setDependents([]);
        setLoading(false);
        return;
      }

      const studentIds = links.map(l => l.student_id);
      const { data: plans } = await supabase
        .from('student_plans')
        .select('student_id, status, plan:plans(name)')
        .in('student_id', studentIds);

      const merged = links.map(l => ({
        ...l,
        plan: plans?.find(p => p.student_id === l.student_id)
      }));

      setDependents(merged);
      setLoading(false);
    };

    fetchDependents();
  }, [profile]);

  const getPlanStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'active': 'ATIVO',
        'pending_payment': 'AGUARDANDO',
        'expired': 'VENCIDO',
        'cancelled': 'CANCELADO'
    };
    return labels[status] || status.toUpperCase();
  };

  const getPlanStatusStyle = (status: string) => {
    return status === 'active' ? 'active' : (status === 'pending_payment' ? 'pending' : 'overdue');
  };

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="DIAMOND X" />
        
        <View style={styles.headerTitle}>
          <AppText style={styles.titleBrand}>OLÁ, {profile?.full_name?.split(' ')[0]}</AppText>
          <AppText style={styles.subtitle}>Visão geral dos seus atletas</AppText>
        </View>

        {loading ? (
          <AppText style={{ textAlign: 'center', color: theme.colors.dxMuted }}>Buscando atletas...</AppText>
        ) : dependents.length === 0 ? (
          <Card style={{ alignItems: 'center', padding: 32 }}>
            <AppText style={{ color: theme.colors.dxMuted }}>Nenhum aluno vinculado.</AppText>
          </Card>
        ) : (
          dependents.map((dep, idx) => (
            <Card key={idx} style={styles.card}>
              <View style={[styles.rowBetween, { marginBottom: 16, alignItems: 'flex-start' }]}>
                <View>
                  <AppText weight="bold" style={{ fontSize: 18 }}>{dep.student?.full_name || 'Sem nome'}</AppText>
                  <AppText style={{ fontSize: 12, color: theme.colors.dxMuted, marginTop: 2 }}>
                    {dep.plan ? dep.plan.plan?.name : 'Nenhuma contratação ativa'}
                  </AppText>
                </View>
                <Badge 
                  status={dep.plan ? getPlanStatusStyle(dep.plan.status) : 'overdue'} 
                  label={dep.plan ? getPlanStatusLabel(dep.plan.status) : 'SEM PLANO'} 
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                <TouchableOpacity style={styles.btnSecondary}>
                  <AppText weight="bold" style={styles.btnText}>VER FREQUÊNCIA</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSecondary}>
                  <AppText weight="bold" style={styles.btnText}>VER TREINOS</AppText>
                </TouchableOpacity>
                {(!dep.plan || dep.plan.status !== 'active') && (
                  <TouchableOpacity style={styles.btnPrimary}>
                    <AppText weight="bold" style={styles.btnTextPrimary}>PLANOS</AppText>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        )}

        <Card style={styles.infoCard}>
          <Info size={24} color={theme.colors.dxWarn} />
          <AppText style={{ fontSize: 13, color: theme.colors.dxMuted, flex: 1 }}>
            Lembre-se: o acesso aos treinos é liberado apenas após a confirmação do pagamento.
          </AppText>
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
    padding: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnSecondary: {
    flex: 1,
    padding: 10,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1,
    borderColor: theme.colors.dxBorder,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minWidth: 100,
  },
  btnPrimary: {
    flex: 1,
    padding: 10,
    backgroundColor: theme.colors.dxTeal,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    minWidth: 100,
  },
  btnText: {
    fontSize: 12,
    color: theme.colors.dxText,
  },
  btnTextPrimary: {
    fontSize: 12,
    color: theme.colors.dxBg,
  },
  infoCard: {
    marginTop: 8,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1,
    borderColor: theme.colors.dxBorder,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  }
});
