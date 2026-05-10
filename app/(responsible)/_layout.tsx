import { Stack, usePathname, router, Redirect } from 'expo-router';
import { View } from 'react-native';
import { RoleTabs } from '../../src/components/layout/RoleTabs';
import { useAuth } from '../../src/hooks/useAuth';
import { theme } from '../../src/theme';

export default function ResponsibleLayout() {
  const { session, isLoading } = useAuth();

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/login" />;
  }
  const pathname = usePathname();

  const getActiveTab = () => {
    if (pathname.includes('/students')) return 'students';
    if (pathname.includes('/trainings')) return 'trainings';
    if (pathname.includes('/plans')) return 'plans';
    if (pathname.includes('/payments')) return 'payments';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleSelectTab = (id: string) => {
    switch (id) {
      case 'home': router.replace('/(responsible)'); break;
      case 'students': router.replace('/(responsible)/students'); break;
      case 'trainings': router.replace('/(responsible)/trainings'); break;
      case 'plans': router.replace('/(responsible)/plans'); break;
      case 'payments': router.replace('/(responsible)/payments'); break;
      case 'profile': router.replace('/(responsible)/profile'); break;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.dxBg }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="students" />
        <Stack.Screen name="trainings" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="payments" />
        <Stack.Screen name="profile" />
      </Stack>
      <RoleTabs 
        items={[
          { id: 'home', label: 'Início', icon: 'Home', isActive: activeTab === 'home' },
          { id: 'students', label: 'Alunos', icon: 'Users', isActive: activeTab === 'students' },
          { id: 'trainings', label: 'Treinos', icon: 'Calendar', isActive: activeTab === 'trainings' },
          { id: 'plans', label: 'Planos', icon: 'CreditCard', isActive: activeTab === 'plans' },
          { id: 'payments', label: 'Faturas', icon: 'DollarSign', isActive: activeTab === 'payments' },
          { id: 'profile', label: 'Perfil', icon: 'User', isActive: activeTab === 'profile' },
        ]}
        onSelect={handleSelectTab}
      />
    </View>
  );
}
