# Implementation Plan: GuardCircle 防詐騙系統

## Overview

本實作計畫將 GuardCircle 設計轉化為可執行的開發任務。系統採用 Go 後端 + TypeScript/React Native 前端架構,使用 AWS Lambda 無伺服器架構,並整合 Sagemaker 與 Bedrock AI 服務。實作順序遵循「基礎設施 → 資料層 → 後端服務 → AI 整合 → 前端應用 → 平台特定功能」的漸進式開發策略。

## Tasks

- [ ] 1. 基礎設施與資料庫設置
  - [ ] 1.1 配置 Terraform 後端狀態管理
    - 創建 S3 bucket 儲存 Terraform state
    - 配置 DynamoDB table 用於 state locking
    - 更新 backend.tf 配置
    - _Requirements: 17.1, 17.2_


  - [ ] 1.2 部署 Aurora PostgreSQL 資料庫
    - 使用 Terraform 創建 Aurora PostgreSQL cluster
    - 配置 VPC、subnet 和 security groups
    - 設定資料庫連線池參數
    - _Requirements: 17.4_

  - [ ] 1.3 實作資料庫 Schema
    - 執行 schema.sql 創建 users, families, scan_events, daily_challenges, challenge_responses 表
    - 創建所有必要的索引
    - 驗證外鍵約束正確設定
    - _Requirements: 1.2, 2.1, 8.1_

  - [ ]* 1.4 撰寫資料庫 Schema 屬性測試
    - **Property 1: 使用者註冊資料持久化**
    - **Validates: Requirements 1.2, 1.4**

  - [ ] 1.5 配置 API Gateway
    - 使用 Terraform 創建 REST API Gateway
    - 配置 CORS 設定
    - 設定 API 速率限制 (60 req/min per user)
    - _Requirements: 17.5_


- [ ] 2. 使用者認證與管理服務
  - [ ] 2.1 實作 users-create Lambda (Go)
    - 創建 Lambda 函數處理 POST /users
    - 實作密碼 bcrypt 雜湊
    - 實作電子郵件格式驗證
    - 實作密碼長度驗證 (≥8 字元)
    - 儲存使用者資料到 Aurora DB
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 16.2_

  - [ ]* 2.2 撰寫 users-create 單元測試
    - 測試成功創建使用者
    - 測試無效電子郵件格式拒絕
    - 測試密碼長度驗證
    - _Requirements: 1.5, 1.6_

  - [ ]* 2.3 撰寫使用者註冊屬性測試
    - **Property 2: 無效電子郵件格式拒絕**
    - **Property 3: 密碼長度驗證**
    - **Validates: Requirements 1.5, 1.6**

  - [ ] 2.4 實作 auth-login Lambda (Go)
    - 創建 Lambda 函數處理 POST /auth/login
    - 實作密碼驗證 (bcrypt compare)
    - 生成 JWT token
    - 實作連續登入失敗鎖定機制 (5 次失敗鎖定 15 分鐘)
    - _Requirements: 16.5, 16.6_


  - [ ]* 2.5 撰寫 auth-login 單元測試
    - 測試成功登入
    - 測試密碼錯誤
    - 測試帳號鎖定機制
    - _Requirements: 16.6_

  - [ ] 2.6 實作 users-get Lambda (Go)
    - 創建 Lambda 函數處理 GET /users/{user_id}
    - 實作 JWT 驗證中介層
    - 查詢並返回使用者資料
    - _Requirements: 13.1, 16.5_

  - [ ] 2.7 實作 users-patch Lambda (Go)
    - 創建 Lambda 函數處理 PATCH /users/{user_id}
    - 實作顯示名稱更新
    - 實作角色變更
    - 實作頭像上傳 (限制 5MB)
    - _Requirements: 13.1, 13.2, 13.3, 13.6_

  - [ ]* 2.8 撰寫使用者資料更新屬性測試
    - **Property 32: 使用者資料更新持久化**
    - **Validates: Requirements 13.1, 13.2, 13.3**


