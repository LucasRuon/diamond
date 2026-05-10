import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { FilterPills } from '../../components/ui/FilterPills';
import { BottomModal } from '../../components/ui/BottomModal';
import { FormSelect } from '../../components/ui/FormSelect';
import { FormInput } from '../../components/ui/FormInput';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { Plus, RefreshCw } from 'lucide-react-native';

const STATUS_FILTERS = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendentes', value: 'pending_payment' },
  { label: 'Pagas', value: 'active' },
  { label: 'Vencidas', value: 'expired' },
  { label: 'Canceladas', value: 'cancelled' },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'PAGO',
  pending_payment: 'PENDENTE',
  expired: 'VENCIDO',
  cancelled: 'CANCELADA',
};

type StatusKey = 'active' | 'pending_payment' | 'overdue' | 'cancelled';

const STATUS_BADGE: Record<string, StatusKey> = {
  active: 'active',
  pending_payment: 'pending',
  expired: 'overdue',
  cancelled: 'cancelled',
};

export function AdminChargesScreen() {
  const [charges, setCharges] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCharge, setSelectedCharge] = useState<any>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [newChargeModal, setNewChargeModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  // New charge form state
  const [ncStudent, setNcStudent] = useState('');
  const [ncDescription, setNcDescription] = useState('');
  const [ncPrice, setNcPrice] = useState('');
  const [ncMethod, setNcMethod] = useState('pix');

  const loadCharges = async (status = statusFilter) => {
    setLoading(true);
    let query = supabase
      .from('student_plans')
      .select('id, status, created_at, student:users!student_id(full_name), plan:plans(name, price)')
      .order('created_at', { ascending: false });

    if (status !== 'all') query = query.eq('status', status);

    const { data } = await query;
    setCharges(data || []);
    setLoading(false);
  };

  const applySearch = (text: string) => {
    setSearch(text);
    const term = text.toLowerCase();
    setFiltered(charges.filter(c =>
      (c.student?.full_name || '').toLowerCase().includes(term)
    ));
  };

  useEffect(() => { loadCharges(); }, []);
  useEffect(() => { setFiltered(charges); setSearch(''); }, [charges]);

  const handleFilterChange = (val: string) => {
    setStatusFilter(val);
    loadCharges(val);
  };

  const openActionModal = (charge: any) => {
    setSelectedCharge(charge);
    setActionModalOpen(true);
  };

  const confirmPayment = async () => {
    const { error } = await supabase.from('student_plans').update({ status: 'active' }).eq('id', selectedCharge.id);
    if (error) { Alert.alert('Erro', error.message); return; }
    setActionModalOpen(false);
    Alert.alert('Sucesso', 'Pagamento confirmado!');
    loadCharges();
  };

  const cancelCharge = async () => {
    const { error } = await supabase.from('student_plans').update({ status: 'cancelled' }).eq('id', selectedCharge.id);
    if (error) { Alert.alert('Erro', error.message); return; }
    setActionModalOpen(false);
    Alert.alert('Sucesso', 'Cobrança cancelada.');
    loadCharges();
  };

  const openNewCharge = async () => {
    const { data } = await supabase.from('users').select('id, full_name').eq('role', 'student').order('full_name');
    setStudents(data || []);
    setNcStudent(data?.[0]?.id || '');
    setNcMethod('pix');
    setNcDescription('');
    setNcPrice('');
    setNewChargeModal(true);
  };

  const submitNewCharge = async () => {
    if (!ncStudent || !ncPrice) { Alert.alert('Erro', 'Preencha aluno e valor.'); return; }
    const { error } = await supabase.from('student_plans').insert([{
      student_id: ncStudent,
      status: 'pending_payment',
    }]);
    if (error) { Alert.alert('Erro', error.message); return; }
    setNewChargeModal(false);
    Alert.alert('Sucesso', 'Cobrança manual registrada!');
    loadCharges();
  };

  const displayList = search ? filtered : charges;

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="FINANCEIRO"
          action={
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => loadCharges()}>
                <RefreshCw size={18} color={theme.colors.dxText} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.dxTeal }]} onPress={openNewCharge}>
                <Plus size={18} color={theme.colors.dxBg} />
              </TouchableOpacity>
            </View>
          }
        />

        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome do aluno..."
          placeholderTextColor={theme.colors.dxMuted}
          value={search}
          onChangeText={applySearch}
        />

        <FilterPills
          options={STATUS_FILTERS}
          selected={statusFilter}
          onSelect={handleFilterChange}
        />

        <View style={{ marginTop: 20, gap: 12 }}>
          {loading ? (
            <AppText style={styles.empty}>Carregando...</AppText>
          ) : displayList.length === 0 ? (
            <AppText style={styles.empty}>Nenhuma cobrança encontrada.</AppText>
          ) : displayList.map(charge => (
            <TouchableOpacity key={charge.id} onPress={() => openActionModal(charge)}>
              <Card style={styles.chargeCard}>
                <View style={styles.rowBetween}>
                  <View>
                    <AppText weight="bold" style={{ fontSize: 15 }}>{charge.student?.full_name || 'Aluno Removido'}</AppText>
                    <AppText style={styles.sub}>{charge.plan?.name || 'Cobrança Avulsa'} • {new Date(charge.created_at).toLocaleDateString('pt-BR')}</AppText>
                  </View>
                  <Badge status={STATUS_BADGE[charge.status] || 'pending'} label={STATUS_LABELS[charge.status] || charge.status.toUpperCase()} />
                </View>
                <View style={[styles.rowBetween, { marginTop: 12 }]}>
                  <AppText weight="bold" style={{ color: theme.colors.dxTeal }}>
                    R$ {parseFloat(charge.plan?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </AppText>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Action Modal */}
      <BottomModal visible={actionModalOpen} title="Gerenciar Cobrança" onClose={() => setActionModalOpen(false)}>
        {selectedCharge && (
          <>
            <Card style={{ backgroundColor: theme.colors.dxSurface2 }}>
              <AppText style={styles.sub}>DETALHES DA COBRANÇA</AppText>
              <AppText weight="bold" style={{ marginTop: 4 }}>{selectedCharge.student?.full_name || 'Aluno'}</AppText>
              <AppText>{selectedCharge.plan?.name || 'Cobrança Avulsa'} - R$ {parseFloat(selectedCharge.plan?.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</AppText>
            </Card>

            {selectedCharge.status === 'pending_payment' && (
              <TouchableOpacity style={styles.btnSuccess} onPress={confirmPayment}>
                <AppText weight="bold" style={{ color: '#000' }}>CONFIRMAR PAGAMENTO MANUAL</AppText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.btnCancel} onPress={cancelCharge}>
              <AppText weight="bold" style={{ color: theme.colors.dxDanger }}>CANCELAR COBRANÇA</AppText>
            </TouchableOpacity>
          </>
        )}
      </BottomModal>

      {/* New Charge Modal */}
      <BottomModal visible={newChargeModal} title="Nova Cobrança Manual" onClose={() => setNewChargeModal(false)}>
        <FormSelect
          label="Aluno / Cliente"
          options={students.map(s => ({ label: s.full_name, value: s.id }))}
          value={ncStudent}
          onChange={setNcStudent}
          placeholder="Selecione um aluno..."
        />
        <FormInput
          label="Descrição da Cobrança"
          placeholder="Ex: Avaliação Física / Aula Avulsa"
          value={ncDescription}
          onChangeText={setNcDescription}
        />
        <FormInput
          label="Valor (R$)"
          placeholder="0,00"
          value={ncPrice}
          onChangeText={setNcPrice}
          keyboardType="decimal-pad"
        />
        <FormSelect
          label="Forma Inicial"
          options={[{ label: 'PIX', value: 'pix' }, { label: 'Boleto', value: 'boleto' }, { label: 'Cartão', value: 'credit_card' }]}
          value={ncMethod}
          onChange={setNcMethod}
        />
        <AppText style={styles.sub}>* Esta ação gera uma intenção de cobrança vinculada ao aluno.</AppText>
        <TouchableOpacity style={styles.btnPrimary} onPress={submitNewCharge}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>GERAR COBRANÇA</AppText>
        </TouchableOpacity>
      </BottomModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1, borderColor: theme.colors.dxBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  searchInput: {
    backgroundColor: theme.colors.dxSurface2,
    borderWidth: 1, borderColor: theme.colors.dxBorder,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: theme.colors.dxText,
    marginBottom: 12,
  },
  chargeCard: { gap: 0 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sub: { fontSize: 12, color: theme.colors.dxMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: theme.colors.dxMuted, marginTop: 40 },
  btnSuccess: {
    backgroundColor: theme.colors.dxSuccess || '#22c55e',
    padding: 14, borderRadius: theme.radius.md, alignItems: 'center',
  },
  btnCancel: {
    borderWidth: 1, borderColor: theme.colors.dxBorder,
    padding: 14, borderRadius: theme.radius.md, alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: theme.colors.dxTeal,
    padding: 14, borderRadius: theme.radius.md, alignItems: 'center',
  },
});

