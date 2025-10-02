import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ChatRoomScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // 👇 chatIdが無効な場合はチャット一覧へリダイレクト
  useEffect(() => {

    console.log('ChatRoom mounted. chatId:', chatId, 'type:', typeof chatId);

    if (!chatId || chatId === 'undefined' || chatId === 'null') {
      console.warn('Invalid chatId detected, redirecting to chat list');
      router.replace('/(tabs)/chat');
    }
  }, [chatId]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (!error) setMessages(data || []);
    };
    void fetchMessages();

    const subscription = supabase
      .channel(`messages:chat_id=eq.${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        flatListRef.current?.scrollToEnd({ animated: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chatId]);

  const handleSend = async () => {
    if (!input.trim() || !userId) return;
    const { error } = await supabase.from('messages').insert([{ chat_id: chatId, content: input, sender_id: userId }]);
    if (!error) setInput('');
  };

  const renderItem = ({ item }: { item: any }) => {
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

  // chatIdが無効な場合は何も表示しない
  if (!chatId || chatId === 'undefined' || chatId === 'null') {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
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
        <Pressable onPress={handleSend} style={[styles.sendButton, { backgroundColor: Colors[theme].primary }]}>
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>送信</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messageContainer: { padding: 10, borderRadius: 8, marginVertical: 4, maxWidth: '70%' },
  inputContainer: { flexDirection: 'row', padding: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  sendButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
});