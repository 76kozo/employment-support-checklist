# 就労移行支援チェックリスト

就労移行支援における評価システムのWebアプリケーションです。

## 🚀 機能

### 基本機能
- **3カテゴリ評価**: 日常生活、対人関係、行動・態度
- **3者評価**: 本人、スタッフ、家族による多角的評価
- **1-5段階評価**: 詳細なスコア管理
- **サブチェック項目**: 低評価時の詳細確認
- **コメント機能**: 各項目への詳細記録

### 管理機能
- **支援対象者管理**: CRUD操作、生年月日管理
- **評価記録保存**: 履歴管理、編集・削除
- **CSV export**: 3種類のフォーマット
- **一時保存**: 自動保存機能（5分間隔）
- **検索機能**: 名前、ID、障害種別での検索

### AI機能 🤖
- **Gemini AI統合**: Google Generative AI使用
- **総合観察所見**: 評価データに基づく専門的分析
- **支援配慮事項**: カテゴリ別の具体的提案
- **差異分析**: 評価者間の認識差の分析

## 🛠️ セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
`.env` ファイルを作成し、Gemini API キーを設定：
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**Gemini API キーの取得方法:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでログイン
3. 「Create API Key」でキーを生成
4. 生成されたキーを `.env` ファイルに追加

### 3. 開発サーバーの起動
```bash
npm run dev
```

## 🏗️ ビルド
```bash
npm run build
```

## 🧪 リント
```bash
npm run lint
```

## 📊 技術スタック

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI**: Google Generative AI (Gemini)
- **Storage**: LocalStorage

## 🔒 セキュリティ

- **API キー**: 環境変数で管理、`.gitignore`で除外
- **データ保存**: ローカルストレージ（個人情報保護）
- **エラーハンドリング**: AI APIエラー時のフォールバック機能

## 📁 ファイル構成

```
src/
├── EmploymentSupportChecklist.tsx  # メインコンポーネント
├── App.tsx                         # アプリケーションルート
├── main.tsx                       # エントリーポイント
└── assets/                        # 静的ファイル

配設定/
├── .env                          # 環境変数（要設定）
├── vite.config.ts               # Vite設定
├── tailwind.config.js           # Tailwind設定
├── tsconfig.json               # TypeScript設定
└── package.json                # 依存関係
```

## 🚨 注意事項

1. **API キー**: 本番環境では適切なバックエンドAPIを使用してください
2. **データ保存**: 現在はローカルストレージのみ。サーバー連携が推奨
3. **AI機能**: エラー時は自動的にフォールバック機能を使用

## 📝 開発ログ

詳細な開発履歴と技術仕様は `cloud.md` を参照してください。

## 🤝 貢献

バグ報告や機能要望は Issues でお知らせください。

---
*最終更新: 2025-07-21 (Gemini AI統合完了)*