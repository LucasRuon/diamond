import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { FilterPills } from '../../components/ui/FilterPills';
import { BottomModal } from '../../components/ui/BottomModal';
import { FormSelect } from '../../components/ui/FormSelect';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';

const CATEGORIES = [
  { label: 'Treinamento', value: 'training' },
  { label: 'Fisioterapia', value: 'physio' },
];

const PAYMENT_METHODS = [
  { label: 'PIX', value: 'pix' },
  { label: 'Cartão de Crédito', value: 'credit_card' },
  { label: 'Boleto Bancário', value: 'boleto' },
];

export function ResponsiblePlansScreen() {
  const { profile } = useAuth();
  const [category, setCategory] = useState('training');
  const [preDiamond, setPreDiamond] = useState<any[]>([]);
  const [diamondX, setDiamondX] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [linkedStudents, setLinkedStudents] = useState<any[]>([]);
  const [beneficiary, setBeneficiary] = useState('self');
  const [paymentMethod, setPaymentMethod] = useState('pix');

  const loadPlans = async (cat: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('plans').select('*')
      .eq('active', true).eq('category', cat).order('price');
    const plans = data || [];
    setPreDiamond(plans.filter(p => p.tier !== 'diamond_x'));
    setDiamondX(plans.filter(p => p.tier === 'diamond_x'));
    setLoading(false);
  };

  useEffect(() => { loadPlans(category); }, [category]);

  const openPurchase = async (plan: any) => {
    setSelectedPlan(plan);
    setPaymentMethod('pix');
    if (profile?.id) {
      const { data: links } = await supabase
        .from('responsible_students')
        .select('student_id, student:users!student_id(full_name)')
        .eq('responsible_id', profile.id);
      setLinkedStudents(links || []);
    }
    setBeneficiary('self');
    setConfirmModalOpen(true);
  };

  const handlePurchase = async () => {
    if (!profile?.id || !selectedPlan) return;
    const studentId = beneficiary === 'self' ? profile.id : beneficiary;

    if (category === 'training') {
      const { data: existing } = await supabase
        .from('student_plans').select('id')
        .eq('student_id', studentId).eq('status', 'active').maybeSingle();
      if (existing) {
        Alert.alert('Plano Ativo', 'Este aluno já possui um plano de treinamento ativo.'); return;
      }
    }

    const { error } = await supabase.from('student_plans').insert([{
      student_id: studentId,
      plan_id: selectedPlan.id,
      purchased_by: profile.id,
      status: 'pending_payment',
    }]);

    if (error) { Alert.alert('Erro', error.message); return; }
    setConfirmModalOpen(false);
    Alert.alert('Cobrança Gerada', 'A cobrança foi gerada! Você pode acompanhá-la em "Faturas e Pagamentos".');
  };

  const accentColor = category === 'training' ? theme.colors.dxTeal : theme.colors.dxWarn;

  const beneficiaryOptions = [
    { label: 'Para mim mesmo', value: 'self' },
    ...(linkedStudents.map(l => ({ label: `${l.student?.full_name} (Dependente)`, value: l.student_id }))),
  ];

  const renderPlanCard = (plan: any, locked = false) => (
    <Card key={plan.id} style={[styles.planCard, { borderTopColor: locked ? theme.colors.dxBorder : accentColor, opacity: locked ? 0.5 : 1 }]}>
      <View style={styles.planHeader}>
        <View>
          <AppText weight="bold" style={[styles.planName, { color: locked ? theme.colors.dxMuted : accentColor }]}>{plan.name}</AppText>
          <AppText style={styles.planMeta}>
            {category === 'training' ? `${plan.duration_days} dias • ${plan.total_sessions} aulas` : 'Sessão Individual / Pacote'}
          </AppText>
        </View>
        <AppText weight="bold" style={[styles.planPrice, { color: locked ? theme.colors.dxMuted : theme.colors.dxText }]}>
          R$ {parseFloat(plan.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </AppText>
      </View>
      <AppText style={styles.planDesc}>{plan.description || 'Acesso completo ao serviço selecionado.'}</AppText>
      {locked ? (
        <View style={styles.btnLocked}>
          <AppText weight="bold" style={{ color: theme.colors.dxMuted }}>EM BREVE</AppText>
        </View>
      ) : (
        <TouchableOpacity style={[styles.btnContratar, { backgroundColor: accentColor }]} onPress={() => openPurchase(plan)}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>CONTRATAR AGORA</AppText>
        </TouchableOpacity>
      )}
    </Card>
  );

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader title="PLANOS E SERVIÇOS" />
        <FilterPills options={CATEGORIES} selected={category} onSelect={setCategory} accentColor={accentColor} />
        <View style={{ marginTop: 20, gap: 12 }}>
          {loading ? (
            <AppText style={styles.empty}>Carregando...</AppText>
          ) : (
            <>
              {preDiamond.length > 0 && (
                <>
                  <AppText style={styles.sectionLabel}>PRÉ DIAMOND</AppText>
                  {preDiamond.map(p => renderPlanCard(p))}
                </>
              )}
              {diamondX.length > 0 && (
                <>
                  <AppText style={[styles.sectionLabel, { marginTop: 8 }]}>DIAMOND X</AppText>
                  {diamondX.map(p => renderPlanCard(p, true))}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <BottomModal visible={confirmModalOpen} title="Contratação" onClose={() => setConfirmModalOpen(false)}>
        {selectedPlan && (
          <>
            <AppText style={styles.modalDesc}>
              Selecione o beneficiário e a forma de pagamento para <AppText weight="bold">{selectedPlan.name}</AppText>.
            </AppText>
            <FormSelect label="Para quem?" options={beneficiaryOptions} value={beneficiary} onChange={setBeneficiary} />
            <FormSelect label="Forma de Pagamento" options={PAYMENT_METHODS} value={paymentMethod} onChange={setPaymentMethod} />
            <TouchableOpacity style={[styles.btnContratar, { backgroundColor: accentColor, borderWidth: 0 }]} onPress={handlePurchase}>
              <AppText weight="bold" style={{ color: theme.colors.dxBg }}>GERAR COBRANÇA</AppText>
            </TouchableOpacity>
          </>
        )}
      </BottomModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.dxMuted, textTransform: 'uppercase' },
  planCard: { borderTopWidth: 4 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  planName: { fontSize: 20, fontFamily: 'Abnes' },
  planMeta: { fontSize: 13, color: theme.colors.dxMuted },
  planPrice: { fontSize: 18, fontWeight: '800' },
  planDesc: { fontSize: 14, color: theme.colors.dxMuted, marginBottom: 16 },
  btnContratar: { borderWidth: 1, borderRadius: theme.radius.md, padding: 12, alignItems: 'center' },
  btnLocked: { borderWidth: 1, borderColor: theme.colors.dxBorder, borderRadius: theme.radius.md, padding: 12, alignItems: 'center' },
  empty: { textAlign: 'center', color: theme.colors.dxMuted, marginTop: 40 },
  modalDesc: { fontSize: 14, color: theme.colors.dxMuted },
});
