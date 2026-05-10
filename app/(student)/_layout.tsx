import { Stack, usePathname, router, Redirect } from 'expo-router';
import { View } from 'react-native';
import { RoleTabs } from '../../src/components/layout/RoleTabs';
import { useAuth } from '../../src/hooks/useAuth';
import { theme } from '../../src/theme';

export default function StudentLayout() {
  const { session, isLoading } = useAuth();

  if (!isLoading && !session) {
    return <Redirect href="/(auth)/login" />;
  }
  const pathname = usePathname();

  const isFullScreen = pathname.includes('/scanner');

  const getActiveTab = () => {
    if (pathname.includes('/trainings')) return 'trainings';
    if (pathname.includes('/plans')) return 'plans';
    if (pathname.includes('/attendance')) return 'attendance';
    if (pathname.includes('/profile')) return 'profile';
    return 'home';
  };

  const activeTab = getActiveTab();

  const handleSelectTab = (id: string) => {
    switch (id) {
      case 'home': router.replace('/(student)'); break;
      case 'trainings': router.replace('/(student)/trainings'); break;
      case 'plans': router.replace('/(student)/plans'); break;
      case 'attendance': router.replace('/(student)/attendance'); break;
      case 'profile': router.replace('/(student)/profile'); break;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.dxBg }}>
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="trainings" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="attendance" />
        <Stack.Screen name="scanner" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile" />
      </Stack>
      {!isFullScreen && <RoleTabs 
        items={[
          { id: 'home', label: 'Início', icon: 'Home', isActive: activeTab === 'home' },
          { id: 'trainings', label: 'Treinos', icon: 'Calendar', isActive: activeTab === 'trainings' },
          { id: 'plans', label: 'Planos', icon: 'CreditCard', isActive: activeTab === 'plans' },
          { id: 'attendance', label: 'Presença', icon: 'CheckCircle', isActive: activeTab === 'attendance' },
          { id: 'profile', label: 'Perfil', icon: 'User', isActive: activeTab === 'profile' },
        ]}
        onSelect={handleSelectTab}
      />}
    </View>
  );
}
