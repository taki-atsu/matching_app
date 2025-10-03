import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

// MBTI選択肢
const MBTI_OPTIONS = [
  '未受験', 'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

// 求めている人の選択肢
const SEEKING_OPTIONS = ['恋愛', '友達', '趣味仲間', 'ビジネス', 'その他'];

export default function ProfileScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [mbti, setMbti] = useState('未受験');
  const [seekingType, setSeekingType] = useState('');
  const [seekingDetail, setSeekingDetail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('未設定');
  const [location, setLocation] = useState('');
  
  const [showMbtiPicker, setShowMbtiPicker] = useState(false);
  const [showSeekingPicker, setShowSeekingPicker] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user) throw new Error('ユーザー情報を取得できませんでした');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      
      if (profile) {
        setUsername(profile.username ?? '');
        setBio(profile.bio ?? '');
        setHobbies(profile.hobbies ?? '');
        setMbti(profile.mbti ?? '未受験');
        setSeekingType(profile.seeking_type ?? '');
        setSeekingDetail(profile.seeking_detail ?? '');
        setAge(profile.age?.toString() ?? '');
        setGender(profile.gender ?? '未設定');
        setLocation(profile.location ?? '');
      }
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user) throw new Error('ユーザー情報が見つかりません');

      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          hobbies,
          mbti,
          seeking_type: seekingType,
          seeking_detail: seekingDetail,
          age: age ? parseInt(age) : null,
          gender,
          location,
        })
        .eq('id', user.id);

      if (error) throw error;

      // 成功時のフィードバック
      Alert.alert('✅ 更新完了', 'プロフィールを更新しました', [
        { text: 'OK' }
      ]);
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (err: any) {
      Alert.alert('エラー', err.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: Colors[theme].background }]}>
        <Text style={{ color: Colors[theme].text }}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* 基本情報セクション */}
      <View style={[styles.section, { borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>基本情報</Text>
        
        <Text style={[styles.label, { color: Colors[theme].text }]}>ユーザー名 *</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          style={[
            styles.input, 
            { 
              color: Colors[theme].text, 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          placeholder="ユーザー名を入力"
          placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
          nativeID="username"
        />

        <Text style={[styles.label, { color: Colors[theme].text }]}>年齢</Text>
        <TextInput
          value={age}
          onChangeText={setAge}
          style={[
            styles.input, 
            { 
              color: Colors[theme].text, 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          placeholder="年齢"
          placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
          keyboardType="numeric"
          nativeID="age"
        />

        <Text style={[styles.label, { color: Colors[theme].text }]}>性別</Text>
        <View style={styles.genderContainer}>
          {['男性', '女性', 'その他', '未設定'].map((option) => (
            <Pressable
              key={option}
              style={[
                styles.genderButton,
                { 
                  borderColor: theme === 'dark' ? '#555' : '#ddd',
                  backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
                },
                gender === option && { 
                  backgroundColor: Colors[theme].primary,
                  borderColor: Colors[theme].primary
                }
              ]}
              onPress={() => setGender(option)}
            >
              <Text style={[
                styles.genderButtonText,
                { color: Colors[theme].text },
                gender === option && { color: '#fff', fontWeight: '600' }
              ]}>
                {option}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: Colors[theme].text }]}>居住地</Text>
        <TextInput
          value={location}
          onChangeText={setLocation}
          style={[
            styles.input, 
            { 
              color: Colors[theme].text, 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          placeholder="例: 東京都"
          placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
          nativeID="location"
        />
      </View>

      {/* 自己紹介セクション */}
      <View style={[styles.section, { borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>自己紹介</Text>
        
        <Text style={[styles.label, { color: Colors[theme].text }]}>自己紹介文</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          style={[
            styles.input, 
            styles.textarea, 
            { 
              color: Colors[theme].text, 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          placeholder="自己紹介を入力してください"
          placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
          multiline
          numberOfLines={4}
          nativeID="bio"
        />

        <Text style={[styles.label, { color: Colors[theme].text }]}>趣味・特技</Text>
        <TextInput
          value={hobbies}
          onChangeText={setHobbies}
          style={[
            styles.input, 
            styles.textarea, 
            { 
              color: Colors[theme].text, 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          placeholder="趣味や特技を詳しく書いてください"
          placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
          multiline
          numberOfLines={4}
          nativeID="hobbies"
        />
      </View>

      {/* MBTI セクション */}
      <View style={[styles.section, { borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>性格診断</Text>
        
        <Text style={[styles.label, { color: Colors[theme].text }]}>MBTI</Text>
        <Pressable
          style={[
            styles.picker, 
            { 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          onPress={() => setShowMbtiPicker(!showMbtiPicker)}
        >
          <Text style={{ color: Colors[theme].text }}>{mbti || '選択してください'}</Text>
          <Text style={{ color: '#999' }}>▼</Text>
        </Pressable>
        
        {showMbtiPicker && (
          <View style={[
            styles.optionsContainer, 
            { 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}>
            {MBTI_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.option,
                  { borderBottomColor: theme === 'dark' ? '#444' : '#f0f0f0' },
                  mbti === option && { 
                    backgroundColor: theme === 'dark' ? '#3a3a3a' : '#e6f2ff' 
                  }
                ]}
                onPress={() => {
                  setMbti(option);
                  setShowMbtiPicker(false);
                }}
              >
                <Text style={{ color: Colors[theme].text }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* 求めている関係セクション */}
      <View style={[styles.section, { borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
        <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>求めている関係</Text>
        
        <Text style={[styles.label, { color: Colors[theme].text }]}>目的</Text>
        <Pressable
          style={[
            styles.picker, 
            { 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          onPress={() => setShowSeekingPicker(!showSeekingPicker)}
        >
          <Text style={{ color: Colors[theme].text }}>{seekingType || '選択してください'}</Text>
          <Text style={{ color: '#999' }}>▼</Text>
        </Pressable>
        
        {showSeekingPicker && (
          <View style={[
            styles.optionsContainer, 
            { 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}>
            {SEEKING_OPTIONS.map((option) => (
              <Pressable
                key={option}
                style={[
                  styles.option,
                  { borderBottomColor: theme === 'dark' ? '#444' : '#f0f0f0' },
                  seekingType === option && { 
                    backgroundColor: theme === 'dark' ? '#3a3a3a' : '#e6f2ff' 
                  }
                ]}
                onPress={() => {
                  setSeekingType(option);
                  setShowSeekingPicker(false);
                }}
              >
                <Text style={{ color: Colors[theme].text }}>{option}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[styles.label, { color: Colors[theme].text }]}>詳細</Text>
        <TextInput
          value={seekingDetail}
          onChangeText={setSeekingDetail}
          style={[
            styles.input, 
            styles.textarea, 
            { 
              color: Colors[theme].text, 
              borderColor: theme === 'dark' ? '#555' : '#ccc',
              backgroundColor: theme === 'dark' ? '#2a2a2a' : '#fff'
            }
          ]}
          placeholder="どんな人と出会いたいか詳しく書いてください"
          placeholderTextColor={theme === 'dark' ? '#888' : '#999'}
          multiline
          numberOfLines={3}
          nativeID="seekingDetail"
        />
      </View>

      <AppButton title="更新" onPress={handleUpdate} />
      
      <View style={styles.logoutContainer}>
        <AppButton title="ログアウト" onPress={handleLogout} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  genderButtonText: {
    fontSize: 14,
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
  },
  optionsContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 6,
    maxHeight: 200,
  },
  option: {
    padding: 12,
    borderBottomWidth: 1,
  },
  logoutContainer: { marginTop: 32 },
});