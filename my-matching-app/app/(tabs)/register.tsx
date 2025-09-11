// app/register.tsx
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import AppButton from '../../components/AppButton';
import { Colors } from '../../constants/Colors';
import { registerUser } from '../../controllers/authController';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    const res = await registerUser(email, password);
    alert(`登録: ${res.user.email}`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ユーザー登録</Text>
      <TextInput placeholder="メールアドレス" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="パスワード" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />

      <AppButton title="登録" onPress={handleRegister} />

      <Link href="/login" style={styles.link}>
        すでにアカウントがある方はこちら
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: Colors.background },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: Colors.text },
  input: { width: '100%', borderWidth: 1, borderColor: Colors.border, padding: 10, marginBottom: 12, borderRadius: 6 },
  link: { color: Colors.primary, marginTop: 12 },
});