- [ ] 3. 家庭圈管理服務
  - [ ] 3.1 實作 families-create Lambda (Go)
    - 創建 Lambda 函數處理 POST /families
    - 生成唯一邀請碼 (10 字元英數字)
    - 創建家庭圈記錄
    - 自動將創建者加入家庭圈
    - _Requirements: 2.1, 2.2_

  - [ ]* 3.2 撰寫家庭圈創建屬性測試
    - **Property 4: 家庭圈邀請碼唯一性**
    - **Property 5: 創建者自動加入家庭圈**
    - **Validates: Requirements 2.1, 2.2_

  - [ ] 3.3 實作 families-join Lambda (Go)
    - 創建 Lambda 函數處理 POST /families/join
    - 驗證邀請碼有效性
    - 檢查家庭圈成員數量限制 (最多 10 人)
    - 將使用者加入家庭圈
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.4 撰寫家庭圈加入屬性測試
    - **Property 6: 有效邀請碼加入家庭圈**
    - **Property 7: 家庭圈成員數量限制**
    - **Property 8: 無效邀請碼拒絕**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**


  - [ ] 3.5 實作家庭圈成員管理功能
    - 實作 GET /families/{family_id}/members 查詢成員列表
    - 實作 DELETE /families/{family_id}/members/{user_id} 移除成員
    - 實作創建者權限檢查
    - 禁止創建者移除自己
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.6_

  - [ ]* 3.6 撰寫成員管理屬性測試
    - **Property 33: 家庭圈成員列表查詢**
    - **Property 34: 創建者權限控制**
    - **Property 35: 成員移除功能**
    - **Property 36: 創建者自我移除禁止**
    - **Validates: Requirements 14.1, 14.3, 14.4, 14.6**

- [ ] 4. Checkpoint - 基礎服務驗證
  - 確認所有基礎 Lambda 函數部署成功
  - 確認 API Gateway 路由正確配置
  - 確認資料庫連線正常
  - 執行所有單元測試與屬性測試
  - 詢問使用者是否有問題


- [ ] 5. AI 服務整合
  - [ ] 5.1 部署 Sagemaker Endpoint
    - 使用 Terraform 創建 Sagemaker Endpoint
    - 部署 Qwen 3 7B 微調模型
    - 配置 Endpoint 自動擴展策略
    - _Requirements: 5.1, 17.3_

  - [ ] 5.2 實作 Scam Detector 服務 (Go)
    - 創建 Sagemaker 客戶端
    - 實作呼叫 Sagemaker Endpoint 的函數
    - 實作風險分數分類邏輯 (0-33 低, 34-66 中, 67-100 高)
    - 實作降級方案 (失敗時返回預設分數 50)
    - 實作重試機制 (最多 3 次,指數退避)
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [ ]* 5.3 撰寫 Scam Detector 單元測試
    - 測試成功呼叫 Sagemaker
    - 測試風險分數分類正確性
    - 測試降級方案
    - _Requirements: 5.3, 5.5_

  - [ ]* 5.4 撰寫風險分數分類屬性測試
    - **Property 15: 風險分數分類正確性**
    - **Validates: Requirements 5.3**


  - [ ] 5.5 配置 Amazon Bedrock 存取
    - 使用 Terraform 配置 IAM 角色與政策
    - 啟用 Claude Sonnet 4 模型存取
    - _Requirements: 6.1_

  - [ ] 5.6 實作 Explanation Generator 服務 (Go)
    - 創建 Bedrock 客戶端
    - 實作呼叫 Bedrock API 的函數
    - 實作系統提示詞 (繁體中文,白話文,200 字限制)
    - 實作降級方案 (失敗時返回預設解釋)
    - 實作重試機制 (最多 3 次,指數退避)
    - _Requirements: 6.1, 6.2, 6.3, 6.5_

  - [ ]* 5.7 撰寫 Explanation Generator 單元測試
    - 測試成功生成解釋
    - 測試解釋長度限制
    - 測試降級方案
    - _Requirements: 6.2, 6.3, 6.5_

  - [ ]* 5.8 撰寫解釋生成屬性測試
    - **Property 18: 解釋長度限制**
    - **Validates: Requirements 6.3**


