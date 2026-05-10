import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { CalendarMonth } from '../../components/training/CalendarMonth';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { QrCode, Calendar as CalendarIcon, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';

export function StudentTrainingsScreen() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMonthData = async (date: Date) => {
    if (!profile) return;
    setLoading(true);
    
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    
    const [sessRes, resRes, planRes] = await Promise.all([
      supabase.from('training_sessions')
        .select('*')
        .gte('scheduled_at', monthStart.toISOString())
        .lt('scheduled_at', monthEnd.toISOString())
        .order('scheduled_at'),
      supabase.from('training_reservations')
        .select('*')
        .eq('student_id', profile.id)
        .eq('status', 'booked'),
      supabase.from('student_plans')
        .select('id')
        .eq('student_id', profile.id)
        .eq('status', 'active')
        .limit(1)
    ]);

    setSessions(sessRes.data || []);
    setReservations(resRes.data || []);
    setHasActivePlan(Boolean(planRes.data && planRes.data.length > 0));
    setLoading(false);
  };

  useEffect(() => {
    fetchMonthData(selectedDate);
  }, [profile, selectedDate.getMonth(), selectedDate.getFullYear()]);

  const reservationDates = reservations.map(r => {
    const session = sessions.find(s => s.id === r.session_id);
    return session ? session.scheduled_at.split('T')[0] : null;
  }).filter(Boolean);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const daySessions = sessions.filter(s => s.scheduled_at.startsWith(selectedDateStr));

  const handleReserve = async (sessionId: string) => {
    const { error } = await supabase
      .from('training_reservations')
      .insert([{ session_id: sessionId, student_id: profile!.id }]);
    
    if (error) {
      Alert.alert("Erro", "Não foi possível marcar o treino. Talvez já tenha sido marcado ou o prazo expirou.");
    } else {
      Alert.alert("Sucesso", "Treino marcado!");
      fetchMonthData(selectedDate);
    }
  };

  const handleCancel = async (reservationId: string) => {
    const { error } = await supabase
      .from('training_reservations')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', reservationId);

    if (error) {
      Alert.alert("Erro", "Não foi possível cancelar.");
    } else {
      Alert.alert("Sucesso", "Reserva cancelada.");
      fetchMonthData(selectedDate);
    }
  };

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="MEUS TREINOS" />
        
        <Card highlight style={[styles.rowBetween, { marginBottom: 24, borderColor: theme.colors.dxTeal }]}>
          <View>
            <AppText weight="bold" style={{ fontSize: 16 }}>PRESENÇA NO TREINO</AppText>
            <AppText style={{ fontSize: 13, color: theme.colors.dxMuted }}>Escanear QR Code para check-in</AppText>
          </View>
          <TouchableOpacity style={styles.qrBtn} onPress={() => router.push('/(student)/scanner')}>
            <QrCode color={theme.colors.dxBg} size={24} />
          </TouchableOpacity>
        </Card>

        <View style={styles.calendarWrapper}>
          <CalendarMonth 
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            reservations={reservationDates}
          />
        </View>

        <AppText weight="bold" style={styles.sectionTitle}>
          AGENDA DO MÊS
        </AppText>

        {loading ? (
          <AppText style={styles.emptyText}>Buscando treinos...</AppText>
        ) : daySessions.length === 0 ? (
          <Card style={{ alignItems: 'center' }}>
            <AppText style={styles.emptyText}>Nenhum treino disponível nesta data.</AppText>
          </Card>
        ) : (
          daySessions.map(session => {
            const reservation = reservations.find(r => r.session_id === session.id);
            const date = new Date(session.scheduled_at);
            const hoursUntilSession = (date.getTime() - Date.now()) / 36e5;
            const canReserve = hoursUntilSession >= 24;
            const stateLabel = reservation ? 'Treino marcado' : (canReserve ? 'Disponível para marcar' : 'Encerrado para marcação');
            
            return (
              <Card key={session.id} style={{ marginBottom: 12, gap: 14 }}>
                <View style={[styles.rowBetween, { alignItems: 'flex-start' }]}>
                  <View>
                    <AppText weight="bold" style={{ fontSize: 16 }}>{session.title}</AppText>
                    <View style={{ marginTop: 4, gap: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <CalendarIcon size={12} color={theme.colors.dxMuted} />
                        <AppText style={styles.detailText}>{date.toLocaleDateString('pt-BR')} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</AppText>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} color={theme.colors.dxTeal} />
                        <AppText style={{ fontSize: 12, color: theme.colors.dxTeal }}>{session.location}</AppText>
                      </View>
                    </View>
                  </View>
                  <Badge 
                    status={reservation ? 'active' : (canReserve ? 'pending' : 'overdue')} 
                    label={stateLabel} 
                  />
                </View>
                
                {reservation ? (
                  <TouchableOpacity 
                    style={[styles.btn, styles.btnCancel]}
                    onPress={() => handleCancel(reservation.id)}
                  >
                    <AppText weight="bold" style={{ color: theme.colors.dxDanger, fontSize: 12 }}>CANCELAR RESERVA</AppText>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.btn, (!canReserve || !hasActivePlan) && styles.btnDisabled]}
                    disabled={!canReserve || !hasActivePlan}
                    onPress={() => handleReserve(session.id)}
                  >
                    <AppText weight="bold" style={{ color: (!canReserve || !hasActivePlan) ? theme.colors.dxMuted : theme.colors.dxTeal, fontSize: 12 }}>
                      {!hasActivePlan ? 'PLANO ATIVO NECESSÁRIO' : (canReserve ? 'MARCAR TREINO' : 'RESERVAS ENCERRADAS')}
                    </AppText>
                  </TouchableOpacity>
                )}
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
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.dxTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarWrapper: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.dxMuted,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  emptyText: {
    color: theme.colors.dxMuted,
    textAlign: 'center',
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.dxMuted,
  },
  btn: {
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.dxTeal,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  btnCancel: {
    borderColor: theme.colors.dxBorder,
  },
  btnDisabled: {
    borderColor: theme.colors.dxBorder,
    opacity: 0.55,
  }
});
