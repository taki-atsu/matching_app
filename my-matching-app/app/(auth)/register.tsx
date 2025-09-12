import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import { registerUser } from '@/services/AuthService'; // サービス層に統一

export default function RegisterScreen() {
  const theme = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const res = await registerUser(email, password);
      Alert.alert('登録成功', `ユーザー: ${res.user?.email}`);
      router.push('/(home)'); // 実際のフォルダ構成に合わせる
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Text style={[styles.title, { color: Colors[theme].text }]}>ユーザー登録</Text>
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
      <AppButton title="登録" onPress={handleRegister} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 6 },
});