- [ ] 6. 核心分析服務
  - [ ] 6.1 實作 analysis Lambda (Go)
    - 創建 Lambda 函數整合 Scam Detector 與 Explanation Generator
    - 實作完整分析流程: 接收內容 → 呼叫 Sagemaker → 呼叫 Bedrock → 儲存結果
    - 實作訊息內容加密儲存
    - 實作 5 秒內完成 Sagemaker 分析的超時控制
    - 實作 10 秒內完成 Bedrock 解釋的超時控制
    - _Requirements: 5.1, 5.2, 5.4, 6.1, 6.2, 16.4_

  - [ ]* 6.2 撰寫 analysis Lambda 單元測試
    - 測試完整分析流程
    - 測試超時控制
    - 測試加密儲存
    - _Requirements: 5.2, 6.2, 16.4_

  - [ ] 6.3 實作 user-event Lambda (Go)
    - 創建 Lambda 函數處理 POST /user-event
    - 驗證輸入類型 (text, image, url, phone)
    - 呼叫 analysis Lambda 進行分析
    - 創建 scan_event 記錄
    - 返回分析結果給客戶端
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]* 6.4 撰寫掃描事件記錄屬性測試
    - **Property 19: 掃描事件資料持久化**
    - **Property 20: 掃描事件家庭圈關聯**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4**


- [ ] 7. 推播通知服務
  - [ ] 7.1 配置 Expo Push Notification
    - 註冊 Expo 帳號並取得 Access Token
    - 配置推播憑證 (iOS APNs, Android FCM)
    - _Requirements: 9.1_

  - [ ] 7.2 實作 families-feed Lambda (Go)
    - 創建 Lambda 函數處理推播發送
    - 查詢家庭圈所有 Gatekeeper
    - 過濾有效的 push_token
    - 呼叫 Expo Push Notification API
    - 實作推播失敗重試機制 (最多 3 次)
    - 更新 scan_event 的 notify_status
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ]* 7.3 撰寫推播通知單元測試
    - 測試成功發送推播
    - 測試推播內容完整性
    - 測試重試機制
    - _Requirements: 9.3, 9.5_

  - [ ]* 7.4 撰寫推播通知屬性測試
    - **Property 21: 高風險訊息推播觸發**
    - **Property 22: 推播通知內容完整性**
    - **Property 23: 推播失敗重試機制**
    - **Validates: Requirements 9.1, 9.3, 9.5**


  - [ ] 7.5 整合推播觸發到 analysis Lambda
    - 在 analysis Lambda 中檢查 risk_score >= 67
    - 呼叫 families-feed Lambda 發送推播
    - 實作非同步呼叫 (不阻塞主流程)
    - _Requirements: 9.1_

- [ ] 8. 家庭圈動態服務
  - [ ] 8.1 實作 families-scan-events Lambda (Go)
    - 創建 Lambda 函數處理 GET /families/{family_id}/scan-events
    - 實作家庭圈資料隔離檢查
    - 實作時間倒序排列
    - 實作分頁功能 (limit, offset)
    - 限制單次查詢最多 20 筆
    - 實作風險等級篩選 (可選參數)
    - _Requirements: 10.1, 10.2, 10.6, 16.3_

  - [ ]* 8.2 撰寫家庭圈動態屬性測試
    - **Property 24: 家庭圈動態查詢完整性**
    - **Property 25: 掃描事件時間倒序排列**
    - **Property 26: 掃描事件分頁限制**
    - **Property 39: 家庭圈資料隔離**
    - **Validates: Requirements 10.1, 10.2, 10.6, 16.3**


- [ ] 9. Checkpoint - 後端服務完整性驗證
  - 確認所有 Lambda 函數正常運作
  - 確認 AI 服務整合成功
  - 確認推播通知可正常發送
  - 執行所有單元測試與屬性測試
  - 執行整合測試驗證端對端流程
  - 詢問使用者是否有問題

