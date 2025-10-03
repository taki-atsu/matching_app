import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type ChatItem = {
  id: string;
  username: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
};

export default function ChatListScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchChats();
    }
  }, [userId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
  };

  const fetchChats = async () => {
    if (!userId) return;

    try {
      // マッチング済みユーザーを取得
      const { data: matches, error: matchError } = await supabase
        .from('matches')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (matchError) throw matchError;

      // マッチング相手のIDを抽出
      const matchedUserIds = matches?.map(match => 
        match.user1_id === userId ? match.user2_id : match.user1_id
      ) || [];

      if (matchedUserIds.length === 0) {
        setChats([]);
        return;
      }

      // プロフィール情報を取得
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', matchedUserIds);

      if (profileError) throw profileError;

      // チャット情報を整形
      const chatItems: ChatItem[] = profiles?.map(profile => ({
        id: profile.id,
        username: profile.username,
      })) || [];

      setChats(chatItems);
    } catch (err: any) {
      console.error('チャット取得エラー:', err.message);
    }
  };

  const handleChatPress = (chatId: string) => {
    router.push(`/(tabs)/chat/${chatId}` as any);
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <Pressable
      style={[styles.chatItem, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
      onPress={() => handleChatPress(item.id)}
    >
      <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
        <Ionicons name="person" size={32} color="#999" />
      </View>
      <View style={styles.chatInfo}>
        <Text style={[styles.username, { color: Colors[theme].text }]}>{item.username}</Text>
        {item.lastMessage && (
          <Text style={[styles.lastMessage, { color: '#999' }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </Pressable>
  );

  if (chats.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { backgroundColor: Colors[theme].background }]}>
        <Ionicons name="chatbubbles-outline" size={64} color="#999" />
        <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
          まだチャットがありません
        </Text>
        <Text style={[styles.emptySubtext, { color: '#999' }]}>
          マッチングするとチャットできます
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
  },
  separator: {
    height: 1,
    marginLeft: 84,
  },
});