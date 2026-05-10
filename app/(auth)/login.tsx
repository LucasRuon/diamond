import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { DynamicAuthBackground } from '../../src/components/auth/DynamicAuthBackground';
import { AppText } from '../../src/components/ui/AppText';
import { TextField } from '../../src/components/ui/TextField';
import { Button } from '../../src/components/ui/Button';
import { authService } from '../../src/features/auth/auth-service';
import { useToast } from '../../src/components/ui/ToastProvider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Preencha todos os campos', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await authService.signIn(email, password);
    } catch (e: any) {
      showToast(e.message || 'Erro ao fazer login', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DynamicAuthBackground>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Image 
            source={require('../../base_icon_transparent_background.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <AppText variant="brand" style={styles.title}>DIAMOND X</AppText>
          <AppText weight="bold" style={styles.subtitle}>Performance & Training Center</AppText>
          
          <View style={styles.form}>
            <TextField
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TextField
              placeholder="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              <AppText weight="bold" color="dxMuted">ESQUECI A SENHA</AppText>
            </Link>

            <Button 
              title="Acessar App" 
              onPress={handleLogin} 
              loading={loading}
              style={{ marginTop: 24 }}
            />

            <Link href="/(auth)/register" style={styles.registerLink}>
              <AppText weight="bold" color="dxMuted">NÃO TENHO UMA CONTA</AppText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </DynamicAuthBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    width: 190,
    height: 140,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    color: '#00C9A7',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    letterSpacing: 1.5,
    marginBottom: 32,
    textTransform: 'uppercase',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    fontSize: 12,
    marginTop: -8,
  },
  registerLink: {
    alignSelf: 'center',
    fontSize: 12,
    marginTop: 24,
  },
});