- [ ] 10. 前端基礎架構
  - [ ] 10.1 設置 React Native 專案結構
    - 配置 Expo 專案
    - 安裝必要依賴 (React Navigation, Axios, AsyncStorage)
    - 配置 TypeScript
    - 設置環境變數 (API_BASE_URL)
    - _Requirements: 17.1_

  - [ ] 10.2 實作 API 客戶端
    - 創建 Axios 實例
    - 實作 JWT token 自動附加
    - 實作請求攔截器 (添加 Authorization header)
    - 實作回應攔截器 (處理 401, 429 錯誤)
    - 實作錯誤處理
    - _Requirements: 16.1, 16.5, 17.5_

  - [ ] 10.3 實作本地快取管理
    - 使用 AsyncStorage 實作快取層
    - 實作最近 50 筆 scan_event 快取
    - 實作快取過期機制
    - _Requirements: 15.1, 15.2_


  - [ ]* 10.4 撰寫本地快取屬性測試
    - **Property 37: 本地快取數量限制**
    - **Validates: Requirements 15.2**

  - [ ] 10.5 實作導航結構
    - 配置 React Navigation
    - 創建 Tab Navigator (首頁, 家庭圈, 每日挑戰, 個人資料)
    - 創建 Stack Navigator (登入, 註冊, 掃描結果詳情)
    - _Requirements: 1.1_

- [ ] 11. 使用者認證畫面
  - [ ] 11.1 實作註冊畫面
    - 創建註冊表單 (電子郵件, 密碼, 暱稱, 角色選擇)
    - 實作前端驗證 (電子郵件格式, 密碼長度)
    - 呼叫 POST /users API
    - 處理錯誤訊息顯示
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6_

  - [ ] 11.2 實作登入畫面
    - 創建登入表單 (電子郵件, 密碼)
    - 呼叫 POST /auth/login API
    - 儲存 JWT token 到 AsyncStorage
    - 處理帳號鎖定錯誤訊息
    - _Requirements: 16.5, 16.6_


  - [ ] 11.3 實作家庭圈創建與加入畫面
    - 創建家庭圈創建表單
    - 顯示生成的邀請碼
    - 創建家庭圈加入表單 (輸入邀請碼)
    - 處理成員上限錯誤訊息
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 12. 掃描結果顯示
  - [ ] 12.1 實作掃描結果卡片組件
    - 創建風險等級徽章 (低/中/高, 綠/黃/紅)
    - 創建風險分數圓形進度條
    - 顯示白話文解釋
    - 顯示原始訊息內容
    - 添加「分享給守門人」按鈕
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ] 12.2 實作掃描結果詳情頁面
    - 顯示完整掃描資訊
    - 顯示 top_signals 列表
    - 顯示掃描時間
    - 實作分享功能
    - _Requirements: 10.4_


- [ ] 13. 家庭圈動態畫面
  - [ ] 13.1 實作家庭圈動態列表
    - 呼叫 GET /families/{family_id}/scan-events API
    - 顯示所有成員的掃描事件
    - 實作時間倒序排列
    - 顯示掃描者名稱、時間、風險等級、訊息摘要
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ] 13.2 實作下拉刷新與無限滾動
    - 實作下拉刷新載入最新事件
    - 實作向下滾動載入更多 (分頁)
    - 實作載入指示器
    - _Requirements: 10.5, 10.6_

  - [ ] 13.3 實作離線模式支援
    - 檢測網路連線狀態
    - 離線時顯示本地快取資料
    - 顯示離線模式指示
    - 網路恢復時自動同步
    - _Requirements: 15.1, 15.3, 15.4, 15.5_

