import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { AppScreen } from '../../src/components/layout/AppScreen';
import { AppText } from '../../src/components/ui/AppText';
import { TextField } from '../../src/components/ui/TextField';
import { Button } from '../../src/components/ui/Button';
import { authService } from '../../src/features/auth/auth-service';
import { useToast } from '../../src/components/ui/ToastProvider';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleUpdate = async () => {
    if (!password || !confirmPassword) {
      showToast('Preencha os campos', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('As senhas não coincidem', 'error');
      return;
    }

    setLoading(true);
    try {
      await authService.updatePassword(password);
      showToast('Senha atualizada com sucesso!', 'success');
      router.replace('/(auth)/login');
    } catch (e: any) {
      showToast(e.message || 'Erro ao atualizar senha', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="brand" style={styles.title}>NOVA SENHA</AppText>
          <AppText style={styles.subtitle}>Crie uma nova senha segura</AppText>
          
          <View style={styles.form}>
            <TextField
              label="Nova Senha"
              placeholder="Digite a nova senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <TextField
              label="Confirmar Senha"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Button 
              title="Salvar Senha" 
              onPress={handleUpdate} 
              loading={loading}
              style={{ marginTop: 24 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    color: '#00C9A7',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
});
