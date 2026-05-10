import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

export async function openExternalLink(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Erro', `Não é possível abrir o link: ${url}`);
    }
  } catch (error) {
    Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o link.');
  }
}