- [ ] 14. 個人資料管理
  - [ ] 14.1 實作個人資料編輯畫面
    - 顯示當前使用者資料
    - 實作顯示名稱編輯
    - 實作角色變更
    - 實作頭像上傳 (限制 5MB)
    - 呼叫 PATCH /users/{user_id} API
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_


  - [ ] 14.2 實作家庭圈成員管理畫面
    - 呼叫 GET /families/{family_id}/members API
    - 顯示成員列表 (名稱, 角色, 加入日期)
    - 實作移除成員功能 (僅創建者可見)
    - 實作移除確認對話框
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [ ] 15. Android 通知攔截器
  - [ ] 15.1 創建 Android Native Module
    - 創建 NotificationListenerService
    - 實作通知監聽邏輯
    - 提取通知標題、內容、來源應用程式
    - 創建 React Native Bridge
    - _Requirements: 3.1, 3.2_

  - [ ] 15.2 實作通知權限請求
    - 創建權限請求 UI
    - 引導使用者到系統設定頁面
    - 檢查權限狀態
    - _Requirements: 3.1_

  - [ ] 15.3 實作自動掃描流程
    - 監聽通知事件
    - 自動呼叫 POST /user-event API
    - 顯示掃描結果通知
    - 處理空通知錯誤
    - _Requirements: 3.3, 3.4, 3.5_


  - [ ]* 15.4 撰寫通知攔截器屬性測試
    - **Property 9: 通知內容提取完整性**
    - **Property 11: 空通知錯誤處理**
    - **Validates: Requirements 3.2, 3.5**

  - [ ] 15.5 配置背景服務
    - 配置 AndroidManifest.xml
    - 實作背景服務持續運行
    - 處理系統殺掉服務的情況
    - _Requirements: 3.4_

- [ ] 16. iOS 分享掃描器
  - [ ] 16.1 配置 iOS Share Extension
    - 使用 Expo Config Plugin 配置分享擴充功能
    - 註冊為系統分享目標
    - 配置接受文字類型分享
    - _Requirements: 4.1_

  - [ ] 16.2 實作分享內容接收
    - 創建分享處理器
    - 接收分享的文字內容
    - 驗證內容類型
    - _Requirements: 4.2, 4.5_

  - [ ] 16.3 實作快速掃描流程
    - 呼叫 POST /user-event API
    - 在 3 秒內完成內容接收並開始分析
    - 顯示掃描結果
    - 處理非文字內容錯誤
    - _Requirements: 4.3, 4.4, 4.5_


  - [ ]* 16.4 撰寫分享掃描器屬性測試
    - **Property 12: 分享內容接收**
    - **Property 13: 非文字分享內容拒絕**
    - **Validates: Requirements 4.2, 4.5**

- [ ] 17. 推播通知整合
  - [ ] 17.1 配置 Expo Push Notifications
    - 安裝 expo-notifications 套件
    - 配置 iOS APNs 與 Android FCM
    - 請求推播權限
    - _Requirements: 9.1_

  - [ ] 17.2 實作推播 Token 註冊
    - 取得 Expo Push Token
    - 呼叫 PATCH /users/{user_id} 更新 push_token
    - 處理 Token 更新失敗
    - _Requirements: 9.1_

  - [ ] 17.3 實作推播通知處理
    - 監聽推播通知事件
    - 解析通知資料 (event_id, risk_level)
    - 點擊通知時導航到掃描結果詳情頁面
    - _Requirements: 9.4_


- [ ] 18. 每日挑戰功能
  - [ ] 18.1 實作每日挑戰資料管理
    - 創建 daily_challenges 表資料填充腳本
    - 實作 GET /daily-challenges/today API
    - 實作每日午夜更新機制
    - _Requirements: 11.1, 11.2, 11.5_

  - [ ] 18.2 實作每日挑戰畫面
    - 顯示模擬訊息內容
    - 創建答題選項 (是/否詐騙)
    - 添加「請家人幫忙」按鈕
    - 顯示正確答案與解釋
    - _Requirements: 11.2, 11.3_

  - [ ] 18.3 實作答題記錄
    - 呼叫 POST /challenge-responses API
    - 儲存答題結果
    - 顯示已完成狀態
    - _Requirements: 11.4_

  - [ ]* 18.4 撰寫每日挑戰屬性測試
    - **Property 27: 每日挑戰資料結構**
    - **Property 28: 答題結果記錄**
    - **Validates: Requirements 11.2, 11.4**


  - [ ] 18.5 實作 Solver 協助功能
    - 實作 POST /challenge-help API (發送求助通知)
    - 實作 Solver 接收求助推播
    - 實作 Solver 答題介面
    - 實作答案傳遞給 Elder
    - 實作協助次數統計
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [ ]* 18.6 撰寫 Solver 協助屬性測試
    - **Property 29: Solver 求助通知觸發**
    - **Property 30: Solver 答案傳遞**
    - **Property 31: Solver 協助次數統計**
    - **Validates: Requirements 12.1, 12.3, 12.4**

