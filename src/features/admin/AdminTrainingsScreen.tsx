import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Modal, TouchableOpacity, Alert } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { CalendarMonth } from '../../components/training/CalendarMonth';
import { Card } from '../../components/ui/Card';
import { BottomModal } from '../../components/ui/BottomModal';
import { FormInput } from '../../components/ui/FormInput';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { Trash2, Users, MapPin, QrCode, Plus, CheckCircle, Circle } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

function createQrToken() {
  const crypto = globalThis.crypto;
  const randomUUID = crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(crypto);
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto?.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function AdminTrainingsScreen() {
  const { profile } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [sessions, setSessions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [currentQrToken, setCurrentQrToken] = useState<string>('');

  // Create session
  const [createModal, setCreateModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');


  // Attendance list
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<any>(null);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<string[]>([]);

  const fetchTrainings = async (date: Date) => {
    setLoading(true);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const { data: sessData } = await supabase
      .from('training_sessions')
      .select('*')
      .gte('scheduled_at', monthStart.toISOString())
      .lt('scheduled_at', monthEnd.toISOString())
      .order('scheduled_at');

    setSessions(sessData || []);

    if (sessData && sessData.length > 0) {
      const ids = sessData.map(s => s.id);
      const { data: resData } = await supabase
        .from('training_reservations')
        .select('id, session_id, status, student:users!student_id(id, full_name, email)')
        .in('session_id', ids)
        .eq('status', 'booked');
      
      setReservations(resData || []);
    } else {
      setReservations([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchTrainings(selectedDate);
  }, [selectedDate.getMonth(), selectedDate.getFullYear()]);

  const handleDelete = (id: string) => {
    Alert.alert('Excluir Treino', 'Deseja excluir este treino?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('training_sessions').delete().eq('id', id);
          if (!error) {
            Alert.alert('Sucesso', 'Treino excluído!');
            fetchTrainings(selectedDate);
          } else {
            Alert.alert('Erro', error.message);
          }
      }}
    ]);
  };

  const showQrCode = (token: string) => {
    setCurrentQrToken(token);
    setQrModalVisible(true);
  };

  const openCreateSession = () => {
    setSessionTitle('');
    setSessionDate(selectedDate.toISOString().split('T')[0]);
    setSessionTime('08:00');
    setSessionLocation('Diamond X - Unidade Principal');

    setCreateModal(true);
  };

  const handleCreateSession = async () => {
    if (!sessionTitle || !sessionDate || !sessionTime) {
      Alert.alert('Erro', 'Preencha título, data e horário.'); return;
    }

    const scheduledAt = new Date(`${sessionDate}T${sessionTime}:00`);
    const qrToken = createQrToken();

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('training_sessions').insert([{
      title: sessionTitle,
      scheduled_at: scheduledAt.toISOString(),
      location: sessionLocation || 'Diamond X',
      qr_code_token: qrToken,
      created_by: user?.id,
    }]);

    if (error) { Alert.alert('Erro', error.message); return; }
    setCreateModal(false);
    Alert.alert('Sucesso', 'Treino criado!');
    fetchTrainings(selectedDate);
  };

  const showAttendanceList = async (session: any) => {
    setAttendanceSession(session);

    // Load reservations for this session
    const { data: sessionReservations } = await supabase
      .from('training_reservations')
      .select('id, student_id, status, student:users!student_id(full_name, email)')
      .eq('session_id', session.id);

    setAttendanceList(sessionReservations || []);

    // Load existing attendance records
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('student_id')
      .eq('session_id', session.id);

    setAttendanceRecords((existingAttendance || []).map(a => a.student_id));
    setAttendanceModal(true);
  };

  const toggleAttendance = async (studentId: string) => {
    const isPresent = attendanceRecords.includes(studentId);

    if (isPresent) {
      // Remove attendance
      await supabase.from('attendance')
        .delete()
        .eq('session_id', attendanceSession.id)
        .eq('student_id', studentId);
      setAttendanceRecords(prev => prev.filter(id => id !== studentId));
    } else {
      // Add attendance
      const { error } = await supabase.from('attendance').insert([{
        student_id: studentId,
        session_id: attendanceSession.id,
        checked_in_at: new Date().toISOString(),
        manual: true,
      }]);
      if (!error) setAttendanceRecords(prev => [...prev, studentId]);
      else Alert.alert('Erro', error.message);
    }
  };

  const reservedSessionIds = reservations.map(r => r.session_id);
  const calendarReservations = sessions.filter(s => reservedSessionIds.includes(s.id)).map(s => s.scheduled_at.split('T')[0]);

  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const daySessions = sessions.filter(s => s.scheduled_at.startsWith(selectedDateStr));

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="TREINOS"
          action={
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.dxTeal }]} onPress={openCreateSession}>
              <Plus size={18} color={theme.colors.dxBg} />
            </TouchableOpacity>
          }
        />
        
        <View style={styles.calendarWrapper}>
          <CalendarMonth 
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            reservations={calendarReservations}
          />
        </View>

        <AppText weight="bold" style={styles.sectionTitle}>
          AGENDA DO DIA {selectedDate.toLocaleDateString('pt-BR')}
        </AppText>

        {loading ? (
          <AppText style={styles.emptyText}>Carregando agenda...</AppText>
        ) : daySessions.length === 0 ? (
          <Card style={styles.card}>
            <AppText style={styles.emptyText}>Nenhum treino agendado nesta data.</AppText>
            <TouchableOpacity style={[styles.btnSecondary, { marginTop: 12 }]} onPress={openCreateSession}>
              <Plus size={16} color={theme.colors.dxTeal} />
              <AppText weight="bold" style={[styles.btnText, { color: theme.colors.dxTeal }]}>ADICIONAR TREINO</AppText>
            </TouchableOpacity>
          </Card>
        ) : (
          daySessions.map(session => {
            const isPast = new Date(session.scheduled_at) < new Date();
            const date = new Date(session.scheduled_at);
            const sessionReservations = reservations.filter(r => r.session_id === session.id);
            
            return (
              <Card key={session.id} style={[styles.sessionCard, { borderLeftColor: isPast ? theme.colors.dxBorder : theme.colors.dxTeal }]}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <AppText style={[styles.dateText, { color: isPast ? theme.colors.dxMuted : theme.colors.dxTeal }]}>
                      {date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()} • {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </AppText>
                    <AppText weight="bold" style={styles.sessionTitle}>{session.title}</AppText>
                    <View style={styles.locationRow}>
                      <MapPin size={12} color={theme.colors.dxMuted} />
                      <AppText style={styles.locationText}>{session.location}</AppText>
                    </View>
                    <AppText style={styles.reservationText}>
                      {sessionReservations.length} reserva{sessionReservations.length === 1 ? '' : 's'}
                    </AppText>
                  </View>
                  <TouchableOpacity onPress={() => showQrCode(session.qr_code_token)} style={{ padding: 8 }}>
                    <QrCode color={theme.colors.dxTeal} size={28} />
                  </TouchableOpacity>
                </View>

                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.btnSecondary} onPress={() => showAttendanceList(session)}>
                    <Users size={16} color={theme.colors.dxText} />
                    <AppText weight="bold" style={styles.btnText}>PRESENÇAS</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDelete} onPress={() => handleDelete(session.id)}>
                    <Trash2 size={16} color={theme.colors.dxDanger} />
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <AppText weight="bold" style={{ fontSize: 18, marginBottom: 20 }}>CHECK-IN DO TREINO</AppText>
            <View style={{ padding: 20, backgroundColor: '#fff', borderRadius: 12 }}>
              {currentQrToken ? (
                <QRCode value={currentQrToken} size={200} />
              ) : null}
            </View>
            <AppText style={{ color: theme.colors.dxMuted, marginTop: 16, marginBottom: 24, textAlign: 'center' }}>
              Peça para o aluno apontar a câmera do aplicativo para este código.
            </AppText>
            <TouchableOpacity onPress={() => setQrModalVisible(false)} style={{ padding: 12, borderWidth: 1, borderColor: theme.colors.dxBorder, borderRadius: 8, width: '100%', alignItems: 'center' }}>
              <AppText weight="bold" style={{ color: theme.colors.dxText }}>FECHAR</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Session Modal */}
      <BottomModal visible={createModal} title="Novo Treino" onClose={() => setCreateModal(false)}>
        <FormInput label="Título do Treino" placeholder="Ex: Treino de Jiu-Jitsu" value={sessionTitle} onChangeText={setSessionTitle} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Data (AAAA-MM-DD)" placeholder="2026-05-15" value={sessionDate} onChangeText={setSessionDate} keyboardType="numbers-and-punctuation" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Horário (HH:MM)" placeholder="08:00" value={sessionTime} onChangeText={setSessionTime} keyboardType="numbers-and-punctuation" />
          </View>
        </View>
        <FormInput label="Local" placeholder="Diamond X - Unidade Principal" value={sessionLocation} onChangeText={setSessionLocation} />

        <AppText style={{ fontSize: 11, color: theme.colors.dxMuted }}>Um QR Code exclusivo será gerado automaticamente para este treino.</AppText>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateSession}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>CRIAR TREINO</AppText>
        </TouchableOpacity>
      </BottomModal>

      {/* Attendance List Modal */}
      <BottomModal visible={attendanceModal} title={`Presenças — ${attendanceSession?.title || ''}`} onClose={() => setAttendanceModal(false)}>
        {attendanceList.length === 0 ? (
          <AppText style={styles.emptyText}>Nenhuma reserva para este treino.</AppText>
        ) : (
          <>
            <AppText style={{ fontSize: 12, color: theme.colors.dxMuted }}>
              Toque para marcar/desmarcar presença manualmente.
            </AppText>
            {attendanceList.map(reservation => {
              const isPresent = attendanceRecords.includes(reservation.student_id);
              return (
                <TouchableOpacity
                  key={reservation.id}
                  style={[styles.attendanceRow, isPresent && { borderColor: theme.colors.dxTeal, backgroundColor: `${theme.colors.dxTeal}11` }]}
                  onPress={() => toggleAttendance(reservation.student_id)}
                >
                  <View>
                    <AppText weight="bold">{reservation.student?.full_name}</AppText>
                    <AppText style={styles.locationText}>{reservation.student?.email}</AppText>
                  </View>
                  {isPresent
                    ? <CheckCircle size={24} color={theme.colors.dxTeal} />
                    : <Circle size={24} color={theme.colors.dxMuted} />
                  }
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </BottomModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calendarWrapper: { marginBottom: 24 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: theme.colors.dxMuted, textTransform: 'uppercase', marginBottom: 12 },
  card: { padding: 24, alignItems: 'center' },
  sessionCard: { marginBottom: 12, borderLeftWidth: 4, paddingLeft: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  sessionTitle: { fontSize: 17, color: theme.colors.dxText },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { fontSize: 12, color: theme.colors.dxMuted },
  reservationText: { fontSize: 12, color: theme.colors.dxMuted, marginTop: 6 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  btnSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 10, backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1, borderColor: theme.colors.dxBorder, borderRadius: theme.radius.md,
  },
  btnDelete: { padding: 10, backgroundColor: 'rgba(248, 113, 113, 0.1)', borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 12, color: theme.colors.dxText },
  btnPrimary: { backgroundColor: theme.colors.dxTeal, padding: 14, borderRadius: theme.radius.md, alignItems: 'center' },
  emptyText: { color: theme.colors.dxMuted, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: theme.colors.dxSurface, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.dxBorder },
  attendanceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.dxBorder,
    backgroundColor: theme.colors.dxSurface2,
  },
});
