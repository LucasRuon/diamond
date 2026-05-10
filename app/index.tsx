import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { theme } from '../src/theme';

export default function Index() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.dxTeal} size="large" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  const role = profile?.role || 'student';
  
  if (role === 'admin') return <Redirect href="/(admin)" />;
  if (role === 'responsible' || role === 'businessman') return <Redirect href="/(responsible)" />;
  
  return <Redirect href="/(student)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: theme.colors.dxBg,
  }
});
