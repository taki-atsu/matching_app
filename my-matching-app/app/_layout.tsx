import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

export default function RootLayout() {
  const theme = useColorScheme();

  useEffect(() => {
    // セッションの初期化（エラーハンドリング付き）
    const initSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session initialization error:', error);
          // セッションエラーは無視（ログイン画面に遷移させる）
        }
      } catch (error) {
        console.error('Session initialization failed:', error);
      }
    };

    initSession();

    // 認証状態の変化を監視
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_OUT') {
          console.log('User signed out');
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}