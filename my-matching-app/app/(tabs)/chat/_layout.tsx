import { Stack } from 'expo-router';

export default function ChatLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true, // 👈 これを追加
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'チャット一覧',
          headerShown: false, // 一覧画面はタブのヘッダーを使う
        }} 
      />
      <Stack.Screen 
        name="[chatId]" 
        options={{ 
          title: 'チャット',
          // headerShown: true (デフォルト)
          headerBackTitle: '戻る',
        }} 
      />
    </Stack>
  );
}