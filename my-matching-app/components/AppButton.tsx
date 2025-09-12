// components/AppButton.tsx
import { Pressable, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type Props = {
  title: string;
  onPress: () => void;
};

export default function AppButton({ title, onPress }: Props) {
  const theme = useColorScheme();
  return (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor: Colors[theme].primary }]}>
      <Text style={[styles.text, { color: Colors[theme].text }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { padding: 12, borderRadius: 8, width: '100%', alignItems: 'center', marginVertical: 8 },
  text: { fontWeight: 'bold' },
});
