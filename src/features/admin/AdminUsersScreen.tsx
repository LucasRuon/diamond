import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { FilterPills } from '../../components/ui/FilterPills';
import { BottomModal } from '../../components/ui/BottomModal';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { User, ChevronRight } from 'lucide-react-native';

const ROLE_FILTERS = [
  { label: 'Todos', value: 'all' },
  { label: 'Admins', value: 'admin' },
  { label: 'Responsáveis', value: 'responsible' },
  { label: 'Alunos', value: 'student' },
];

const ROLE_OPTIONS = [
  { label: 'Aluno', value: 'student' },
  { label: 'Responsável', value: 'responsible' },
  { label: 'Empresário', value: 'businessman' },
  { label: 'Administrador', value: 'admin' },
];

const ROLE_BADGE_STYLES: Record<string, { bg: string; text: string }> = {
  admin: { bg: `${theme.colors.dxTeal}33`, text: theme.colors.dxTeal },
  responsible: { bg: `${theme.colors.dxWarn}33`, text: theme.colors.dxWarn },
  student: { bg: `${theme.colors.dxTeal}22`, text: theme.colors.dxTeal },
};

export function AdminUsersScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Edit form
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  const loadUsers = async (filter = roleFilter) => {
    setLoading(true);
    let q = supabase.from('users').select('*').order('full_name');
    if (filter !== 'all') q = q.eq('role', filter);
    const { data } = await q;
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleFilterChange = (val: string) => {
    setRoleFilter(val);
    loadUsers(val);
  };

  const openEdit = (user: any) => {
    setSelectedUser(user);
    setFullName(user.full_name || '');
    setRole(user.role || 'student');
    setCpf(user.cpf || '');
    setPhone(user.phone || '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Erro', 'Informe o nome completo.'); return; }
    const { error } = await supabase.functions.invoke('admin-update-user', {
      body: { userId: selectedUser.id, full_name: fullName.trim(), role, cpf: cpf || null, phone: phone || null }
    });
    if (error) { Alert.alert('Erro', error.message); return; }
    setModalOpen(false);
    Alert.alert('Sucesso', 'Usuário atualizado!');
    loadUsers();
  };

  const sendPasswordReset = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
    if (error) { Alert.alert('Erro', error.message); return; }
    Alert.alert('Sucesso', 'E-mail de redefinição enviado!');
  };

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="USUÁRIOS" />

        <FilterPills options={ROLE_FILTERS} selected={roleFilter} onSelect={handleFilterChange} />

        <View style={{ marginTop: 16, gap: 12 }}>
          {loading ? (
            <AppText style={styles.empty}>Carregando usuários...</AppText>
          ) : users.length === 0 ? (
            <AppText style={styles.empty}>Nenhum usuário encontrado.</AppText>
          ) : users.map(user => {
            const badge = ROLE_BADGE_STYLES[user.role] || { bg: theme.colors.dxSurface2, text: theme.colors.dxMuted };
            return (
              <TouchableOpacity key={user.id} onPress={() => openEdit(user)}>
                <Card style={styles.userCard}>
                  <View style={styles.avatar}>
                    <User size={20} color={theme.colors.dxTeal} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText weight="bold" style={{ fontSize: 15 }}>{user.full_name}</AppText>
                    <AppText style={styles.email}>{user.email}</AppText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                      <AppText weight="bold" style={[styles.roleText, { color: badge.text }]}>{user.role.toUpperCase()}</AppText>
                    </View>
                    <ChevronRight size={16} color={theme.colors.dxMuted} />
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <BottomModal visible={modalOpen} title="Editar Usuário" onClose={() => setModalOpen(false)}>
        <FormInput label="Nome Completo" value={fullName} onChangeText={setFullName} />
        <FormInput label="E-mail (apenas leitura)" value={selectedUser?.email || ''} editable={false} style={{ opacity: 0.6 }} />
        <FormSelect label="Papel no Sistema" options={ROLE_OPTIONS} value={role} onChange={setRole} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="CPF" placeholder="000.000.000-00" value={cpf} onChangeText={setCpf} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Telefone" placeholder="(00) 00000-0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          </View>
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>SALVAR ALTERAÇÕES</AppText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnGhost} onPress={sendPasswordReset}>
          <AppText style={styles.ghostText}>ENVIAR REDEFINIÇÃO DE SENHA</AppText>
        </TouchableOpacity>
      </BottomModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1, borderColor: theme.colors.dxBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  email: { fontSize: 12, color: theme.colors.dxMuted },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  roleText: { fontSize: 10 },
  empty: { textAlign: 'center', color: theme.colors.dxMuted, marginTop: 40 },
  btnPrimary: {
    backgroundColor: theme.colors.dxTeal,
    padding: 14, borderRadius: theme.radius.md, alignItems: 'center',
  },
  btnGhost: { alignItems: 'center', padding: 12 },
  ghostText: { fontSize: 12, color: theme.colors.dxMuted },
});
