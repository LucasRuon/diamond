import { Stack, Redirect, usePathname } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';

export default function AuthLayout() {
  const { session, profile, isLoading } = useAuth();
  const pathname = usePathname();

  if (!isLoading && session && !pathname.includes('register')) {
    const role = profile?.role || 'student';
    if (role === 'admin') return <Redirect href="/(admin)" />;
    if (role === 'responsible' || role === 'businessman') return <Redirect href="/(responsible)" />;
    return <Redirect href="/(student)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="update-password" />
    </Stack>
  );
}
