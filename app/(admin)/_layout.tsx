import { Stack, usePathname, router, Redirect } from 'expo-router';
import { View } from 'react-native';
import { RoleTabs } from '../../src/components/layout/RoleTabs';
import { useAuth } from '../../src/hooks/useAuth';
import { theme } from '../../src/theme';

export default function AdminLayout() {
  const { session, isLoading } = useAuth();

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/login" />;
  }
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.includes('/users')) return 'users';
    if (pathname.includes('/trainings')) return 'trainings';
    if (pathname.includes('/plans')) return 'plans';
    if (pathname.includes('/charges')) return 'charges';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleSelectTab = (id: string) => {
    switch (id) {
      case 'home': router.replace('/(admin)'); break;
      case 'users': router.replace('/(admin)/users'); break;
      case 'trainings': router.replace('/(admin)/trainings'); break;
      case 'plans': router.replace('/(admin)/plans'); break;
      case 'charges': router.replace('/(admin)/charges'); break;
      case 'reports': router.replace('/(admin)/reports'); break;
      case 'profile': router.replace('/(admin)/profile'); break;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.dxBg }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="users" />
        <Stack.Screen name="trainings" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="charges" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="profile" />
      </Stack>
      <RoleTabs
        items={[
          { id: 'home', label: 'Início', icon: 'Home', isActive: activeTab === 'home' },
          { id: 'users', label: 'Usuários', icon: 'Users', isActive: activeTab === 'users' },
          { id: 'trainings', label: 'Treinos', icon: 'Calendar', isActive: activeTab === 'trainings' },
          { id: 'plans', label: 'Planos', icon: 'CreditCard', isActive: activeTab === 'plans' },
          { id: 'charges', label: 'Cobranças', icon: 'DollarSign', isActive: activeTab === 'charges' },
          { id: 'reports', label: 'Relatórios', icon: 'TrendingUp', isActive: activeTab === 'reports' },
          { id: 'profile', label: 'Perfil', icon: 'User', isActive: activeTab === 'profile' },
        ]}
        onSelect={handleSelectTab}
      />
    </View>
  );
}
