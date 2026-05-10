import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export function useDeepLinks() {
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      
      try {
        const fragment = url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      } catch (e) {
        console.warn('Error parsing deep link', e);
      }
    };

    Linking.getInitialURL().then(handleUrl);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
