// utils/profileUtils.ts
import { supabase } from '@/services/SupabaseClient';

/**
 * ユーザーのプロフィール画像（1枚目）を取得
 * @param userId ユーザーID
 * @returns 画像URL または null
 */
export const getFirstProfileImage = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('profile_images')
      .select('image_path')
      .eq('user_id', userId)
      .eq('display_order', 1)
      .single();

    if (error || !data) return null;

    const { data: urlData } = supabase.storage
      .from('profile-images')
      .getPublicUrl(data.image_path);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error fetching profile image:', error);
    return null;
  }
};

/**
 * 複数ユーザーのプロフィール画像を一括取得
 * @param userIds ユーザーIDの配列
 * @returns { [userId: string]: string | null } の形式
 */
export const getBatchProfileImages = async (
  userIds: string[]
): Promise<Record<string, string | null>> => {
  if (userIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('profile_images')
      .select('user_id, image_path')
      .in('user_id', userIds)
      .eq('display_order', 1);

    if (error || !data) return {};

    const imageMap: Record<string, string | null> = {};
    
    // 全userIdを初期化（画像がない場合はnull）
    userIds.forEach(id => {
      imageMap[id] = null;
    });

    // 画像があるユーザーのURLを設定
    data.forEach(img => {
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(img.image_path);
      
      imageMap[img.user_id] = urlData.publicUrl;
    });

    return imageMap;
  } catch (error) {
    console.error('Error fetching batch profile images:', error);
    return {};
  }
};