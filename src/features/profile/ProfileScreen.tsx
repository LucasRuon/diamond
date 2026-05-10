import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Image, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { BottomModal } from '../../components/ui/BottomModal';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { User, Camera, ExternalLink, LogOut, Pencil, ChevronRight } from 'lucide-react-native';

const ROLE_LABELS: Record<string, string> = {
  student: 'Aluno',
  responsible: 'Responsável',
  businessman: 'Empresário',
  admin: 'Administrador',
};

const ROLE_OPTIONS = [
  { label: 'Aluno', value: 'student' },
  { label: 'Responsável', value: 'responsible' },
  { label: 'Empresário', value: 'businessman' },
];

export function ProfileScreen() {
  const { profile, setProfile } = useAuth();

  // Edit Profile modal
  const [editModal, setEditModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');

  // Anamnese modal
  const [anamneseModal, setAnamneseModal] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [currentClub, setCurrentClub] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [athleteRecordUrl, setAthleteRecordUrl] = useState('');

  const openEditProfile = () => {
    setFullName(profile?.full_name || '');
    setCpf(profile?.cpf || '');
    setPhone(profile?.phone || '');
    setEditModal(true);
  };

  const saveProfile = async () => {
    if (!fullName.trim()) { Alert.alert('Erro', 'Informe o nome completo.'); return; }
    const { data, error } = await supabase
      .from('users')
      .update({ full_name: fullName.trim(), cpf: cpf || null, phone: phone || null })
      .eq('id', profile?.id)
      .select()
      .single();
    if (error) { Alert.alert('Erro', error.message); return; }
    setProfile?.(data);
    setEditModal(false);
    Alert.alert('Sucesso', 'Perfil atualizado!');
  };

  const openAnamnese = () => {
    setBirthDate(profile?.birth_date || '');
    setCurrentClub(profile?.current_club || '');
    setWeightKg(String(profile?.weight_kg || ''));
    setHeightCm(String(profile?.height_cm || ''));
    setAthleteRecordUrl(profile?.athlete_record_url || '');
    setAnamneseModal(true);
  };

  const saveAnamnese = async () => {
    const { data, error } = await supabase
      .from('users')
      .update({
        birth_date: birthDate || null,
        current_club: currentClub || null,
        weight_kg: weightKg ? parseFloat(weightKg) : null,
        height_cm: heightCm ? parseInt(heightCm) : null,
        athlete_record_url: athleteRecordUrl || null,
      })
      .eq('id', profile?.id)
      .select()
      .single();
    if (error) { Alert.alert('Erro', error.message); return; }
    setProfile?.(data);
    setAnamneseModal(false);
    Alert.alert('Sucesso', 'Anamnese atualizada!');
  };

  const handleAvatarUpload = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Permissão negada', 'Acesso à galeria necessário.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() || 'jpg';
    const filename = `${profile?.id}-${Date.now()}.${ext}`;
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const { error: uploadErr } = await supabase.storage.from('avatars').upload(filename, blob, { upsert: true });
    if (uploadErr) { Alert.alert('Erro no upload', uploadErr.message); return; }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filename);
    const { data, error } = await supabase.from('users').update({ avatar_url: urlData.publicUrl }).eq('id', profile?.id).select().single();
    if (error) { Alert.alert('Erro', error.message); return; }
    setProfile?.(data);
    Alert.alert('Sucesso', 'Avatar atualizado!');
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair do aplicativo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); } },
    ]);
  };

  const roleColor = profile?.role === 'admin' ? theme.colors.dxDanger : profile?.role === 'responsible' ? theme.colors.dxWarn : theme.colors.dxTeal;

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="MEU PERFIL" />

        {/* Avatar + Role */}
        <Card highlight style={styles.avatarCard}>
          <TouchableOpacity onPress={handleAvatarUpload} style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={36} color={theme.colors.dxTeal} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Camera size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <AppText weight="bold" style={styles.profileName}>{profile?.full_name || 'Usuário'}</AppText>
            <AppText style={styles.profileEmail}>{profile?.email}</AppText>
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}22`, borderColor: `${roleColor}44` }]}>
              <AppText weight="bold" style={[styles.roleText, { color: roleColor }]}>
                {ROLE_LABELS[profile?.role || 'student'] || profile?.role?.toUpperCase()}
              </AppText>
            </View>
          </View>
        </Card>

        {/* Personal Data */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <AppText weight="bold" style={[styles.sectionTitle, { color: theme.colors.dxTeal }]}>DADOS PESSOAIS</AppText>
            <TouchableOpacity onPress={openEditProfile} style={styles.editBtn}>
              <Pencil size={14} color={theme.colors.dxTeal} />
              <AppText weight="bold" style={styles.editBtnText}>EDITAR</AppText>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>CPF</AppText>
            <AppText style={styles.infoValue}>{profile?.cpf || 'Não informado'}</AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText style={styles.infoLabel}>Telefone</AppText>
            <AppText style={styles.infoValue}>{profile?.phone || 'Não informado'}</AppText>
          </View>
        </Card>

        {/* Anamnese (Athlete Profile) — only students */}
        {(profile?.role === 'student' || profile?.role === 'responsible') && (
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <AppText weight="bold" style={[styles.sectionTitle, { color: theme.colors.dxTeal }]}>PERFIL ATLÉTICO</AppText>
              <TouchableOpacity onPress={openAnamnese} style={styles.editBtn}>
                <Pencil size={14} color={theme.colors.dxTeal} />
                <AppText weight="bold" style={styles.editBtnText}>EDITAR</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Data de Nascimento</AppText>
              <AppText style={styles.infoValue}>{profile?.birth_date || 'Não informado'}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Clube Atual</AppText>
              <AppText style={styles.infoValue}>{profile?.current_club || 'Não informado'}</AppText>
            </View>
            <View style={styles.infoRow}>
              <AppText style={styles.infoLabel}>Peso / Altura</AppText>
              <AppText style={styles.infoValue}>
                {profile?.weight_kg ? `${profile.weight_kg}kg` : '--'} / {profile?.height_cm ? `${profile.height_cm}cm` : '--'}
              </AppText>
            </View>
          </Card>
        )}

        {/* External link */}
        <TouchableOpacity style={styles.externalLink} onPress={() => Linking.openURL('https://diamondxperformance.com.br/')}>
          <ExternalLink size={16} color={theme.colors.dxTeal} />
          <AppText weight="bold" style={{ color: theme.colors.dxTeal }}>SITE DIAMOND X</AppText>
          <ChevronRight size={16} color={theme.colors.dxMuted} />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={18} color={theme.colors.dxDanger} />
          <AppText weight="bold" style={{ color: theme.colors.dxDanger }}>SAIR DO APLICATIVO</AppText>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <BottomModal visible={editModal} title="Editar Perfil" onClose={() => setEditModal(false)}>
        <FormInput label="Nome Completo" value={fullName} onChangeText={setFullName} />
        <FormInput label="CPF" placeholder="000.000.000-00" value={cpf} onChangeText={setCpf} keyboardType="number-pad" />
        <FormInput label="Telefone" placeholder="(00) 00000-0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TouchableOpacity style={styles.btnPrimary} onPress={saveProfile}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>SALVAR ALTERAÇÕES</AppText>
        </TouchableOpacity>
      </BottomModal>

      {/* Anamnese Modal */}
      <BottomModal visible={anamneseModal} title="Perfil Atlético" onClose={() => setAnamneseModal(false)}>
        <FormInput label="Data de Nascimento" placeholder="DD/MM/AAAA" value={birthDate} onChangeText={setBirthDate} keyboardType="numbers-and-punctuation" />
        <FormInput label="Clube / Academia Atual" placeholder="Ex: Diamond X" value={currentClub} onChangeText={setCurrentClub} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Peso (kg)" placeholder="Ex: 75.5" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Altura (cm)" placeholder="Ex: 175" value={heightCm} onChangeText={setHeightCm} keyboardType="number-pad" />
          </View>
        </View>
        <FormInput label="URL da Ficha Atlética" placeholder="https://..." value={athleteRecordUrl} onChangeText={setAthleteRecordUrl} keyboardType="url" autoCapitalize="none" />
        <TouchableOpacity style={styles.btnPrimary} onPress={saveAnamnese}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>SALVAR ANAMNESE</AppText>
        </TouchableOpacity>
      </BottomModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 16 },
  avatarCard: { alignItems: 'center', gap: 16, paddingVertical: 28 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: theme.colors.dxTeal },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: `${theme.colors.dxTeal}22`,
    borderWidth: 2, borderColor: `${theme.colors.dxTeal}55`,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.dxTeal,
    alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: 20, textAlign: 'center' },
  profileEmail: { fontSize: 13, color: theme.colors.dxMuted, textAlign: 'center' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  roleText: { fontSize: 11 },
  infoCard: { gap: 12 },
  infoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 12, letterSpacing: 1 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 11, color: theme.colors.dxTeal },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, color: theme.colors.dxMuted },
  infoValue: { fontSize: 13, color: theme.colors.dxText, fontWeight: '600' },
  externalLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1, borderColor: theme.colors.dxBorder,
  },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: theme.radius.md,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)',
    marginTop: 8,
  },
  btnPrimary: {
    backgroundColor: theme.colors.dxTeal,
    padding: 14, borderRadius: theme.radius.md, alignItems: 'center',
  },
});
