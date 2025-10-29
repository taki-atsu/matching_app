import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  const theme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: Colors[theme].background,
        },
        headerTintColor: Colors[theme].text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'ログイン',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: '新規登録',
          headerShown: false,
        }}
      />
    </Stack>
  );
}