import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/services/SupabaseClient';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type Chat = {
  id: string;
  participant_name: string;
  last_message: string;
};

export default function ChatListScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) throw new Error('ログインユーザーが見つかりません');

        const { data, error } = await supabase
          .from('chats')
          .select(`
            id,
            participants!inner(name),
            messages!chats_last_message(last_message)
          `)
          .eq('participants.user_id', user.id)
          .order('messages.created_at', { ascending: false });

        if (error) throw error;

        const chatList = (data || []).map((chat: any) => ({
          id: chat.id,
          participant_name: chat.participants[0].name,
          last_message: chat.messages?.last_message ?? '',
        }));
        setChats(chatList);
      } catch (err: any) {
        console.log('チャット取得エラー', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const renderItem = ({ item }: { item: Chat }) => (
    <Pressable
      style={[styles.chatItem, { backgroundColor: Colors[theme].background }]}
      onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
    >
      <Text style={{ color: Colors[theme].text, fontWeight: 'bold' }}>
        {item.participant_name}
      </Text>
      <Text style={{ color: Colors[theme].text }}>
        {item.last_message.slice(0, 20)}
        {item.last_message.length > 20 ? '…' : ''}
      </Text>
    </Pressable>
  );

  if (loading)
    return <ActivityIndicator size="large" style={{ flex: 1 }} color={Colors[theme].primary} />;

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatItem: { padding: 16 },
  separator: { height: 1, backgroundColor: '#ccc', marginHorizontal: 16 },
});
