import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { loginUser } from '@/services/AuthService';

export default function LoginScreen() {
  const theme = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await loginUser(email, password);
      Alert.alert('ログイン成功', `ユーザー: ${res.user?.email}`);
      router.push('/(home)'); // 遷移先を実際のフォルダ構成に合わせて調整
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Text style={[styles.title, { color: Colors[theme].text }]}>ログイン</Text>
      <TextInput
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
      />
      <TextInput
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <AppButton title="ログイン" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 6 },
});
