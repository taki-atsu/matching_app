import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  const theme = useColorScheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;

        console.log('✅ User data:', data.user ? 'Logged in' : 'Not logged in');

        if (data.user) {

          console.log('🚀 Navigating to /(tabs)');

          // ログイン済み → ホーム画面（履歴リセット）
          while (router.canGoBack()) {
            router.back();
          }
          router.replace('/(tabs)');
          
          // デバッグ用ログ
          setTimeout(() => {
            console.log('Navigation completed');
          }, 200);
        } else {

          console.log('🚀 Navigating to /(auth)/login');

          // 未ログイン → ログイン画面
          router.replace('/(auth)/login');
        }        
      } catch (err){

        console.error('❌ Auth check error:', err);

        router.replace('/(auth)/login');
      } finally {
        setLoading(false);
      }
    };

    void checkUser();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});