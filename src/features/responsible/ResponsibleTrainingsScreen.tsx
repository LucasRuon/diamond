import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { CalendarMonth } from '../../components/training/CalendarMonth';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { MapPin, Calendar } from 'lucide-react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

export function ResponsibleTrainingsScreen() {
  const { profile } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [linkedStudents, setLinkedStudents] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const loadData = async (month: Date) => {
    if (!profile?.id) return;
    setLoading(true);

    // Load linked students
    const { data: links } = await supabase
      .from('responsible_students')
      .select('student_id, student:users!student_id(id, full_name, email)')
      .eq('responsible_id', profile.id);

    if (!links?.length) {
      setSessions([]); setReservations([]); setLoading(false); return;
    }

    const studentsMap = new Map(links.map(l => [l.student_id, l.student || { full_name: 'Aluno', email: '' }]));
    setLinkedStudents(studentsMap);
    const linkedIds = links.map(l => l.student_id);

    // Load sessions for month
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1);

    const { data: sessData } = await supabase
      .from('training_sessions').select('*')
      .gte('scheduled_at', monthStart.toISOString())
      .lt('scheduled_at', monthEnd.toISOString())
      .order('scheduled_at');

    setSessions(sessData || []);

    // Load reservations for linked students
    if (sessData?.length) {
      const { data: resData } = await supabase
        .from('training_reservations')
        .select('id, session_id, student_id, status')
        .in('student_id', linkedIds)
        .eq('status', 'booked');
      setReservations(resData || []);
    } else {
      setReservations([]);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(currentMonth); }, [profile, currentMonth.getMonth(), currentMonth.getFullYear()]);

  const changeMonth = (dir: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  };

  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const calendarReservations = reservations
    .map(r => sessions.find(s => s.id === r.session_id)?.scheduled_at?.split('T')[0])
    .filter(Boolean);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const daySessions = sessions.filter(s => s.scheduled_at.startsWith(selectedDateStr));

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <PageHeader title="TREINOS" />
          <AppText style={styles.subtitle}>Reservas dos alunos vinculados</AppText>
        </View>

        {/* Month navigation */}
        <Card style={styles.calendarCard}>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
              <ChevronLeft size={20} color={theme.colors.dxText} />
            </TouchableOpacity>
            <AppText weight="bold" style={styles.monthLabel}>
              {months[currentMonth.getMonth()].toUpperCase()} {currentMonth.getFullYear()}
            </AppText>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
              <ChevronRight size={20} color={theme.colors.dxText} />
            </TouchableOpacity>
          </View>
          <CalendarMonth
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            reservations={calendarReservations}
          />
        </Card>

        <AppText style={styles.sectionLabel}>AGENDA DO MÊS</AppText>

        {loading ? (
          <AppText style={styles.empty}>Buscando treinos...</AppText>
        ) : sessions.length === 0 ? (
          <AppText style={styles.empty}>Nenhum treino agendado neste mês.</AppText>
        ) : sessions.map(session => {
          const date = new Date(session.scheduled_at);
          const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
          const sessReservations = reservations.filter(r => r.session_id === session.id);
          const hasReservation = sessReservations.length > 0;

          return (
            <Card key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={{ flex: 1 }}>
                  <AppText weight="bold" style={{ fontSize: 16 }}>{session.title}</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <Calendar size={12} color={theme.colors.dxMuted} />
                    <AppText style={styles.sub}>{dateStr} às {timeStr}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                    <MapPin size={12} color={theme.colors.dxTeal} />
                    <AppText style={[styles.sub, { color: theme.colors.dxTeal }]}>{session.location}</AppText>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: hasReservation ? `${theme.colors.dxTeal}22` : theme.colors.dxSurface2, borderColor: hasReservation ? theme.colors.dxTeal : theme.colors.dxBorder }]}>
                  <AppText weight="bold" style={[styles.statusText, { color: hasReservation ? theme.colors.dxTeal : theme.colors.dxMuted }]}>
                    {hasReservation ? 'RESERVADO' : 'SEM RESERVA'}
                  </AppText>
                </View>
              </View>

              {sessReservations.map((res, idx) => {
                const student = linkedStudents.get(res.student_id) || { full_name: 'Aluno', email: '' };
                return (
                  <View key={idx} style={styles.studentRow}>
                    <View>
                      <AppText weight="bold" style={{ fontSize: 13 }}>{student.full_name}</AppText>
                      <AppText style={styles.sub}>{student.email}</AppText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${theme.colors.dxTeal}22`, borderColor: theme.colors.dxTeal }]}>
                      <AppText weight="bold" style={[styles.statusText, { color: theme.colors.dxTeal }]}>RESERVADO</AppText>
                    </View>
                  </View>
                );
              })}

              {!hasReservation && (
                <AppText style={[styles.sub, { marginTop: 8 }]}>Sem reserva dos seus alunos.</AppText>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 16 },
  subtitle: { fontSize: 13, color: theme.colors.dxMuted, marginBottom: 8 },
  calendarCard: {},
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { padding: 8 },
  monthLabel: { fontSize: 16, letterSpacing: 1.2 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.dxMuted, textTransform: 'uppercase' },
  sessionCard: { gap: 0 },
  sessionHeader: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  sub: { fontSize: 12, color: theme.colors.dxMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '700' },
  studentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 10, backgroundColor: theme.colors.dxSurface2,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.dxBorder,
    marginTop: 8,
  },
  empty: { textAlign: 'center', color: theme.colors.dxMuted, marginTop: 20 },
});
