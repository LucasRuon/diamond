import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router, Link } from 'expo-router';
import { AppScreen } from '../../src/components/layout/AppScreen';
import { AppText } from '../../src/components/ui/AppText';
import { TextField } from '../../src/components/ui/TextField';
import { Button } from '../../src/components/ui/Button';
import { authService } from '../../src/features/auth/auth-service';
import { useToast } from '../../src/components/ui/ToastProvider';
import { maskCPF, maskPhone, unmask } from '../../src/utils/masks';
import { isValidCPF, isValidEmail } from '../../src/utils/validation';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleRegister = async () => {
    if (!fullName || !email || !cpf || !phone || !password) {
      showToast('Preencha todos os campos', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('E-mail inválido', 'error');
      return;
    }
    if (!isValidCPF(cpf)) {
      showToast('CPF inválido', 'error');
      return;
    }

    setLoading(true);
    try {
      await authService.signUp(email, password, fullName, unmask(phone));
      await authService.signOut();
      showToast('Conta criada com sucesso! Você já pode entrar.', 'success');
      router.replace('/(auth)/login');
    } catch (e: any) {
      showToast(e.message || 'Erro ao criar conta', 'error');
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
          <AppText variant="brand" style={styles.title}>CRIAR CONTA</AppText>
          <AppText style={styles.subtitle}>Preencha seus dados abaixo</AppText>
          
          <View style={styles.form}>
            <TextField
              label="Nome Completo"
              placeholder="Digite seu nome completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <TextField
              label="E-mail"
              placeholder="Digite seu e-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              label="CPF"
              placeholder="000.000.000-00"
              value={cpf}
              onChangeText={(text) => setCpf(maskCPF(text))}
              keyboardType="number-pad"
              maxLength={14}
            />
            <TextField
              label="WhatsApp"
              placeholder="(00) 00000-0000"
              value={phone}
              onChangeText={(text) => setPhone(maskPhone(text))}
              keyboardType="phone-pad"
              maxLength={15}
            />
            <TextField
              label="Senha"
              placeholder="Crie uma senha forte"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <Button 
              title="Cadastrar" 
              onPress={handleRegister} 
              loading={loading}
              style={{ marginTop: 24 }}
            />

            <Link href="/(auth)/login" style={styles.loginLink}>
              <AppText weight="bold" color="dxMuted">JÁ TENHO UMA CONTA</AppText>
            </Link>
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
    paddingTop: 40,
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
  loginLink: {
    alignSelf: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
