// app/(auth)/register.tsx
import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient'; // 👈 これを追加
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

export default function RegisterScreen() {
  const theme = useColorScheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });

      if (error) throw error;

      // 成功時にメール確認を促す
      Alert.alert(
        '仮登録完了',
        '確認メールを送信しました。\nメールに記載されたリンクをクリックして、本登録を完了してください。',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login')
          }
        ]
      );
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Text style={[styles.title, { color: Colors[theme].text }]}>ユーザー登録</Text>
      <TextInput
        placeholder="ユーザー名"
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
        value={username}
        onChangeText={setUsername}
        style={[styles.input, { color: Colors[theme].text }]}
        nativeID="username"
      />
      <TextInput
        placeholder="メールアドレス"
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { color: Colors[theme].text }]}
        autoCapitalize="none"
        keyboardType="email-address"
        nativeID="email"
      />
      <TextInput
        placeholder="パスワード"
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[styles.input, { color: Colors[theme].text }]}
        nativeID="password"
      />
      <AppButton title="登録" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
});