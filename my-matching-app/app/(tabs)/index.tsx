import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

type Stats = {
  receivedLikes: number;
  unreadChats: number;
  newMatches: number;
};

export default function AppHomeScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ receivedLikes: 0, unreadChats: 0, newMatches: 0 });
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [lastLoginTime, setLastLoginTime] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    initializeHome();
  }, []);

  const initializeHome = async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data.user?.id ?? null;
    setUserId(uid);

    if (uid) {
      // 最終ログイン時刻を取得・更新
      const storedLastLogin = localStorage.getItem(`last_login_${uid}`);
      setLastLoginTime(storedLastLogin);
      localStorage.setItem(`last_login_${uid}`, new Date().toISOString());

      await fetchStats(uid, storedLastLogin);
      await fetchUsername(uid);
    }
  };

  const fetchUsername = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', uid)
      .single();

    setUsername(data?.username || 'ユーザー');
  };

  const fetchStats = async (uid: string, lastLogin: string | null) => {
    try {
      // 1. いいねをくれた人（未マッチ）の数
      const { data: receivedLikesData } = await supabase
        .from('likes')
        .select('from_user_id')
        .eq('to_user_id', uid);

      const receivedIds = receivedLikesData?.map(l => l.from_user_id) || [];

      const { data: myLikes } = await supabase
        .from('likes')
        .select('to_user_id')
        .eq('from_user_id', uid)
        .in('to_user_id', receivedIds);

      const mutualIds = myLikes?.map(l => l.to_user_id) || [];
      const unmatchedReceivedCount = receivedIds.filter(id => !mutualIds.includes(id)).length;

      // 2. 未返信チャットの数
      const { data: chats } = await supabase
        .from('chats')
        .select('id')
        .or(`user1_id.eq.${uid},user2_id.eq.${uid}`);

      const chatIds = chats?.map(c => c.id) || [];

      let unreadCount = 0;
      if (chatIds.length > 0) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('chat_id', chatIds)
          .eq('is_read', false)
          .neq('sender_id', uid);

        unreadCount = count || 0;
      }

      // 3. 最終ログイン以降の新規マッチ数
      let newMatchesCount = 0;
      if (lastLogin) {
        const { data: recentLikes } = await supabase
          .from('likes')
          .select('from_user_id, created_at')
          .eq('to_user_id', uid)
          .gte('created_at', lastLogin);

        const recentIds = recentLikes?.map(l => l.from_user_id) || [];

        if (recentIds.length > 0) {
          const { data: recentMyLikes } = await supabase
            .from('likes')
            .select('to_user_id')
            .eq('from_user_id', uid)
            .in('to_user_id', recentIds);

          newMatchesCount = recentMyLikes?.length || 0;
        }
      }

      setStats({
        receivedLikes: unmatchedReceivedCount,
        unreadChats: unreadCount,
        newMatches: newMatchesCount,
      });
    } catch (err: any) {
      console.error('統計取得エラー:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (userId) {
      await fetchStats(userId, lastLoginTime);
    }
  };

  const StatCard = ({ 
    icon, 
    label, 
    count, 
    color, 
    onPress 
  }: { 
    icon: string; 
    label: string; 
    count: number; 
    color: string; 
    onPress: () => void;
  }) => (
    <Pressable 
      style={[styles.statCard, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={32} color={color} />
      </View>
      <Text style={[styles.statCount, { color: Colors[theme].text }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: '#999' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: Colors[theme].background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: Colors[theme].text }]}>
          ようこそ、{username}さん
        </Text>
        <Text style={[styles.subGreeting, { color: '#999' }]}>
          今日も素敵な出会いがありますように
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <StatCard
          icon="heart"
          label="いいねをくれた人"
          count={stats.receivedLikes}
          color="#ff3b30"
          onPress={() => router.push('/(tabs)/discover')}
        />
        <StatCard
          icon="chatbubble"
          label="未読チャット"
          count={stats.unreadChats}
          color="#007AFF"
          onPress={() => router.push('/(tabs)/chat')}
        />
        <StatCard
          icon="people"
          label="新規マッチ"
          count={stats.newMatches}
          color="#34c759"
          onPress={() => router.push('/(tabs)/discover')}
        />
      </View>

      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>クイックアクション</Text>
        
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
          onPress={() => router.push('/(tabs)/discover')}
        >
          <Ionicons name="search" size={24} color={Colors[theme].primary} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: Colors[theme].text }]}>新しい人を探す</Text>
            <Text style={[styles.actionSubtitle, { color: '#999' }]}>発見タブで新しい出会いを見つけよう</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
          onPress={() => router.push('/(tabs)/chat')}
        >
          <Ionicons name="chatbubbles" size={24} color={Colors[theme].primary} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: Colors[theme].text }]}>チャットを見る</Text>
            <Text style={[styles.actionSubtitle, { color: '#999' }]}>マッチした人とメッセージを交換しよう</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </Pressable>

        <Pressable
          style={[styles.actionButton, { backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff' }]}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="person" size={24} color={Colors[theme].primary} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: Colors[theme].text }]}>プロフィールを編集</Text>
            <Text style={[styles.actionSubtitle, { color: '#999' }]}>あなたの魅力をアピールしよう</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </Pressable>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  quickActions: {
    padding: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
  },
});