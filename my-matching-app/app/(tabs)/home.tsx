// app/home.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { Colors } from '../../constants/Colors';
import AppButton from '../../components/AppButton';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hello Matching App!</Text>

      <Link href="/login" asChild>
        <AppButton title="ログイン" onPress={() => {}} />
      </Link>

      <Link href="/register" style={styles.link}>
        新規登録はこちら
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: Colors.text, marginBottom: 24 },
  link: { color: Colors.primary, marginTop: 16, fontSize: 16 },
});
