import AppButton from '@/components/AppButton';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/services/SupabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MBTI_OPTIONS = [
  '未受験', 'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
];

const SEEKING_OPTIONS = ['恋愛', '友達', '趣味仲間', 'ビジネス', 'その他'];

type ProfileImage = {
  id: string;
  image_url?: string;
  image_path?: string;
  display_order: number;
  url?: string;
};

export default function ProfileScreen() {
  const theme = useColorScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [mbti, setMbti] = useState('未受験');
  const [seekingType, setSeekingType] = useState('');
  const [seekingDetail, setSeekingDetail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('未設定');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<ProfileImage[]>([]);
  
  const [showMbtiPicker, setShowMbtiPicker] = useState(false);
  const [showSeekingPicker, setShowSeekingPicker] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user) throw new Error('ユーザー情報を取得できませんでした');

      setUserId(user.id);

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

      const { data: imageData } = await supabase
        .from('profile_images')
        .select('*')
        .eq('user_id', user.id)
        .order('display_order', { ascending: true });

      if (imageData) {
        const imagesWithUrls = imageData.map(img => ({
          ...img,
          url: img.image_url || supabase.storage.from('profile-images').getPublicUrl(img.image_path || '').data.publicUrl
        }));
        setImages(imagesWithUrls);
      }

    } catch (err: any) {
      Alert.alert('エラー', err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (order: number) => {
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

      if (!result.canceled && userId) {
        console.log('Image picker result:', result);
        await uploadImage(result.assets[0].uri, order);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('エラー', '画像の選択に失敗しました: ' + error.message);
    }
  };

  const uploadImage = async (uri: string, order: number) => {
    try {
      if (!userId) return;

      console.log('Starting image upload:', { uri, order, userId });

      // ファイル拡張子を取得
      let fileExt = 'jpg';
      if (uri.includes('.')) {
        const uriExt = uri.split('.').pop()?.toLowerCase();
        if (uriExt && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(uriExt)) {
          fileExt = uriExt;
        }
      }

      const fileName = `${userId}/${order}.${fileExt}`;
      console.log('Uploading to:', fileName);

      // 既存の画像を削除
      const existingImage = images.find(img => img.display_order === order);
      if (existingImage) {
        console.log('Deleting existing image');
        
        if (existingImage.image_url) {
          const url = existingImage.image_url;
          const match = url.match(/profile-images\/(.+)/);
          if (match && match[1]) {
            await supabase.storage
              .from('profile-images')
              .remove([match[1]]);
          }
        }

        await supabase
          .from('profile_images')
          .delete()
          .eq('user_id', userId)
          .eq('display_order', order);
      }

      // プラットフォームに応じた処理
      let uploadData, uploadError;

      if (Platform.OS === 'web') {
        // Web版: Blobを使用
        console.log('Using Blob upload for web');
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const result = await supabase.storage
          .from('profile-images')
          .upload(fileName, blob, { 
            upsert: true,
            contentType: `image/${fileExt}`
          });
        
        uploadData = result.data;
        uploadError = result.error;
      } else {
        // React Native (iOS/Android): FormDataを使用
        console.log('Using FormData upload for mobile');
        
        const formData = new FormData();
        formData.append('file', {
          uri: uri,
          type: `image/${fileExt}`,
          name: `${order}.${fileExt}`,
        } as any);

        const result = await supabase.storage
          .from('profile-images')
          .upload(fileName, formData, { 
            upsert: true,
            contentType: `image/${fileExt}`
          });
        
        uploadData = result.data;
        uploadError = result.error;
      }

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // 公開URLを取得
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      console.log('Public URL:', urlData.publicUrl);

      // DBに保存
      const { error: dbError } = await supabase
        .from('profile_images')
        .insert([{
          user_id: userId,
          image_url: urlData.publicUrl,
          display_order: order,
        }]);

      if (dbError) {
        console.error('DB insert error:', dbError);
        throw dbError;
      }

      console.log('DB insert successful');

      await fetchProfile();
      
      setToastMessage('画像をアップロードしました');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

    } catch (err: any) {
      console.error('Upload error details:', err);
      setToastMessage(`エラー: ${err.message}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  };

  const deleteImage = async (imageId: string, order: number) => {
    try {
      if (!userId) return;

      console.log('Delete image called:', imageId, order);

      // プラットフォームに応じた確認ダイアログ
      let confirmed = false;
      
      if (Platform.OS === 'web') {
        confirmed = window.confirm('本当に削除しますか？');
      } else {
        confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '画像を削除',
            '本当に削除しますか？',
            [
              { text: 'キャンセル', onPress: () => resolve(false), style: 'cancel' },
              { text: '削除', onPress: () => resolve(true), style: 'destructive' }
            ]
          );
        });
      }
      
      if (!confirmed) {
        console.log('Delete cancelled by user');
        return;
      }

      console.log('Delete confirmed, proceeding...');

      const image = images.find(img => img.id === imageId);
      console.log('Deleting image:', image);

      if (image) {
        let pathToDelete = '';
        if (image.image_url) {
          const url = image.image_url;
          const match = url.match(/profile-images\/(.+)/);
          if (match && match[1]) {
            pathToDelete = match[1];
            console.log('Extracted path from URL:', pathToDelete);
          }
        } else if (image.image_path) {
          pathToDelete = image.image_path;
          console.log('Using image_path:', pathToDelete);
        }

        if (pathToDelete) {
          console.log('Deleting from storage:', pathToDelete);
          const { error: storageError } = await supabase.storage
            .from('profile-images')
            .remove([pathToDelete]);

          if (storageError) {
            console.error('Storage delete error:', storageError);
          }
        }
      }

      console.log('Deleting from DB, imageId:', imageId);
      const { error: dbError } = await supabase
        .from('profile_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('DB delete error:', dbError);
        throw dbError;
      }

      console.log('Delete successful');
      await fetchProfile();
      
      setToastMessage('画像を削除しました');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

    } catch (err: any) {
      console.error('Delete error:', err);
      setToastMessage(`削除エラー: ${err.message}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
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

      setToastMessage('プロフィールを更新しました');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
    } catch (err: any) {
      setToastMessage(`エラー: ${err.message}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
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
    <>
      <ScrollView 
        style={[styles.container, { backgroundColor: Colors[theme].background }]}
        contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: 16, paddingBottom: 40 }}
      >
        {/* プロフィール画像セクション */}
        <View style={[styles.section, { borderBottomColor: theme === 'dark' ? '#333' : '#eee' }]}>
          <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>プロフィール画像</Text>
          <Text style={[styles.helperText, { color: '#999' }]}>最大5枚まで登録できます</Text>
          
          <View style={styles.imageGrid}>
            {[1, 2, 3, 4, 5].map((order) => {
              const image = images.find(img => img.display_order === order);
              return (
                <View key={order} style={styles.imageSlot}>
                  {image ? (
                    <View style={styles.imageWrapper}>
                      <Image 
                        source={{ uri: image.url }} 
                        style={styles.uploadedImage}
                        resizeMode="cover"
                      />
                      <Pressable
                        style={styles.deleteButton}
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          console.log('Delete button pressed for image:', image.id);
                          deleteImage(image.id, order);
                        }}
                      >
                        <Ionicons name="close-circle" size={28} color="#ff3b30" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.imagePlaceholder, { backgroundColor: theme === 'dark' ? '#2a2a2a' : '#e0e0e0' }]}
                      onPress={() => pickImage(order)}
                    >
                      <Ionicons name="add" size={32} color="#999" />
                      <Text style={styles.imagePlaceholderText}>{order}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>

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
            <ScrollView style={[
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
            </ScrollView>
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
          />
        </View>

        <AppButton title="更新" onPress={handleUpdate} />
        
        <View style={styles.logoutContainer}>
          <AppButton title="ログアウト" onPress={handleLogout} />
        </View>
      </ScrollView>
      
      {showToast && (
        <View style={[
          styles.toast,
          { 
            top: insets.top + 10,
            backgroundColor: toastMessage.includes('エラー') ? '#ff3b30' : Colors[theme].primary 
          }
        ]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  helperText: {
    fontSize: 12,
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageSlot: {
    width: '31%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',  
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});