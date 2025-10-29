import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  profileImageUrl?: string | null;
};

export default function DiscoverScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [newUsers, setNewUsers] = useState<Profile[]>([]);
  const [receivedLikes, setReceivedLikes] = useState<Profile[]>([]);
  const [sentLikes, setSentLikes] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'discover' | 'received' | 'sent' | 'matched'>('discover');

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAllData();
    }
  }, [userId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUserId(data.user?.id ?? null);
  };

  const fetchProfileImage = async (targetUserId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('profile_images')
        .select('image_url')  // image_pathではなくimage_url
        .eq('user_id', targetUserId)
        .order('display_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile image:', error);
        return null;
      }

      return data?.image_url || null;  // 既にURLなのでそのまま返す
    } catch (error) {
      console.error('Error fetching profile image:', error);
      return null;
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchNewUsers(),
      fetchReceivedLikes(),
      fetchSentLikes(),
      fetchMatches()
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAllData();
  }, [userId]);

  const fetchNewUsers = async () => {
    if (!userId) return;

    try {
      const { data: myLikes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userId);

      const excludedIds = myLikes?.map(like => like.to_user_id) || [];

      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', userId);

      if (excludedIds.length > 0) {
        query = query.not('id', 'in', `(${excludedIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const usersWithImages = await Promise.all(
        (data || []).map(async (user) => ({
          ...user,
          profileImageUrl: await fetchProfileImage(user.id)
        }))
      );

      setNewUsers(usersWithImages);
      setCurrentIndex(0);
    } catch (err: any) {
      console.error('新規ユーザー取得エラー:', err.message);
    }
  };

  const fetchReceivedLikes = async () => {
    if (!userId) return;

    try {
      const { data: likes } = await supabase
        .from('likes')
        .select('from_user_id')
        .eq('to_user_id', userId);

      const likeUserIds = likes?.map(l => l.from_user_id) || [];

      if (likeUserIds.length === 0) {
        setReceivedLikes([]);
        return;
      }

      const { data: myLikes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userId)
        .in('to_user_id', likeUserIds);

      const mutualIds = myLikes?.map(l => l.to_user_id) || [];
      const unmatchedIds = likeUserIds.filter(id => !mutualIds.includes(id));

      if (unmatchedIds.length === 0) {
        setReceivedLikes([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', unmatchedIds);

      const profilesWithImages = await Promise.all(
        (profiles || []).map(async (user) => ({
          ...user,
          profileImageUrl: await fetchProfileImage(user.id)
        }))
      );

      setReceivedLikes(profilesWithImages);
    } catch (err: any) {
      console.error('受信いいね取得エラー:', err.message);
    }
  };

  const fetchSentLikes = async () => {
    if (!userId) return;

    try {
      const { data: likes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userId);

      const likeUserIds = likes?.map(l => l.to_user_id) || [];

      if (likeUserIds.length === 0) {
        setSentLikes([]);
        return;
      }

      const { data: theirLikes } = await supabase
        .from('likes')
        .select('from_user_id')
        .eq('to_user_id', userId)
        .in('from_user_id', likeUserIds);

      const mutualIds = theirLikes?.map(l => l.from_user_id) || [];
      const unmatchedIds = likeUserIds.filter(id => !mutualIds.includes(id));

      if (unmatchedIds.length === 0) {
        setSentLikes([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', unmatchedIds);

      const profilesWithImages = await Promise.all(
        (profiles || []).map(async (user) => ({
          ...user,
          profileImageUrl: await fetchProfileImage(user.id)
        }))
      );

      setSentLikes(profilesWithImages);
    } catch (err: any) {
      console.error('送信いいね取得エラー:', err.message);
    }
  };

  const fetchMatches = async () => {
    if (!userId) return;

    try {
      const { data: myLikes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', userId);

      const myLikeIds = myLikes?.map(l => l.to_user_id) || [];

      if (myLikeIds.length === 0) {
        setMatches([]);
        return;
      }

      const { data: theirLikes } = await supabase
        .from('likes')
        .select('from_user_id')
        .eq('to_user_id', userId)
        .in('from_user_id', myLikeIds);

      const matchedIds = theirLikes?.map(l => l.from_user_id) || [];

      if (matchedIds.length === 0) {
        setMatches([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', matchedIds);

      const profilesWithImages = await Promise.all(
        (profiles || []).map(async (user) => ({
          ...user,
          profileImageUrl: await fetchProfileImage(user.id)
        }))
      );

      setMatches(profilesWithImages);
    } catch (err: any) {
      console.error('マッチ取得エラー:', err.message);
    }
  };

  const handleLike = async (targetUserId?: string) => {
    console.log('👍 handleLike called', { userId, targetUserId, currentIndex });
    
    if (!userId) {
      console.log('❌ userId is null');
      return;
    }

    const targetId = targetUserId || newUsers[currentIndex]?.id;
    console.log('🎯 Target ID:', targetId);
    
    if (!targetId) {
      console.log('❌ targetId is null');
      return;
    }

    try {
      console.log('📤 Sending like...');
      const { error } = await supabase
        .from('likes')
        .insert([{ from_user_id: userId, to_user_id: targetId }]);

      if (error) {
        console.log('❌ Insert error:', error);
        throw error;
      }

      console.log('✅ Like inserted successfully');

      const { data: mutualLike } = await supabase
        .from('likes')
        .select('*')
        .eq('from_user_id', targetId)
        .eq('to_user_id', userId)
        .single();

      console.log('🔍 Match result:', mutualLike);

      const targetUser = newUsers.find(u => u.id === targetId) || 
                         receivedLikes.find(u => u.id === targetId);

      if (mutualLike && targetUser) {
        console.log('🎉 Match found!');
        Alert.alert('マッチング成立', `${targetUser.username}さんとマッチングしました`);
      }

      console.log('🔄 Fetching updated data...');
      await fetchAllData();
      console.log('✅ Data refreshed');

    } catch (err: any) {
      console.log('❌ Error in handleLike:', err);
      Alert.alert('エラー', err.message);
    }
  };

  const handlePass = async (targetUserId?: string, isFromReceived: boolean = false) => {
    const targetId = targetUserId || newUsers[currentIndex]?.id;
    if (!targetId || !userId) return;

    if (isFromReceived) {
      try {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('from_user_id', targetId)
          .eq('to_user_id', userId);

        if (error) throw error;

        await fetchAllData();
      } catch (err: any) {
        Alert.alert('エラー', err.message);
      }
    } else {
      setNewUsers(prev => prev.filter(u => u.id !== targetId));
    }
  };

  const handleCancelLike = async (targetUserId: string) => {
    if (!userId) return;

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
              const { error } = await supabase
                .from('likes')
                .delete()
                .eq('from_user_id', userId)
                .eq('to_user_id', targetUserId);

              if (error) throw error;

              await fetchAllData();
              Alert.alert('完了', 'いいねを取り消しました');
            } catch (err: any) {
              Alert.alert('エラー', err.message);
            }
          }
        }
      ]
    );
  };

  const handleOpenProfile = (profile: Profile) => {
    router.push(`/profile/${profile.id}` as any);
  };

  const handleOpenChat = (targetUserId: string) => {
    router.push(`/(tabs)/chat/${targetUserId}` as any);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContainer, { backgroundColor: Colors[theme].background }]}>
        <Text style={{ color: Colors[theme].text }}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* タブ */}
      <View style={[styles.tabContainer, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff', paddingTop: insets.top }]}>
        <Pressable
          style={[styles.tab, activeTab === 'discover' && { borderBottomColor: Colors[theme].primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('discover')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'discover' ? Colors[theme].primary : '#999' }]}>
            発見
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'received' && { borderBottomColor: Colors[theme].primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('received')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'received' ? Colors[theme].primary : '#999' }]}>
            いいね(受) ({receivedLikes.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'sent' && { borderBottomColor: Colors[theme].primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('sent')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'sent' ? Colors[theme].primary : '#999' }]}>
            いいね(送) ({sentLikes.length})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'matched' && { borderBottomColor: Colors[theme].primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveTab('matched')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'matched' ? Colors[theme].primary : '#999' }]}>
            マッチ ({matches.length})
          </Text>
        </Pressable>
      </View>

      {/* コンテンツ */}
      {activeTab === 'discover' && (
        currentIndex >= newUsers.length ? (
          <View style={styles.centerContainer}>
            <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
              表示できるユーザーがいません
            </Text>
            <Pressable
              style={[styles.resetButton, { backgroundColor: Colors[theme].primary }]}
              onPress={() => fetchNewUsers()}
            >
              <Text style={styles.resetButtonText}>更新</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView style={styles.cardContainer}>
              {newUsers[currentIndex].profileImageUrl ? (
                <Image 
                  source={{ uri: newUsers[currentIndex].profileImageUrl }} 
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.imageContainer, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
                  <Ionicons name="person" size={100} color="#999" />
                </View>
              )}

              <View style={[styles.infoContainer, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
                <Text style={[styles.username, { color: Colors[theme].text }]}>
                  {newUsers[currentIndex].username}
                  {newUsers[currentIndex].age && `, ${newUsers[currentIndex].age}`}
                </Text>
                
                {newUsers[currentIndex].location && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#999" />
                    <Text style={[styles.infoText, { color: Colors[theme].text }]}>
                      {newUsers[currentIndex].location}
                    </Text>
                  </View>
                )}

                {newUsers[currentIndex].gender && newUsers[currentIndex].gender !== '未設定' && (
                  <View style={styles.infoRow}>
                    <Ionicons name="male-female" size={16} color="#999" />
                    <Text style={[styles.infoText, { color: Colors[theme].text }]}>
                      {newUsers[currentIndex].gender}
                    </Text>
                  </View>
                )}
              </View>

              {newUsers[currentIndex].bio && (
                <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
                  <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>自己紹介</Text>
                  <Text style={[styles.sectionText, { color: Colors[theme].text }]}>{newUsers[currentIndex].bio}</Text>
                </View>
              )}

              {newUsers[currentIndex].hobbies && (
                <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
                  <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>趣味・特技</Text>
                  <Text style={[styles.sectionText, { color: Colors[theme].text }]}>{newUsers[currentIndex].hobbies}</Text>
                </View>
              )}

              {newUsers[currentIndex].mbti && newUsers[currentIndex].mbti !== '未受験' && (
                <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
                  <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>MBTI</Text>
                  <Text style={[styles.sectionText, { color: Colors[theme].text }]}>{newUsers[currentIndex].mbti}</Text>
                </View>
              )}

              {(newUsers[currentIndex].seeking_type || newUsers[currentIndex].seeking_detail) && (
                <View style={[styles.section, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
                  <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>求めている関係</Text>
                  {newUsers[currentIndex].seeking_type && (
                    <Text style={[styles.badge, { backgroundColor: Colors[theme].primary }]}>
                      {newUsers[currentIndex].seeking_type}
                    </Text>
                  )}
                  {newUsers[currentIndex].seeking_detail && (
                    <Text style={[styles.sectionText, { color: Colors[theme].text, marginTop: 8 }]}>
                      {newUsers[currentIndex].seeking_detail}
                    </Text>
                  )}
                </View>
              )}

              <View style={{ height: 120 }} />
            </ScrollView>

            <View style={[styles.actionContainer, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}>
              <Pressable style={[styles.actionButton, styles.passButton]} onPress={() => handlePass()}>
                <Ionicons name="close" size={32} color="#ff3b30" />
              </Pressable>
              <Pressable style={[styles.actionButton, styles.likeButton]} onPress={() => handleLike()}>
                <Ionicons name="heart" size={32} color="#34c759" />
              </Pressable>
            </View>
          </>
        )
      )}

      {activeTab === 'received' && (
        <FlatList
          data={receivedLikes}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.userCard, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
              onPress={() => handleOpenProfile(item)}
            >
              <Pressable onPress={() => handleOpenProfile(item)}>
                {item.profileImageUrl ? (
                  <View style={styles.avatarWrapper}>
                    <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
                    <View style={styles.likeBadgeSmall}>
                      <Ionicons name="heart" size={12} color="#fff" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.avatarWrapper}>
                    <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
                      <Ionicons name="person" size={40} color="#999" />
                    </View>
                    <View style={styles.likeBadgeSmall}>
                      <Ionicons name="heart" size={12} color="#fff" />
                    </View>
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.userInfo} onPress={() => handleOpenProfile(item)}>
                <Text style={[styles.userName, { color: Colors[theme].text }]}>
                  {item.username}
                  {item.age && `, ${item.age}`}
                </Text>
                {item.location && (
                  <Text style={[styles.userLocation, { color: '#999' }]}>
                    {item.location}
                  </Text>
                )}
              </Pressable>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.smallActionButton, { borderColor: '#ff3b30' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handlePass(item.id, true);
                  }}
                >
                  <Ionicons name="close" size={20} color="#ff3b30" />
                </Pressable>
                <Pressable
                  style={[styles.smallActionButton, { borderColor: '#34c759' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleLike(item.id);
                  }}
                >
                  <Ionicons name="heart" size={20} color="#34c759" />
                </Pressable>
              </View>
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
                まだいいねがありません
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {activeTab === 'sent' && (
        <FlatList
          data={sentLikes}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.userCard, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
              onPress={() => handleOpenProfile(item)}
            >
              <Pressable onPress={() => handleOpenProfile(item)}>
                {item.profileImageUrl ? (
                  <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
                    <Ionicons name="person" size={40} color="#999" />
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.userInfo} onPress={() => handleOpenProfile(item)}>
                <Text style={[styles.userName, { color: Colors[theme].text }]}>
                  {item.username}
                  {item.age && `, ${item.age}`}
                </Text>
                {item.location && (
                  <Text style={[styles.userLocation, { color: '#999' }]}>
                    {item.location}
                  </Text>
                )}
              </Pressable>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: Colors[theme].primary }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleOpenChat(item.id);
                  }}
                >
                  <Ionicons name="chatbubble" size={20} color="#fff" />
                </Pressable>
                <Pressable
                  style={[styles.iconButton, { backgroundColor: '#ff3b30' }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCancelLike(item.id);
                  }}
                >
                  <Ionicons name="heart-dislike" size={20} color="#fff" />
                </Pressable>
              </View>
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
                送信したいいねがありません
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {activeTab === 'matched' && (
        <FlatList
          data={matches}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.userCard, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
              onPress={() => handleOpenProfile(item)}
            >
              <Pressable onPress={() => handleOpenProfile(item)}>
                {item.profileImageUrl ? (
                  <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}>
                    <Ionicons name="person" size={40} color="#999" />
                  </View>
                )}
              </Pressable>
              <Pressable style={styles.userInfo} onPress={() => handleOpenProfile(item)}>
                <Text style={[styles.userName, { color: Colors[theme].text }]}>
                  {item.username}
                  {item.age && `, ${item.age}`}
                </Text>
                {item.location && (
                  <Text style={[styles.userLocation, { color: '#999' }]}>
                    {item.location}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.iconButton, { backgroundColor: Colors[theme].primary }]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleOpenChat(item.id);
                }}
              >
                <Ionicons name="chatbubble" size={20} color="#fff" />
              </Pressable>
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={[styles.emptyText, { color: Colors[theme].text }]}>
                まだマッチングがありません
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardContainer: {
    flex: 1,
    padding: 16,
  },
  profileImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  infoText: { 
    fontSize: 14 
  },
  section: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    gap: 40,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff3b30',
  },
  likeButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#34c759',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  resetButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeBadgeSmall: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ff9500',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  userInfo: { 
    flex: 1 
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userLocation: {
    fontSize: 14,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});