import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { loginUser } from '@/services/AuthService';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const theme = useColorScheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await loginUser(email, password);
      Alert.alert('ログイン成功', `ユーザー: ${res.user?.email}`);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Text style={[styles.title, { color: Colors[theme].text }]}>ログイン</Text>
      <TextInput
        placeholder="メールアドレス"
        placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
        value={email}
        onChangeText={setEmail}
        style={[
          styles.input, 
          { 
            color: Colors[theme].text,
            borderColor: theme === 'dark' ? '#555' : '#ccc',
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
          }
        ]}
        autoCapitalize="none"
        keyboardType="email-address"
        nativeID="email"
      />
      <TextInput
        placeholder="パスワード"
        placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[
          styles.input, 
          { 
            color: Colors[theme].text,
            borderColor: theme === 'dark' ? '#555' : '#ccc',
            backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
          }
        ]}
        nativeID="password"
      />
      <AppButton title="ログイン" onPress={handleLogin} />

      <Text
        style={[styles.link, { color: Colors[theme].primary }]}
        onPress={() => router.push('/(auth)/register')}
      >
        新規登録はこちら
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: {
    width: '100%',
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
  link: {
    marginTop: 16,
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});