// controllers/authController.ts
// 今は仮の処理。後でSupabaseと接続する。

export async function registerUser(email: string, password: string) {
  console.log("登録処理:", email, password);
  return { user: { email } };
}

export async function loginUser(email: string, password: string) {
  console.log("ログイン処理:", email, password);
  return { user: { email } };
}
