import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AppScreen } from '../../components/layout/AppScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { BottomModal } from '../../components/ui/BottomModal';
import { FormInput } from '../../components/ui/FormInput';
import { FormSelect } from '../../components/ui/FormSelect';
import { supabase } from '../../lib/supabase';
import { theme } from '../../theme';
import { Plus, Pencil, Trash2 } from 'lucide-react-native';

const CATEGORIES = [
  { label: 'Treinamento / Aulas', value: 'training' },
  { label: 'Fisioterapia / Recovery', value: 'physio' },
];

const TIERS = [
  { label: 'Pré Diamond', value: 'pre_diamond' },
  { label: 'Diamond X', value: 'diamond_x' },
];

export function AdminPlansScreen() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Form state
  const [name, setName] = useState('');
  const [category, setCategory] = useState('training');
  const [tier, setTier] = useState('pre_diamond');
  const [price, setPrice] = useState('');
  const [durationDays, setDurationDays] = useState('30');
  const [description, setDescription] = useState('');

  const loadPlans = async () => {
    setLoading(true);
    const { data } = await supabase.from('plans').select('*').order('category').order('price');
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { loadPlans(); }, []);

  const openCreate = () => {
    setEditingPlan(null);
    setName(''); setCategory('training'); setTier('pre_diamond');
    setPrice(''); setDurationDays('30'); setDescription('');
    setModalOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setName(plan.name || '');
    setCategory(plan.category || 'training');
    setTier(plan.tier || 'pre_diamond');
    setPrice(String(plan.price || ''));
    setDurationDays(String(plan.duration_days || '30'));
    setDescription(plan.description || '');
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Excluir Plano', 'Deseja excluir este plano definitivamente?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
          const { error } = await supabase.from('plans').delete().eq('id', id);
          if (error) { Alert.alert('Erro', error.message); return; }
          Alert.alert('Sucesso', 'Plano excluído.');
          loadPlans();
      }}
    ]);
  };

  const handleSave = async () => {
    if (!name || !price) { Alert.alert('Erro', 'Preencha nome e preço.'); return; }
    const planData = {
      name, category, tier,
      price: parseFloat(price),
      duration_days: parseInt(durationDays),
      description,
    };

    const { error } = editingPlan
      ? await supabase.from('plans').update(planData).eq('id', editingPlan.id)
      : await supabase.from('plans').insert([planData]);

    if (error) { Alert.alert('Erro', error.message); return; }
    setModalOpen(false);
    Alert.alert('Sucesso', editingPlan ? 'Plano atualizado!' : 'Plano criado!');
    loadPlans();
  };

  return (
    <AppScreen safeAreaBottom={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="GESTÃO DE PLANOS"
          action={
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: theme.colors.dxTeal }]} onPress={openCreate}>
              <Plus size={18} color={theme.colors.dxBg} />
            </TouchableOpacity>
          }
        />

        {loading ? (
          <AppText style={styles.empty}>Carregando planos...</AppText>
        ) : plans.length === 0 ? (
          <AppText style={styles.empty}>Nenhum plano cadastrado.</AppText>
        ) : plans.map(plan => {
          const isTraining = plan.category === 'training';
          const isDiamond = plan.tier === 'diamond_x';
          const borderColor = isTraining ? theme.colors.dxTeal : theme.colors.dxWarn;
          return (
            <Card key={plan.id} style={[styles.planCard, { borderLeftColor: borderColor }]}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AppText style={[styles.categoryLabel, { color: borderColor }]}>
                      {isTraining ? 'TREINAMENTO' : 'FISIOTERAPIA'}
                    </AppText>
                    <View style={[styles.tierBadge, { borderColor: isDiamond ? theme.colors.dxTeal : theme.colors.dxBorder, backgroundColor: isDiamond ? `${theme.colors.dxTeal}22` : theme.colors.dxSurface2 }]}>
                      <AppText style={[styles.tierText, { color: isDiamond ? theme.colors.dxTeal : theme.colors.dxMuted }]}>
                        {isDiamond ? 'DIAMOND X' : 'PRÉ DIAMOND'}
                      </AppText>
                    </View>
                  </View>
                  <AppText weight="bold" style={{ fontSize: 17 }}>{plan.name}</AppText>
                </View>
                <AppText weight="bold" style={{ color: theme.colors.dxTeal, fontSize: 16 }}>R$ {plan.price}</AppText>
              </View>
              <AppText style={[styles.desc, { marginTop: 8 }]}>{plan.description || 'Sem descrição'}</AppText>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(plan)}>
                  <Pencil size={14} color={theme.colors.dxTeal} />
                  <AppText weight="bold" style={[styles.btnText, { color: theme.colors.dxTeal }]}>EDITAR</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(plan.id)}>
                  <Trash2 size={16} color={theme.colors.dxDanger} />
                </TouchableOpacity>
              </View>
            </Card>
          );
        })}
      </ScrollView>

      <BottomModal visible={modalOpen} title={editingPlan ? 'Editar Plano' : 'Novo Plano'} onClose={() => setModalOpen(false)}>
        <FormInput label="Nome do Plano" placeholder="Ex: Mensal Basic" value={name} onChangeText={setName} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormSelect label="Categoria" options={CATEGORIES} value={category} onChange={setCategory} />
          </View>
          <View style={{ flex: 1 }}>
            <FormSelect label="Tier" options={TIERS} value={tier} onChange={setTier} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="Preço (R$)" placeholder="0.00" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Duração (dias)" placeholder="30" value={durationDays} onChangeText={setDurationDays} keyboardType="number-pad" />
          </View>
        </View>
        <FormInput label="Descrição" placeholder="Descreva o plano..." value={description} onChangeText={setDescription} multiline numberOfLines={3} />
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
          <AppText weight="bold" style={{ color: theme.colors.dxBg }}>{editingPlan ? 'ATUALIZAR' : 'CRIAR'} PLANO</AppText>
        </TouchableOpacity>
      </BottomModal>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 100, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  iconBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planCard: { borderLeftWidth: 4, paddingLeft: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  categoryLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  tierBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  tierText: { fontSize: 9, fontWeight: '700' },
  desc: { fontSize: 13, color: theme.colors.dxMuted },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  editBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 10, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.dxTeal,
  },
  deleteBtn: {
    padding: 10, borderRadius: theme.radius.md,
    backgroundColor: 'rgba(248,113,113,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 12 },
  empty: { textAlign: 'center', color: theme.colors.dxMuted, marginTop: 40 },
  btnPrimary: {
    backgroundColor: theme.colors.dxTeal,
    padding: 14, borderRadius: theme.radius.md, alignItems: 'center',
  },
});
