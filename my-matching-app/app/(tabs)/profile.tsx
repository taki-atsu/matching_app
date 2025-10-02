import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { useRouter } from 'expo-router'; // 👈 追加
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ProfileScreen() {
  const theme = useColorScheme();
  const router = useRouter();  // 👈 追加
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const user = data.user;
        if (!user) throw new Error('ユーザー情報を取得できませんでした');

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (profile) setUsername(profile.username ?? '');
      } catch (err: any) {
        Alert.alert('エラー', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = data.user;
      if (!user) throw new Error('ユーザー情報が見つかりません');

      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('成功', 'プロフィールを更新しました！');
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  // 👇 ログアウト処理を追加
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors[theme].text }}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Text style={[styles.label, { color: Colors[theme].text }]}>ユーザー名</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        style={[styles.input, { color: Colors[theme].text }]}
        placeholder="ユーザー名を入力"
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
        nativeID="username"  // 👈 ついでに警告対策
      />
      <AppButton title="更新" onPress={handleUpdate} />
      
      {/* 👇 ログアウトボタンを追加 */}
      <View style={styles.logoutContainer}>
        <AppButton 
          title="ログアウト" 
          onPress={handleLogout}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 6,
    marginBottom: 16,
  },
  logoutContainer: { marginTop: 32 },  // 👈 追加
});