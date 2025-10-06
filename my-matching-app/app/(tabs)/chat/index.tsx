import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type ChatItem = {
  id: string;
  otherUserId: string;
  username: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  matchStatus: 'matched' | 'received' | 'sent' | 'none';
};

export default function ChatListScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [matchedChats, setMatchedChats] = useState<ChatItem[]>([]);
  const [receivedChats, setReceivedChats] = useState<ChatItem[]>([]);
  const [sentChats, setSentChats] = useState<ChatItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'matched' | 'unmatched'>('matched');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchChats();
      
      // リアルタイム購読
      const channel = supabase
        .channel('chat-updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          fetchChats();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
  };

  const fetchChats = async () => {
    if (!userId) return;

    try {
      // マッチング状態を取得
      const { data: myLikes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userId);

      const { data: theirLikes } = await supabase
        .from('likes')
        .select('from_user_id')
        .eq('to_user_id', userId);

      const myLikeIds = myLikes?.map(l => l.to_user_id) || [];
      const theirLikeIds = theirLikes?.map(l => l.from_user_id) || [];

      // チャットルームを取得
      const { data: chats } = await supabase
        .from('chats')
        .select('id, user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (!chats || chats.length === 0) {
        setMatchedChats([]);
        setReceivedChats([]);
        setSentChats([]);
        return;
      }

      const chatItems: ChatItem[] = [];

      for (const chat of chats) {
        const otherUserId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;

        // プロフィール取得
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', otherUserId)
          .single();

        // 最終メッセージ取得
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('chat_id', chat.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // 未読件数取得
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .eq('is_read', false)
          .neq('sender_id', userId);

        // マッチング状態判定
        const iLiked = myLikeIds.includes(otherUserId);
        const theyLiked = theirLikeIds.includes(otherUserId);
        
        let matchStatus: ChatItem['matchStatus'];
        if (iLiked && theyLiked) {
          matchStatus = 'matched';
        } else if (theyLiked && !iLiked) {
          matchStatus = 'received';
        } else if (iLiked && !theyLiked) {
          matchStatus = 'sent';
        } else {
          matchStatus = 'none';
        }

        chatItems.push({
          id: otherUserId,
          otherUserId,
          username: profile?.username || 'ユーザー',
          lastMessage: lastMsg?.content,
          lastMessageTime: lastMsg?.created_at,
          unreadCount: unreadCount || 0,
          matchStatus,
        });
      }

      // ソート（最終メッセージ時刻の降順）
      chatItems.sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
        return timeB - timeA;
      });

      // 分類
      setMatchedChats(chatItems.filter(c => c.matchStatus === 'matched'));
      setReceivedChats(chatItems.filter(c => c.matchStatus === 'received'));
      setSentChats(chatItems.filter(c => c.matchStatus === 'sent'));

    } catch (err: any) {
      console.error('チャット取得エラー:', err.message);
    }
  };

  const handleChatPress = (chatId: string) => {
    router.push(`/(tabs)/chat/${chatId}` as any);
  };

  const renderItem = ({ item }: { item: ChatItem }) => (
    <Pressable
      style={[
        styles.chatItem, 
        { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' },
        item.unreadCount > 0 && { borderLeftWidth: 4, borderLeftColor: Colors[theme].primary }
      ]}
      onPress={() => handleChatPress(item.id)}
    >
      <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
        <Ionicons name="person" size={32} color="#999" />
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.headerRow}>
          <Text style={[styles.username, { color: Colors[theme].text }]}>
            {item.username}
          </Text>
          {item.matchStatus === 'received' && (
            <View style={[styles.statusBadge, { backgroundColor: '#ff9500' }]}>
              <Text style={styles.statusText}>未マッチ</Text>
            </View>
          )}
          {item.matchStatus === 'sent' && (
            <View style={[styles.statusBadge, { backgroundColor: '#999' }]}>
              <Text style={styles.statusText}>未返信</Text>
            </View>
          )}
        </View>
        {item.lastMessage && (
          <Text style={[styles.lastMessage, { color: '#999' }]} numberOfLines={1}>
            {item.lastMessage.slice(0, 20)}{item.lastMessage.length > 20 ? '...' : ''}
          </Text>
        )}
      </View>
      {item.unreadCount > 0 && (
        <View style={[styles.unreadBadge, { backgroundColor: Colors[theme].primary }]}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={24} color="#999" />
    </Pressable>
  );

  const totalUnread = [...matchedChats, ...receivedChats, ...sentChats].reduce(
    (sum, chat) => sum + chat.unreadCount, 0
  );

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* タブ */}
      <View style={[styles.tabContainer, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
        <Pressable
          style={[styles.tab, activeTab === 'matched' && { borderBottomColor: Colors[theme].primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('matched')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'matched' ? Colors[theme].primary : '#999' }]}>
            マッチ済み ({matchedChats.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'unmatched' && { borderBottomColor: Colors[theme].primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('unmatched')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'unmatched' ? Colors[theme].primary : '#999' }]}>
            未マッチ ({receivedChats.length + sentChats.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'matched' ? (
        <FlatList
          data={matchedChats}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#999" />
              <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
                マッチング済みのチャットがありません
              </Text>
            </View>
          }
        />
      ) : (
        <View style={{ flex: 1 }}>
          {receivedChats.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5' }]}>
                <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
                  相手からいいね ({receivedChats.length})
                </Text>
              </View>
              <FlatList
                data={receivedChats}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
                )}
                scrollEnabled={false}
              />
            </>
          )}
          
          {sentChats.length > 0 && (
            <>
              <View style={[styles.sectionHeader, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#f5f5f5' }]}>
                <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>
                  自分からいいね ({sentChats.length})
                </Text>
              </View>
              <FlatList
                data={sentChats}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: theme === 'dark' ? '#333' : '#eee' }]} />
                )}
                scrollEnabled={false}
              />
            </>
          )}

          {receivedChats.length === 0 && sentChats.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
                未マッチのチャットがありません
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    padding: 12,
    paddingLeft: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  lastMessage: {
    fontSize: 14,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginRight: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    marginLeft: 84,
  },
});