import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { QrScanner } from '../../src/components/qr/QrScanner';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { theme } from '../../src/theme';

export default function ScannerPage() {
  const { profile } = useAuth();

  const handleScan = async (token: string) => {
    if (!profile?.id) { router.back(); return; }

    // 1. Verificar plano ativo
    const { data: plan } = await supabase
      .from('student_plans')
      .select('id')
      .eq('student_id', profile.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!plan) {
      Alert.alert('Plano Necessário', 'Você precisa de um plano ativo para fazer check-in.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // 2. Encontrar sessão pelo token e validar que é hoje
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const { data: session } = await supabase
      .from('training_sessions')
      .select('id, scheduled_at')
      .eq('qr_code_token', token)
      .gte('scheduled_at', `${todayStr}T00:00:00`)
      .lte('scheduled_at', `${todayStr}T23:59:59`)
      .maybeSingle();

    if (!session) {
      Alert.alert('QR Inválido', 'Este QR Code não corresponde a um treino de hoje ou já expirou.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // 3. Verificar se já fez check-in
    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('student_id', profile.id)
      .eq('session_id', session.id)
      .maybeSingle();

    if (existing) {
      Alert.alert('Já Registrado', 'Sua presença já foi registrada neste treino!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // 4. Registrar presença
    const { error } = await supabase.from('attendance').insert([{
      student_id: profile.id,
      session_id: session.id,
      checked_in_at: new Date().toISOString(),
      manual: false,
    }]);

    if (error) {
      Alert.alert('Erro', error.message, [{ text: 'OK', onPress: () => router.back() }]);
    } else {
      Alert.alert('✅ Check-in Realizado!', 'Sua presença foi registrada com sucesso. Bom treino!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <QrScanner onScan={handleScan} onCancel={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dxBg,
  },
});
