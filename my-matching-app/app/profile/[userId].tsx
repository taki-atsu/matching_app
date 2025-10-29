import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Profile = {
  id: string;
  username: string;
  bio: string | null;
  hobbies: string | null;
  mbti: string | null;
  seeking_type: string | null;
  seeking_detail: string | null;
  age: number | null;
  gender: string | null;
  location: string | null;
};

type ProfileImage = {
  id: string;
  image_path: string;
  display_order: number;
  url: string;
};

type RelationshipState = {
  sentLike: boolean;
  receivedLike: boolean;
  matched: boolean;
  chatId: string | null;
};

export default function UserProfileScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: targetUserId } = useLocalSearchParams<{ userId: string }>();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [relationshipState, setRelationshipState] = useState<RelationshipState>({
    sentLike: false,
    receivedLike: false,
    matched: false,
    chatId: null,
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUserId && targetUserId) {
      fetchProfileData();
    }
  }, [currentUserId, targetUserId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id ?? null);
  };

  const checkRelationship = async () => {
    if (!currentUserId || !targetUserId) return;

    try {
      const { data: sentLike } = await supabase
        .from('likes')
        .select('*')
        .eq('from_user_id', currentUserId)
        .eq('to_user_id', targetUserId)
        .maybeSingle();

      const { data: receivedLike } = await supabase
        .from('likes')
        .select('*')
        .eq('from_user_id', targetUserId)
        .eq('to_user_id', currentUserId)
        .maybeSingle();

      const { data: chat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${currentUserId})`)
        .maybeSingle();

      const matched = !!sentLike && !!receivedLike;

      setRelationshipState({
        sentLike: !!sentLike,
        receivedLike: !!receivedLike,
        matched,
        chatId: chat?.id || null,
      });
    } catch (error: any) {
      console.error('Error checking relationship:', error);
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      const { data: imagesData, error: imagesError } = await supabase
        .from('profile_images')
        .select('id, image_url, display_order')
        .eq('user_id', targetUserId)
        .order('display_order');

      if (imagesError) {
        console.error('Images fetch error:', imagesError);
        setImages([]);
      } else {
        const imagesWithUrls = imagesData?.map(img => ({
          ...img,
          image_path: '',
          url: img.image_url
        })) || [];

        setImages(imagesWithUrls);
      }

      await checkRelationship();
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      Alert.alert('エラー', 'プロフィールの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  const handleSendLike = async () => {
    if (!currentUserId || !targetUserId) return;

    try {
      setActionLoading(true);

      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          from_user_id: currentUserId,
          to_user_id: targetUserId
        });

      if (likeError) throw likeError;

      if (!relationshipState.chatId) {
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .insert({
            user1_id: currentUserId,
            user2_id: targetUserId
          })
          .select()
          .single();

        if (chatError) throw chatError;
      }

      if (relationshipState.receivedLike) {
        Alert.alert('🎉 マッチング成立！', `${profile?.username}さんとマッチングしました！`);
      } else {
        Alert.alert('成功', 'いいねを送信しました');
      }

      await checkRelationship();
    } catch (error: any) {
      console.error('Error sending like:', error);
      Alert.alert('エラー', 'いいねの送信に失敗しました');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelLike = async () => {
    if (!currentUserId || !targetUserId) return;

    Alert.alert(
      'いいねを取り消す',
      '本当にいいねを取り消しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '取り消す',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);

              const { error } = await supabase
                .from('likes')
                .delete()
                .eq('from_user_id', currentUserId)
                .eq('to_user_id', targetUserId);

              if (error) throw error;

              Alert.alert('完了', 'いいねを取り消しました');
              await checkRelationship();
            } catch (error: any) {
              console.error('Error canceling like:', error);
              Alert.alert('エラー', 'いいねのキャンセルに失敗しました');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handlePass = async () => {
    if (!currentUserId || !targetUserId) return;

    if (relationshipState.receivedLike && !relationshipState.sentLike) {
      Alert.alert(
        'パスする',
        'このユーザーをパスしますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'パス',
            style: 'destructive',
            onPress: async () => {
              try {
                setActionLoading(true);

                const { error } = await supabase
                  .from('likes')
                  .delete()
                  .eq('from_user_id', targetUserId)
                  .eq('to_user_id', currentUserId);

                if (error) throw error;

                Alert.alert('完了', 'パスしました');
                router.back();
              } catch (error: any) {
                console.error('Error passing:', error);
                Alert.alert('エラー', 'パスに失敗しました');
              } finally {
                setActionLoading(false);
              }
            }
          }
        ]
      );
    } else if (!relationshipState.sentLike && !relationshipState.receivedLike) {
      router.back();
    }
  };

  const handleOpenChat = () => {
    if (relationshipState.chatId || relationshipState.sentLike || relationshipState.receivedLike) {
      router.push(`/(tabs)/chat/${targetUserId}` as any);
    }
  };

  const renderActionButtons = () => {
    if (relationshipState.matched) {
      return (
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: Colors[theme].primary }]}
            onPress={handleOpenChat}
            disabled={actionLoading}
          >
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={styles.buttonText}>チャット</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: Colors[theme].primary }]}
            onPress={handleCancelLike}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={Colors[theme].primary} />
            ) : (
              <Ionicons name="heart-dislike" size={24} color={Colors[theme].primary} />
            )}
          </Pressable>
        </View>
      );
    } else if (relationshipState.receivedLike && !relationshipState.sentLike) {
      return (
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: Colors[theme].primary }]}
            onPress={handleSendLike}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#fff" />
                <Text style={styles.buttonText}>いいね返し</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: '#ff3b30' }]}
            onPress={handlePass}
            disabled={actionLoading}
          >
            <Ionicons name="close" size={24} color="#ff3b30" />
          </Pressable>
        </View>
      );
    } else if (relationshipState.sentLike && !relationshipState.receivedLike) {
      return (
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}
            onPress={handleOpenChat}
            disabled={actionLoading}
          >
            <Ionicons name="chatbubble" size={20} color={Colors[theme].text} />
            <Text style={[styles.buttonText, { color: Colors[theme].text }]}>チャット</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: Colors[theme].primary }]}
            onPress={handleCancelLike}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={Colors[theme].primary} />
            ) : (
              <Ionicons name="heart-dislike" size={24} color={Colors[theme].primary} />
            )}
          </Pressable>
        </View>
      );
    } else {
      return (
        <View style={styles.actionContainer}>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: Colors[theme].primary }]}
            onPress={handleSendLike}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="heart" size={20} color="#fff" />
                <Text style={styles.buttonText}>いいね</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, { borderColor: '#ff3b30' }]}
            onPress={handlePass}
            disabled={actionLoading}
          >
            <Ionicons name="close" size={24} color="#ff3b30" />
          </Pressable>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: Colors[theme].background }]}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: Colors[theme].background }]}>
        <Text style={[styles.errorText, { color: Colors[theme].text }]}>
          プロフィールが見つかりませんでした
        </Text>
        <Pressable
          style={[styles.backButton, { backgroundColor: Colors[theme].primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* ヘッダー */}
      <View style={[styles.header, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff', paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={24} color={Colors[theme].text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: Colors[theme].text }]}>
          {profile.username}さんのプロフィール
        </Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* 相手からいいねのバッジ */}
        {relationshipState.receivedLike && !relationshipState.matched && (
          <View style={[styles.likeBadge, { backgroundColor: '#ff9500' }]}>
            <Ionicons name="heart" size={16} color="#fff" />
            <Text style={styles.likeBadgeText}>このユーザーからいいねが届いています</Text>
          </View>
        )}

        {/* プロフィール画像カルーセル */}
        <View style={styles.imageSection}>
          {images.length > 0 ? (
            <>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.imageCarousel}
              >
                {images.map((img) => (
                  <View key={img.id} style={styles.imageContainer}>
                    <Image
                      source={{ uri: img.url }}
                      style={styles.profileImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
              {images.length > 1 && (
                <View style={styles.imageIndicators}>
                  {images.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.indicator,
                        {
                          backgroundColor: index === currentImageIndex
                            ? '#fff'
                            : 'rgba(255, 255, 255, 0.5)'
                        }
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.noImageContainer, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
              <Ionicons name="person" size={100} color="#999" />
            </View>
          )}
        </View>

        {/* 基本情報 */}
        <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
          <Text style={[styles.username, { color: Colors[theme].text }]}>
            {profile.username}
            {profile.age && `, ${profile.age}`}
          </Text>
          <View style={styles.tagsContainer}>
            {profile.gender && profile.gender !== '未設定' && (
              <View style={[styles.tag, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
                <Text style={{ color: Colors[theme].text }}>{profile.gender}</Text>
              </View>
            )}
            {profile.location && (
              <View style={[styles.tag, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
                <Text style={{ color: Colors[theme].text }}>{profile.location}</Text>
              </View>
            )}
            {profile.mbti && profile.mbti !== '未受験' && (
              <View style={[styles.tag, { backgroundColor: Colors[theme].primary }]}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>{profile.mbti}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 自己紹介 */}
        {profile.bio && (
          <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: Colors[theme].primary }]}>自己紹介</Text>
            <Text style={[styles.sectionText, { color: Colors[theme].text }]}>{profile.bio}</Text>
          </View>
        )}

        {/* 趣味・特技 */}
        {profile.hobbies && (
          <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: Colors[theme].primary }]}>趣味・特技</Text>
            <Text style={[styles.sectionText, { color: Colors[theme].text }]}>{profile.hobbies}</Text>
          </View>
        )}

        {/* 目的 */}
        {(profile.seeking_type || profile.seeking_detail) && (
          <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: Colors[theme].primary }]}>目的</Text>
            {profile.seeking_type && (
              <View style={[styles.badge, { backgroundColor: Colors[theme].primary }]}>
                <Text style={styles.badgeText}>{profile.seeking_type}</Text>
              </View>
            )}
            {profile.seeking_detail && (
              <Text style={[styles.sectionText, { color: Colors[theme].text, marginTop: 8 }]}>
                {profile.seeking_detail}
              </Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* アクションボタン */}
      <View style={[styles.footer, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
        {renderActionButtons()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backIconButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  likeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  likeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  imageSection: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  imageCarousel: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  section: {
    padding: 16,
    marginTop: 12,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});