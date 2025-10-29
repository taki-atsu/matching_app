import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Message = {
  id: string;
  chat_id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  image_url?: string | null;
};

export default function ChatRoomScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [otherUsername, setOtherUsername] = useState('');
  const [otherUserImageUrl, setOtherUserImageUrl] = useState<string | null>(null);
  const [actualChatId, setActualChatId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<'matched' | 'received' | 'sent' | 'none'>('none');
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!chatId || chatId === 'undefined' || chatId === 'null') {
      console.warn('Invalid chatId detected, redirecting to chat list');
      router.replace('/(tabs)/chat');
      return;
    }
  }, [chatId]);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId && chatId) {
      initializeChat();
    }
  }, [userId, chatId]);

  useEffect(() => {
    if (!actualChatId || !userId) return;

    console.log('🔔 Setting up realtime subscription for chat:', actualChatId);

    fetchMessages();

    const channel = supabase
      .channel(`messages:${actualChatId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `chat_id=eq.${actualChatId}` 
        },
        (payload) => {
          console.log('📨 New message received:', payload);
          const newMessage = payload.new as Message;
          
          setMessages((prev) => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping');
              return prev;
            }
            
            const withoutTemp = prev.filter(m => !m.id.startsWith('temp-'));
            return [...withoutTemp, newMessage];
          });
          
          if (newMessage.sender_id !== userId) {
            markAsRead(newMessage.id);
          }
          
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });

    return () => {
      console.log('🔕 Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [actualChatId, userId]);

  const fetchProfileImage = async (targetUserId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profile_images')
        .select('image_url')
        .eq('user_id', targetUserId)
        .order('display_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile image:', error);
        return null;
      }

      return data?.image_url || null;
    } catch (error) {
      console.error('Error fetching profile image:', error);
      return null;
    }
  };

  const initializeChat = async () => {
    if (!userId || !chatId) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', chatId)
        .single();

      setOtherUsername(profile?.username || 'ユーザー');

      const imageUrl = await fetchProfileImage(chatId);
      setOtherUserImageUrl(imageUrl);

      const { data: myLike } = await supabase
        .from('likes')
        .select('*')
        .eq('from_user_id', userId)
        .eq('to_user_id', chatId)
        .single();

      const { data: theirLike } = await supabase
        .from('likes')
        .select('*')
        .eq('from_user_id', chatId)
        .eq('to_user_id', userId)
        .single();

      if (myLike && theirLike) {
        setMatchStatus('matched');
      } else if (theirLike && !myLike) {
        setMatchStatus('received');
      } else if (myLike && !theirLike) {
        setMatchStatus('sent');
      } else {
        setMatchStatus('none');
      }

      const user1 = userId < chatId ? userId : chatId;
      const user2 = userId < chatId ? chatId : userId;

      let { data: chat } = await supabase
        .from('chats')
        .select('id')
        .eq('user1_id', user1)
        .eq('user2_id', user2)
        .single();

      if (!chat) {
        const { data: newChat, error } = await supabase
          .from('chats')
          .insert([{ user1_id: user1, user2_id: user2, is_matched: myLike && theirLike }])
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

  const fetchMessages = async () => {
    if (!actualChatId || !userId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', actualChatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.log('メッセージ取得エラー:', error);
    } else {
      setMessages(data || []);
      
      const unreadMessages = data?.filter(m => m.sender_id !== userId && !m.is_read) || [];
      for (const msg of unreadMessages) {
        await markAsRead(msg.id);
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('エラー', '写真ライブラリへのアクセス権限が必要です');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        await sendImage(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('エラー', '画像の選択に失敗しました');
    }
  };

  const sendImage = async (uri: string) => {
    if (!userId || !actualChatId) return;

    try {
      setUploading(true);

      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${actualChatId}/${Date.now()}.${fileExt}`;

      let uploadData, uploadError;

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const result = await supabase.storage
          .from('chat-images')
          .upload(fileName, blob, { 
            upsert: false,
            contentType: `image/${fileExt}`
          });
        
        uploadData = result.data;
        uploadError = result.error;
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          type: `image/${fileExt}`,
          name: fileName,
        } as any);

        const result = await supabase.storage
          .from('chat-images')
          .upload(fileName, formData, { 
            upsert: false,
            contentType: `image/${fileExt}`
          });
        
        uploadData = result.data;
        uploadError = result.error;
      }

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      // 画像URLをメッセージとして送信
      const { data, error } = await supabase
        .from('messages')
        .insert([{ 
          chat_id: actualChatId, 
          content: '[画像]',
          image_url: urlData.publicUrl,
          sender_id: userId,
          is_read: false 
        }])
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (err: any) {
      console.error('Image upload error:', err);
      Alert.alert('エラー', '画像の送信に失敗しました');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !userId || !actualChatId) return;

    const messageContent = input.trim();
    setInput('');

    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      chat_id: actualChatId,
      content: messageContent,
      sender_id: userId,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages(prev => [...prev, tempMessage]);
    
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);

    const { data, error } = await supabase
      .from('messages')
      .insert([{ 
        chat_id: actualChatId, 
        content: messageContent, 
        sender_id: userId,
        is_read: false 
      }])
      .select()
      .single();

    if (error) {
      console.log('メッセージ送信エラー:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handleOpenProfile = () => {
    router.push(`/profile/${chatId}` as any);
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender_id === userId;
    return (
      <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginVertical: 4 }}>
        {item.image_url ? (
          <Pressable 
            onPress={() => Alert.alert('画像', '画像を表示', [{ text: 'OK' }])}
            style={[
              styles.imageMessageContainer,
              {
                alignSelf: isMe ? 'flex-end' : 'flex-start',
              },
            ]}
          >
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
            <Text style={[styles.timestamp, { color: '#fff', position: 'absolute', bottom: 4, right: 8 }]}>
              {new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.messageContainer,
              {
                backgroundColor: isMe ? Colors[theme].primary : theme === 'dark' ? '#333' : '#eee',
              },
            ]}
          >
            <Text style={{ color: isMe ? '#fff' : Colors[theme].text }}>{item.content}</Text>
            <Text style={[styles.timestamp, { color: isMe ? 'rgba(255,255,255,0.7)' : '#999' }]}>
              {new Date(item.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
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
          title: '',
          headerShown: true,
          headerBackTitle: '戻る',
          headerStyle: {
            backgroundColor: Colors[theme].background,
          },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color={Colors[theme].text} />
            </Pressable>
          ),
          headerTitle: () => (
            <Pressable onPress={handleOpenProfile} style={styles.headerTitle}>
              {otherUserImageUrl ? (
                <Image source={{ uri: otherUserImageUrl }} style={styles.headerAvatar} />
              ) : (
                <View style={[styles.headerAvatar, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
                  <Ionicons name="person" size={20} color="#999" />
                </View>
              )}
              <View>
                <Text style={[styles.headerName, { color: Colors[theme].text }]}>
                  {otherUsername}
                </Text>
                {matchStatus !== 'matched' && (
                  <Text style={styles.headerStatus}>
                    {matchStatus === 'received' && '未マッチ（相手からいいね）'}
                    {matchStatus === 'sent' && '未マッチ（自分からいいね）'}
                    {matchStatus === 'none' && '未マッチ'}
                  </Text>
                )}
              </View>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: Colors[theme].background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {matchStatus !== 'matched' && (
          <View style={[styles.warningBanner, { backgroundColor: theme === 'dark' ? '#3a3a00' : '#fff3cd' }]}>
            <Ionicons name="warning" size={16} color="#ff9500" />
            <Text style={[styles.warningText, { color: theme === 'dark' ? '#ffd700' : '#856404' }]}>
              {matchStatus === 'received' && '相手からいいねが届いています。いいねを返すとマッチングします。'}
              {matchStatus === 'sent' && '相手がいいねを返すとマッチングします。'}
              {matchStatus === 'none' && 'まだマッチングしていません。'}
            </Text>
          </View>
        )}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 8 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
        <View style={[styles.inputContainer, { borderTopColor: theme === 'dark' ? '#333' : '#eee' }]}>
          <Pressable
            onPress={pickImage}
            style={[styles.imageButton, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f5f5f5' }]}
            disabled={uploading}
          >
            <Ionicons name="image" size={24} color={uploading ? '#999' : Colors[theme].primary} />
          </Pressable>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme === 'dark' ? '#2a2a2a' : '#f5f5f5',
                color: Colors[theme].text,
              },
            ]}
            placeholder="メッセージを入力"
            placeholderTextColor={theme === 'dark' ? '#aaa' : '#666'}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <Pressable
            onPress={handleSend}
            style={[styles.sendButton, { backgroundColor: Colors[theme].primary }]}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerStatus: {
    fontSize: 11,
    color: '#999',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
  },
  messageContainer: { 
    padding: 10, 
    borderRadius: 12, 
    marginVertical: 4, 
    maxWidth: '75%' 
  },
  imageMessageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: '75%',
    position: 'relative',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 12, 
    alignItems: 'flex-end',
    gap: 8,
    borderTopWidth: 1,
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: { 
    flex: 1, 
    borderRadius: 20, 
    paddingHorizontal: 16, 
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});