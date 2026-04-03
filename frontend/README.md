# Frontend

## 環境需求

- Node.js 18+
- 手機安裝 Expo Go（iOS / Android）

## 本機啟動

```bash
# 進入前端資料夾
cd frontend

# 安裝套件（第一次需要）
npm install --legacy-peer-deps

# 啟動開發伺服器
npm start
```

啟動後終端機會顯示 QR Code，用手機 Expo Go 掃描即可預覽。
手機和電腦需在同一個 Wi-Fi 網路下。

## 專案結構

```
frontend/
├── App.tsx
├── index.ts
├── app.json
└── src/
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

## Deploy (Web -> S3 + CloudFront)

Make sure the backend infrastructure is already deployed (Terraform apply) before deploying the frontend.

Before running the deploy script, export your AWS profile:

```bash
export AWS_PROFILE=your-profile-name
```

Then run:

```bash
./scripts/deploy-frontend.sh
```
