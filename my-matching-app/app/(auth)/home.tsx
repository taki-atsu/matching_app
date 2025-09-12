import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function HomeScreen() {
  const theme = useColorScheme();

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <Text style={[styles.title, { color: Colors[theme].text }]}>Hello Matching App!</Text>

      <Link href="/(auth)/login" asChild>
        <AppButton title="ログイン" onPress={() => {}} />
      </Link>

      <Link href="/(auth)/register" asChild>
        <AppButton title="新規登録" onPress={() => {}} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
});
