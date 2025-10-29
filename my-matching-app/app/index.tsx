import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const theme = useColorScheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebug = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const checkUser = async () => {
      try {
        addDebug('Starting auth check...');
        
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          addDebug(`Error: ${error.message}`);
          addDebug(`Error name: ${error.name}`);
          addDebug(`Error stack: ${error.stack?.substring(0, 200)}`);
          throw error;
        }

        addDebug(`User data: ${data.user ? 'Logged in' : 'Not logged in'}`);

        if (data.user) {
          addDebug('Navigating to /(tabs)');
          
          // ログイン済み → ホーム画面（履歴リセット）
          while (router.canGoBack()) {
            router.back();
          }
          router.replace('/(tabs)');
        } else {
          addDebug('Navigating to /(auth)/login');
          
          // 未ログイン → ログイン画面
          router.replace('/(auth)/login');
        }        
      } catch (err: any) {
        addDebug(`CATCH Error: ${err?.message || 'Unknown error'}`);
        addDebug(`Error type: ${err?.constructor?.name || 'Unknown'}`);
        addDebug(`Full error: ${JSON.stringify(err, null, 2).substring(0, 500)}`);
        
        // エラーが出ても5秒後にログイン画面に遷移
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 5000);
      } finally {
        setLoading(false);
      }
    };

    void checkUser();
  }, []);

  // デバッグ情報を表示（開発中のみ）
  if (__DEV__ && debugInfo.length > 0) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
        <Text style={[styles.debugTitle, { color: Colors[theme].text }]}>
          Debug Info (Dev Mode)
        </Text>
        <ScrollView style={styles.debugScroll}>
          {debugInfo.map((info, index) => (
            <Text key={index} style={[styles.debugText, { color: Colors[theme].text }]}>
              {info}
            </Text>
          ))}
        </ScrollView>
        {loading && (
          <ActivityIndicator size="large" color={Colors[theme].primary} style={styles.loader} />
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
        <ActivityIndicator size="large" color={Colors[theme].primary} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  debugScroll: {
    flex: 1,
    width: '100%',
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
  },
  loader: {
    marginTop: 20,
  },
});