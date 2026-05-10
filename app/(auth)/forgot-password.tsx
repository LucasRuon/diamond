import React, { useState } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { DynamicAuthBackground } from '../../src/components/auth/DynamicAuthBackground';
import { AppText } from '../../src/components/ui/AppText';
import { TextField } from '../../src/components/ui/TextField';
import { Button } from '../../src/components/ui/Button';
import { authService } from '../../src/features/auth/auth-service';
import { useToast } from '../../src/components/ui/ToastProvider';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { showToast } = useToast();

  const handleReset = async () => {
    if (!email) {
      showToast('Preencha seu e-mail', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setSuccess(true);
    } catch (e: any) {
      showToast(e.message || 'Erro ao solicitar nova senha', 'error');
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
          <Link href="/(auth)/login" style={styles.backLink}>
            <AppText weight="bold" color="dxMuted">← VOLTAR PARA O LOGIN</AppText>
          </Link>
          
          <Image 
            source={require('../../base_icon_transparent_background.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <AppText weight="bold" style={styles.kicker}>RECUPERAÇÃO DE ACESSO</AppText>
          <AppText variant="brand" style={styles.title}>ESQUECEU A SENHA?</AppText>
          <AppText style={styles.subtitle}>
            Insira o e-mail associado à sua conta e enviaremos um link para redefinir sua senha.
          </AppText>
          
          <View style={styles.form}>
            {success ? (
              <View style={styles.successBox}>
                <AppText weight="bold" color="dxTeal">E-mail enviado!</AppText>
                <AppText style={{ fontSize: 13, marginTop: 4 }}>
                  Verifique sua caixa de entrada e spam.
                </AppText>
              </View>
            ) : (
              <>
                <TextField
                  placeholder="Seu E-mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button 
                  title="Enviar Link" 
                  onPress={handleReset} 
                  loading={loading}
                  style={{ marginTop: 16 }}
                />
              </>
            )}
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
    padding: 24,
  },
  backLink: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  logo: {
    width: 118,
    height: 80,
    marginBottom: 28,
  },
  kicker: {
    color: '#00C9A7',
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    color: '#f0f0f0',
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
    marginBottom: 28,
  },
  form: {
    width: '100%',
    maxWidth: 400,
    padding: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 201, 167, 0.3)',
    borderRadius: 8,
    backgroundColor: 'rgba(20, 20, 20, 0.82)',
  },
  successBox: {
    padding: 14,
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    borderRadius: 8,
  },
});
