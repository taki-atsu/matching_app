import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Message = {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
};

export default function ChatRoomScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUsername, setOtherUsername] = useState('');
  const [actualChatId, setActualChatId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chatId || chatId === 'undefined' || chatId === 'null') {
      console.warn('Invalid chatId detected, redirecting to chat list');
      router.replace('/(tabs)/chat');
      return;
    }
  }, [chatId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (userId && chatId) {
      initializeChat();
    }
  }, [userId, chatId]);

  useEffect(() => {
    if (!actualChatId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', actualChatId)
        .order('created_at', { ascending: true });

      if (error) console.log(error);
      else setMessages(data || []);
    };
    fetchMessages();

    const subscription = supabase
      .channel(`messages:chat_id=eq.${actualChatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${actualChatId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          flatListRef.current?.scrollToEnd({ animated: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [actualChatId]);

  const initializeChat = async () => {
    if (!userId || !chatId) return;

    try {
      // 相手のユーザー情報を取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', chatId)
        .single();

      setOtherUsername(profile?.username || 'ユーザー');

      // チャットルームを取得または作成
      const user1 = userId < chatId ? userId : chatId;
      const user2 = userId < chatId ? chatId : userId;

      let { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .single();

      if (!chat) {
        // チャットルームが存在しない場合は作成
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert([{ user1_id: user1, user2_id: user2 }])
          .select()
          .single();

        if (error) throw error;
        chat = newChat;
      }

      setActualChatId(chat?.id || null);
    } catch (err: any) {
      console.error('チャット初期化エラー:', err.message);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !userId || !actualChatId) return;

    const { error } = await supabase
      .from('messages')
      .insert([{ chat_id: actualChatId, content: input, sender_id: userId }]);

    if (error) console.log(error);
    setInput('');
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === userId;
    return (
      <View
        style={[
          styles.messageContainer,
          {
            alignSelf: isMe ? 'flex-end' : 'flex-start',
            backgroundColor: isMe ? Colors[theme].primary : theme === 'dark' ? '#333' : '#eee',
          },
        ]}
      >
        <Text style={{ color: isMe ? '#fff' : Colors[theme].text }}>{item.content}</Text>
      </View>
    );
  };

  if (!chatId || chatId === 'undefined' || chatId === 'null') {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: otherUsername,
          headerShown: true,
          headerBackTitle: '戻る',
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: Colors[theme].background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 8 }}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: Colors[theme].background,
                color: Colors[theme].text,
                borderColor: Colors[theme].text,
              },
            ]}
            placeholder="メッセージを入力"
            placeholderTextColor={theme === 'dark' ? '#aaa' : '#666'}
            value={input}
            onChangeText={setInput}
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendButton, { backgroundColor: Colors[theme].primary }]}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>送信</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messageContainer: { padding: 10, borderRadius: 8, marginVertical: 4, maxWidth: '70%' },
  inputContainer: { flexDirection: 'row', padding: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});