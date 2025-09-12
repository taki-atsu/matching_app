import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/services/SupabaseClient';
import { loginUser } from '@/services/AuthService';

export default function RootLayout() {
  return (
    <>
      {/* この Stack はタブや画面のルートを管理 */}
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="auto" />
    </>
  );
}
