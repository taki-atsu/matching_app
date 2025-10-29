# マッチングアプリ 💕

React Native (Expo) + Supabase で構築された、フル機能のマッチングアプリケーションです。

## 📱 スクリーンショット

<!-- ここにスクリーンショットを追加してください -->

## ✨ 主な機能

### 認証機能
- ✅ メール認証による新規登録
- ✅ ログイン・ログアウト
- ✅ セッション管理（モバイル・Web対応）

### プロフィール機能
- ✅ 基本情報（ユーザー名、年齢、性別、居住地）
- ✅ 自己紹介文、趣味・特技
- ✅ MBTI性格診断
- ✅ 求めている関係（恋愛、友達、趣味仲間など）
- ✅ プロフィール画像（最大5枚）のアップロード
- ✅ モバイル・Web両対応の画像アップロード

### マッチング機能
- ✅ 新規ユーザーの発見（カード形式）
- ✅ いいね・パス機能
- ✅ いいね受信・送信の管理
- ✅ 双方向いいねでマッチング成立
- ✅ いいねのキャンセル機能

### チャット機能
- ✅ リアルタイムメッセージング（Supabase Realtime）
- ✅ 未読管理・既読機能
- ✅ 画像送信機能
- ✅ マッチ済み・未マッチのタブ分け
- ✅ チャット一覧（最終メッセージ表示）

### UI/UX
- ✅ ダークモード完全対応
- ✅ タブナビゲーション（4タブ）
- ✅ プロフィール画像カルーセル
- ✅ Pull to Refresh
- ✅ ステータスバー対応

## 🛠️ 技術スタック

### フロントエンド
- **React Native** - モバイルアプリフレームワーク
- **Expo** (SDK 54) - React Nativeツールチェーン
- **Expo Router** - ファイルベースルーティング
- **TypeScript** - 型安全性

### バックエンド
- **Supabase** - バックエンドサービス
  - Authentication（認証）
  - PostgreSQL Database（データベース）
  - Storage（画像保存）
  - Realtime（リアルタイム通信）

### 主要ライブラリ
- `@supabase/supabase-js` - Supabaseクライアント
- `expo-image-picker` - 画像選択
- `@react-native-async-storage/async-storage` - ローカルストレージ
- `react-native-safe-area-context` - Safe Area対応

## 📋 前提条件

- Node.js 18以上
- npm または yarn
- Expo CLI
- Supabaseアカウント

## 🚀 セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/matching-app.git
cd matching-app/my-matching-app
```

### 2. 依存関係をインストール

```bash
npm install --legacy-peer-deps
```

### 3. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard) でプロジェクトを作成
2. Project Settings → API から以下を取得:
   - Project URL
   - anon public key

### 4. 環境変数の設定

`.env` ファイルを作成:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. データベーススキーマの作成

Supabase SQL Editorで以下のSQLを実行:

```sql
-- profilesテーブル
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT,
  bio TEXT,
  hobbies TEXT,
  mbti TEXT,
  seeking_type TEXT,
  seeking_detail TEXT,
  age INTEGER,
  gender TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- profile_imagesテーブル
CREATE TABLE profile_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- likesテーブル
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

-- matchesテーブル
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- chatsテーブル
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_matched BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- messagesテーブル
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_likes_from_user ON likes(from_user_id);
CREATE INDEX idx_likes_to_user ON likes(to_user_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_profile_images_user ON profile_images(user_id);
```

### 6. RLS（Row Level Security）の設定

```sql
-- profiles: 全員が読める、自分のみ更新可能
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- profile_images: 全員が読める、自分のみ更新可能
ALTER TABLE profile_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profile images are viewable by everyone"
ON profile_images FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can insert own profile images"
ON profile_images FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile images"
ON profile_images FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- likes: 認証ユーザーのみ操作可能
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes"
ON likes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert likes"
ON likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete own likes"
ON likes FOR DELETE
TO authenticated
USING (auth.uid() = from_user_id);

-- chats: 関連ユーザーのみアクセス可能
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chats"
ON chats FOR SELECT
TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create chats"
ON chats FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- messages: チャット参加者のみアクセス可能
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own chats"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can insert messages in own chats"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_id
    AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can update own messages"
ON messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = messages.chat_id
    AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
  )
);
```

### 7. Storageバケットの作成

Supabase Dashboard → Storage:

1. **profile-images** バケット作成
   - Public: ✅ ON
   
2. **chat-images** バケット作成
   - Public: ✅ ON

#### Storage RLS設定

```sql
-- profile-imagesバケット
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images');

-- chat-imagesバケット
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');
```

### 8. アプリを起動

```bash
# Web
npm run web

# Android
npm run android

# iOS
npm run ios
```

## 📱 対応プラットフォーム

- ✅ Web (ブラウザ)
- ✅ Android
- ✅ iOS

## 📂 プロジェクト構造

```
my-matching-app/
├── app/                        # アプリケーション（Expo Router）
│   ├── (auth)/                # 認証画面
│   │   ├── login.tsx          # ログイン
│   │   └── register.tsx       # 新規登録
│   ├── (tabs)/                # タブナビゲーション
│   │   ├── index.tsx          # ホーム画面
│   │   ├── discover.tsx       # 発見画面
│   │   ├── profile.tsx        # プロフィール編集
│   │   └── chat/              # チャット関連
│   │       ├── index.tsx      # チャット一覧
│   │       └── [chatId].tsx   # 個人チャット
│   ├── profile/               # プロフィール閲覧
│   │   └── [userId].tsx       # ユーザープロフィール
│   ├── _layout.tsx            # ルートレイアウト
│   └── index.tsx              # エントリーポイント
├── components/                # 再利用可能コンポーネント
├── constants/                 # 定数（カラーテーマなど）
├── hooks/                     # カスタムフック
├── services/                  # 外部サービス連携
│   ├── SupabaseClient.ts     # Supabase初期化
│   └── AuthService.ts        # 認証サービス
└── .env                       # 環境変数
```

## 🎨 カラーテーマ

アプリは完全なダークモード対応で、システム設定に応じて自動的に切り替わります。

- **ライトモード**: 明るく清潔感のあるデザイン
- **ダークモード**: 目に優しい暗めのデザイン

## 🔐 セキュリティ

- Supabase Authentication による安全な認証
- Row Level Security (RLS) によるデータアクセス制御
- 環境変数による機密情報の管理
- セッションの暗号化保存

## 🐛 トラブルシューティング

### 依存関係のエラー

```bash
npm install --legacy-peer-deps
```

### AsyncStorageのエラー

```bash
npx expo install @react-native-async-storage/async-storage
```

### 画像アップロードのエラー

- Storageバケットが作成されているか確認
- Public設定がONになっているか確認
- RLSポリシーが正しく設定されているか確認

## 📄 ライセンス

MIT License

## 👥 作成者

Atsuto Takishita

## 🙏 謝辞

- [Supabase](https://supabase.com/) - バックエンドサービス
- [Expo](https://expo.dev/) - React Nativeフレームワーク
- [React Native](https://reactnative.dev/) - モバイルアプリフレームワーク
