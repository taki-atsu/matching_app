// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // 最初に home へ飛ばす
  return <Redirect href="/home" />;
}