- [ ] 19. Checkpoint - 前端功能完整性驗證
  - 確認所有畫面正常顯示
  - 確認 Android 通知攔截器正常運作
  - 確認 iOS 分享掃描器正常運作
  - 確認推播通知正常接收
  - 執行前端單元測試與屬性測試
  - 執行端對端測試
  - 詢問使用者是否有問題


- [ ] 20. 安全性強化
  - [ ] 20.1 實作 HTTPS 加密
    - 配置 API Gateway 自訂網域
    - 配置 SSL/TLS 憑證
    - 強制所有請求使用 HTTPS
    - _Requirements: 16.1_

  - [ ] 20.2 實作 JWT 驗證中介層
    - 創建 JWT 驗證函數
    - 在所有受保護的 API 端點添加驗證
    - 實作 Token 過期檢查
    - _Requirements: 16.5_

  - [ ]* 20.3 撰寫身份驗證屬性測試
    - **Property 41: API 身份驗證**
    - **Validates: Requirements 16.5**

  - [ ] 20.4 實作資料加密
    - 實作訊息內容加密函數 (AES-256)
    - 在儲存 scan_event 前加密 input_content
    - 在讀取時解密
    - _Requirements: 16.4_

  - [ ]* 20.5 撰寫資料加密屬性測試
    - **Property 40: 訊息內容加密儲存**
    - **Validates: Requirements 16.4**


  - [ ] 20.6 實作密碼雜湊驗證
    - 驗證所有密碼使用 bcrypt 雜湊
    - 設定適當的 cost factor (10-12)
    - _Requirements: 16.2_

  - [ ]* 20.7 撰寫密碼安全屬性測試
    - **Property 38: 密碼雜湊儲存**
    - **Validates: Requirements 16.2**

- [ ] 21. 錯誤處理與日誌
  - [ ] 21.1 實作統一錯誤處理
    - 創建錯誤處理中介層
    - 實作錯誤分類 (4xx, 5xx)
    - 實作使用者友善錯誤訊息
    - 確保不洩漏系統內部資訊
    - _Requirements: 18.4_

  - [ ]* 21.2 撰寫錯誤訊息安全屬性測試
    - **Property 46: 錯誤訊息安全性**
    - **Validates: Requirements 18.4**

  - [ ] 21.3 實作日誌記錄系統
    - 配置 CloudWatch Logs
    - 實作請求/回應日誌記錄
    - 實作錯誤日誌記錄 (包含堆疊追蹤)
    - 實作唯一追蹤 ID 生成
    - 實作日誌等級分類
    - _Requirements: 18.1, 18.2, 18.3, 18.5, 18.6_


  - [ ]* 21.4 撰寫日誌記錄屬性測試
    - **Property 43: API 請求日誌記錄**
    - **Property 44: 錯誤日誌包含堆疊追蹤**
    - **Property 45: 請求追蹤 ID 唯一性**
    - **Property 47: 日誌等級分類**
    - **Validates: Requirements 18.1, 18.2, 18.3, 18.6**

- [ ] 22. 效能優化與監控
  - [ ] 22.1 實作資料庫連線池
    - 配置 Aurora PostgreSQL 連線池
    - 設定最大連線數
    - 實作連線重用
    - _Requirements: 17.4_

  - [ ] 22.2 配置 Lambda 自動擴展
    - 設定 Lambda 並發限制
    - 配置預留並發 (Provisioned Concurrency)
    - 設定記憶體與超時參數
    - _Requirements: 17.2, 17.3_

  - [ ] 22.3 實作 API 速率限制
    - 配置 API Gateway 使用計畫
    - 設定每使用者 60 req/min 限制
    - 實作 429 錯誤回應
    - _Requirements: 17.5, 17.6_


  - [ ]* 22.4 撰寫速率限制屬性測試
    - **Property 42: API 速率限制**
    - **Validates: Requirements 17.5, 17.6**

  - [ ] 22.5 配置監控與告警
    - 配置 CloudWatch 儀表板
    - 設定錯誤率告警 (5xx > 1%)
    - 設定 Sagemaker 失敗率告警 (> 5%)
    - 設定 API 延遲告警 (P95 > 5s)
    - 設定資料庫連線池使用率告警 (> 80%)
    - _Requirements: 17.1_

