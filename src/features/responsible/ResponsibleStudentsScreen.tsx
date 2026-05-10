import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { BottomModal } from '../../components/ui/BottomModal';
import { FormInput } from '../../components/ui/FormInput';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';
import { Plus, User, UserMinus } from 'lucide-react-native';

export function ResponsibleStudentsScreen() {
  const { profile } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [linking, setLinking] = useState(false);

  const loadStudents = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('responsible_students')
      .select('student_id, student:users!student_id(full_name, email, role)')
      .eq('responsible_id', profile.id);
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => { loadStudents(); }, [profile]);

  const handleLink = async () => {
    if (!email.trim() || !profile?.id) return;
    setLinking(true);

    const { data: student, error: fErr } = await supabase
      .from('users')
      .select('id, role, full_name')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (fErr || !student) {
      Alert.alert('Não encontrado', 'Aluno não encontrado com este e-mail.');
      setLinking(false); return;
    }

    if (student.role !== 'student') {
      Alert.alert('Erro', `O e-mail pertence a um ${student.role}, não a um aluno.`);
      setLinking(false); return;
    }

    const { error: lErr } = await supabase
      .from('responsible_students')
      .insert([{ responsible_id: profile.id, student_id: student.id }]);

    if (lErr) {
      Alert.alert('Erro', lErr.code === '23505' ? 'Este aluno já está vinculado a você.' : lErr.message);
      setLinking(false); return;
    }

    setLinking(false);
    setModalOpen(false);
    setEmail('');
    Alert.alert('Sucesso', `${student.full_name} vinculado!`);
    loadStudents();
  };

  const handleUnlink = (studentId: string, studentName: string) => {
    Alert.alert(
      'Desvincular Aluno',
      `Tem certeza que deseja desvincular ${studentName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('responsible_students')
              .delete()
              .eq('responsible_id', profile!.id)
              .eq('student_id', studentId);

            if (error) {
              Alert.alert('Erro', error.message);
              return;
            }
            Alert.alert('Sucesso', `${studentName} desvinculado.`);
            loadStudents();
          },
        },
      ]
    );
  };

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="MEUS ALUNOS"
          action={
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.dxTeal }]} onPress={() => { setEmail(''); setModalOpen(true); }}>
              <Plus size={18} color={theme.colors.dxBg} />
            </TouchableOpacity>
          }
        />

        {loading ? (
          <AppText style={styles.empty}>Buscando alunos vinculados...</AppText>
        ) : students.length === 0 ? (
          <Card style={styles.emptyCard}>
            <User size={40} color={theme.colors.dxBorder} />
            <AppText style={[styles.empty, { marginTop: 12 }]}>Você ainda não tem alunos vinculados.</AppText>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setModalOpen(true)}>
              <AppText weight="bold" style={{ color: theme.colors.dxBg }}>VINCULAR ALUNO</AppText>
            </TouchableOpacity>
          </Card>
        ) : students.map((link, idx) => (
          <Card key={idx} style={styles.studentCard}>
            <View style={styles.studentHeader}>
              <View style={styles.avatar}>
                <User size={20} color={theme.colors.dxTeal} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" style={{ fontSize: 16 }}>{link.student?.full_name}</AppText>
                <AppText style={styles.email}>{link.student?.email}</AppText>
              </View>
              <TouchableOpacity
                style={styles.unlinkBtn}
                onPress={() => handleUnlink(link.student_id, link.student?.full_name || 'Aluno')}
              >
                <UserMinus size={16} color={theme.colors.dxDanger} />
              </TouchableOpacity>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push('/(student)/attendance')}
              >
                <AppText weight="bold" style={styles.actionBtnText}>FREQUÊNCIA</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.replace('/(responsible)/trainings')}
              >
                <AppText weight="bold" style={styles.actionBtnText}>TREINOS</AppText>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      <BottomModal visible={modalOpen} title="Vincular Aluno" onClose={() => setModalOpen(false)}>
        <AppText style={styles.modalDesc}>
          Insira o e-mail do aluno (filho/dependente) para vinculá-lo à sua conta de responsável.
        </AppText>
        <FormInput
          label="E-mail do Aluno"
          placeholder="exemplo@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.btnPrimary} onPress={handleLink}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>
            {linking ? 'VINCULANDO...' : 'VINCULAR ALUNO'}
          </AppText>
        </TouchableOpacity>
      </BottomModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { alignItems: 'center', padding: 32, gap: 8 },
  empty: { textAlign: 'center', color: theme.colors.dxMuted },
  studentCard: {},
  studentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: `${theme.colors.dxTeal}22`,
    borderWidth: 1, borderColor: `${theme.colors.dxTeal}55`,
    alignItems: 'center', justifyContent: 'center',
  },
  email: { fontSize: 12, color: theme.colors.dxMuted },
  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, padding: 10, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1, borderColor: theme.colors.dxBorder,
    alignItems: 'center',
  },
  actionBtnText: { fontSize: 12, color: theme.colors.dxText },
  btnPrimary: {
    backgroundColor: theme.colors.dxTeal,
    padding: 14, borderRadius: theme.radius.md, alignItems: 'center',
    marginTop: 8,
  },
  modalDesc: { fontSize: 14, color: theme.colors.dxMuted },
  unlinkBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: `${theme.colors.dxDanger}18`,
    alignItems: 'center', justifyContent: 'center',
  },
});
