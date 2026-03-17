## 環境需求

- Node.js 18+
- 手機安裝 [Expo Go](https://expo.dev/go)（iOS / Android 皆可）

## 啟動步驟

```bash
# 1. 進入專案資料夾
cd guardcircle-app\frontend

# 2. 安裝套件（第一次需要）
npm install --legacy-peer-deps

# 3. 啟動開發伺服器
npx expo start --clear
```

啟動後終端機會顯示 QR Code，用手機 Expo Go 掃描即可預覽。

## 專案結構

```
src/
├── screens/        # 所有頁面
│   ├── auth/       # 登入、角色選擇、加入家庭圈
│   ├── detect/     # 偵測流程（輸入、分析、結果）
│   ├── family/     # 家庭圈相關頁面
│   └── settings/   # 設定子頁面
├── components/     # 共用元件（Button、Card、Banner 等）
├── navigation/     # 導航設定
├── store/          # Zustand 狀態管理
├── mock/           # Mock 資料
├── theme/          # 顏色、字體、間距設定
└── types/          # TypeScript 型別定義
```