- [ ] 23. 測試與品質保證
  - [ ] 23.1 執行所有單元測試
    - 執行後端 Go 單元測試
    - 執行前端 TypeScript 單元測試
    - 確認測試覆蓋率 ≥ 80%
    - _Requirements: All_

  - [ ] 23.2 執行所有屬性測試
    - 執行所有 47 個屬性測試
    - 每個測試至少 100 次迭代
    - 確認所有屬性測試通過
    - _Requirements: All_


  - [ ] 23.3 執行整合測試
    - 測試使用者註冊與登入流程
    - 測試家庭圈創建與加入流程
    - 測試掃描與分析流程
    - 測試推播通知流程
    - 測試每日挑戰流程
    - _Requirements: All_

  - [ ] 23.4 執行端對端測試
    - 測試 Android 通知攔截完整流程
    - 測試 iOS 分享掃描完整流程
    - 測試高風險訊息推播完整流程
    - 測試離線模式與同步
    - _Requirements: All_

  - [ ] 23.5 執行效能測試
    - 使用 k6 或 JMeter 執行負載測試
    - 測試 100 並發使用者 (10 分鐘)
    - 測試 500 並發使用者 (5 分鐘)
    - 驗證 P95 回應時間 < 3 秒
    - 驗證錯誤率 < 1%
    - _Requirements: 17.1, 17.2, 17.3_


- [ ] 24. 部署與發布
  - [ ] 24.1 配置 CI/CD Pipeline
    - 設定 GitHub Actions workflow
    - 配置自動測試執行
    - 配置 Terraform 自動部署
    - 配置 Docker 映像自動建置與推送
    - _Requirements: 17.1_

  - [ ] 24.2 部署到 AWS
    - 執行 Terraform apply 部署所有基礎設施
    - 驗證所有 Lambda 函數正常運作
    - 驗證 API Gateway 端點可存取
    - 驗證資料庫連線正常
    - _Requirements: 17.1, 17.2_

  - [ ] 24.3 配置生產環境變數
    - 設定 API_BASE_URL
    - 設定 Sagemaker Endpoint URL
    - 設定 Bedrock 模型 ID
    - 設定 Expo Push Token
    - 設定資料庫連線字串
    - _Requirements: 16.1_

  - [ ] 24.4 建置與發布 Android App
    - 使用 EAS Build 建置 Android APK/AAB
    - 配置簽名憑證
    - 上傳到 Google Play Console
    - _Requirements: 3.1_


  - [ ] 24.5 建置與發布 iOS App
    - 使用 EAS Build 建置 iOS IPA
    - 配置 Apple Developer 憑證
    - 配置 APNs 推播憑證
    - 上傳到 App Store Connect
    - _Requirements: 4.1_

- [ ] 25. Final Checkpoint - 系統完整性驗證
  - 確認所有功能正常運作
  - 確認所有測試通過
  - 確認效能指標達標
  - 確認安全性措施到位
  - 確認監控與告警正常
  - 確認應用程式已發布到商店
  - 詢問使用者是否有問題

## Notes

- 任務標記 `*` 為可選測試任務,可跳過以加快 MVP 開發
- 每個任務都標註對應的需求編號,確保可追溯性
- Checkpoint 任務確保漸進式驗證,及早發現問題
- 屬性測試驗證通用正確性屬性,單元測試驗證特定範例
- 所有屬性測試必須執行至少 100 次迭代
- 後端使用 Go + AWS Lambda,前端使用 TypeScript + React Native
- 基礎設施使用 Terraform 管理,確保可重現性
