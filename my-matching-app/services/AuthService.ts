import { supabase } from '@/services/SupabaseClient';

export const registerUser = async (email: string, password: string, username?: string) => {
  // サインアップ
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) return data;

  // profiles にも登録
  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{ id: userId, email, username }]);

  if (profileError) throw profileError;

  return data;
};

export const loginUser = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // ✅ メール確認済みかチェック
  if (!data.user?.email_confirmed_at) {
    throw new Error('メールアドレスが確認されていません。認証メールを確認してください。');
  }

  return data;
};

export const logoutUser = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};