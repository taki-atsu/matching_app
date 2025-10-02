// app/(auth)/register.tsx
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { registerUser } from '@/services/AuthService';

export default function RegisterScreen() {
  const theme = useColorScheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const res = await registerUser(email, password, username);

      Alert.alert(
        '登録成功',
        '確認メールを送信しました。メールを確認してからログインしてください。'
      );

      router.replace('/(auth)/login');
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
      />
      <TextInput
        placeholder="メールアドレス"
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
        value={email}
        onChangeText={setEmail}
        style={[styles.input, { color: Colors[theme].text }]}
      />
      <TextInput
        placeholder="パスワード"
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[styles.input, { color: Colors[theme].text }]}
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
