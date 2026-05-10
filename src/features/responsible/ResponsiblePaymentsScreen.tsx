import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { Receipt } from 'lucide-react-native';

const STATUS_LABELS: Record<string, string> = {
  active: 'PAGO',
  pending_payment: 'AGUARDANDO',
  expired: 'VENCIDO',
  cancelled: 'CANCELADO',
};

type BadgeStatus = 'active' | 'pending' | 'overdue' | 'cancelled';
const STATUS_BADGE: Record<string, BadgeStatus> = {
  active: 'active',
  pending_payment: 'pending',
  expired: 'overdue',
  cancelled: 'cancelled',
};

export function ResponsiblePaymentsScreen() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from('student_plans')
        .select('id, created_at, status, plan:plans(name, price), student:users!student_id(full_name)')
        .eq('purchased_by', profile.id)
        .order('created_at', { ascending: false });
      setPayments(data || []);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="FATURAS E PAGAMENTOS" />

        {loading ? (
          <AppText style={styles.empty}>Buscando faturas...</AppText>
        ) : payments.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Receipt size={40} color={theme.colors.dxBorder} />
            <AppText style={[styles.empty, { marginTop: 12 }]}>Você ainda não possui faturas geradas.</AppText>
          </Card>
        ) : payments.map(p => (
          <Card key={p.id} style={styles.payCard}>
            <View style={styles.rowBetween}>
              <View>
                <AppText weight="bold" style={{ fontSize: 16 }}>{p.plan?.name || 'Serviço'}</AppText>
                <AppText style={styles.sub}>Para: {p.student?.full_name} • {new Date(p.created_at).toLocaleDateString('pt-BR')}</AppText>
              </View>
              <AppText weight="bold" style={{ color: theme.colors.dxTeal }}>
                R$ {parseFloat(p.plan?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </AppText>
            </View>
            <View style={[styles.rowBetween, styles.footer]}>
              <Badge status={STATUS_BADGE[p.status] || 'pending'} label={STATUS_LABELS[p.status] || p.status} />
              {p.status === 'pending_payment' ? (
                <TouchableOpacity style={styles.payBtn}>
                  <AppText weight="bold" style={styles.payBtnText}>PAGAR AGORA</AppText>
                </TouchableOpacity>
              ) : (
                <AppText style={styles.sub}>Recibo gerado</AppText>
              )}
            </View>
          </Card>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 12 },
  emptyCard: { alignItems: 'center', padding: 40, gap: 0 },
  empty: { textAlign: 'center', color: theme.colors.dxMuted },
  payCard: {},
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sub: { fontSize: 12, color: theme.colors.dxMuted, marginTop: 2 },
  footer: {
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: theme.colors.dxBorder,
    alignItems: 'center',
  },
  payBtn: {
    backgroundColor: theme.colors.dxTeal,
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: theme.radius.md,
  },
  payBtnText: { fontSize: 11, color: theme.colors.dxBg },
});
