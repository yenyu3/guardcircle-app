# Requirements Document

## Introduction

GuardCircle（守護圈）是一套針對長輩防詐騙的完整防護系統，結合「自動攔截 × 可解釋 × 家庭聯防」三大核心能力。系統透過 Android 全自動通知攔截與 iOS 分享快速掃描，涵蓋所有主流訊息管道；使用 Amazon Sagemaker 訓練的機器學習模型進行詐騙偵測，並透過 Amazon Bedrock 生成白話文判斷理由，讓長輩能真正理解風險；採用三角色設計（長輩、守門人、解題者），讓子女能遠端確認並介入，打破孤島式防護。

## Glossary

- **GuardCircle_System**: 整個防詐騙系統，包含前端應用程式、後端服務、AI 模型與資料庫
- **Elder**: 被保護者角色，通常為長輩，需要防詐騙保護的使用者
- **Gatekeeper**: 守門人角色，通常為子女，可即時接收推播並遠端確認風險
- **Solver**: 解題者角色，協助回答每日挑戰題目的家庭成員
- **Family_Circle**: 家庭圈，由多個使用者組成的防護群組
- **Notification_Interceptor**: Android 通知攔截器，自動攔截並分析通知內容
- **Share_Scanner**: iOS 分享掃描器，透過系統分享功能快速掃描訊息
- **Scam_Detector**: 詐騙偵測器，使用 Sagemaker 訓練的機器學習模型
- **Explanation_Generator**: 解釋生成器，使用 Amazon Bedrock 生成白話文判斷理由
- **Risk_Score**: 風險分數，0-100 的數值，表示訊息為詐騙的可能性
- **Scan_Event**: 掃描事件，記錄每次訊息掃描的完整資訊
- **Push_Notification**: 推播通知，發送給 Gatekeeper 的即時警報
- **Daily_Challenge**: 每日挑戰，用於教育使用者識別詐騙的互動式題目

## Requirements

### Requirement 1: 使用者註冊與角色選擇

**User Story:** 作為新使用者，我想要註冊帳號並選擇我的角色，以便開始使用 GuardCircle 系統

#### Acceptance Criteria

1. WHEN 使用者首次開啟應用程式，THE GuardCircle_System SHALL 顯示註冊畫面
2. WHEN 使用者輸入有效的電子郵件和密碼，THE GuardCircle_System SHALL 創建新的使用者帳號
3. WHEN 使用者完成註冊，THE GuardCircle_System SHALL 提示使用者選擇角色（Elder、Gatekeeper 或 Solver）
4. THE GuardCircle_System SHALL 儲存使用者選擇的角色到資料庫
5. IF 使用者輸入無效的電子郵件格式，THEN THE GuardCircle_System SHALL 顯示錯誤訊息並拒絕註冊
6. IF 使用者輸入的密碼少於 8 個字元，THEN THE GuardCircle_System SHALL 顯示錯誤訊息並拒絕註冊

### Requirement 2: 家庭圈創建與加入

**User Story:** 作為使用者，我想要創建或加入家庭圈，以便與家人建立防護網絡

#### Acceptance Criteria

1. WHEN 使用者選擇創建家庭圈，THE GuardCircle_System SHALL 生成唯一的家庭圈邀請碼
2. THE GuardCircle_System SHALL 將創建者設定為家庭圈的第一個成員
3. WHEN 使用者輸入有效的邀請碼，THE GuardCircle_System SHALL 將使用者加入對應的家庭圈
4. THE GuardCircle_System SHALL 限制每個家庭圈最多 10 個成員
5. IF 使用者輸入無效的邀請碼，THEN THE GuardCircle_System SHALL 顯示錯誤訊息
6. IF 家庭圈已達成員上限，THEN THE GuardCircle_System SHALL 拒絕新成員加入並顯示錯誤訊息

### Requirement 3: Android 通知自動攔截

**User Story:** 作為 Elder，我想要系統自動攔截並分析 Android 通知，以便在不需手動操作的情況下獲得保護

#### Acceptance Criteria

1. WHERE Android 平台，WHEN 應用程式獲得通知存取權限，THE Notification_Interceptor SHALL 監聽所有通知
2. WHEN 接收到新通知，THE Notification_Interceptor SHALL 提取通知的標題、內容和來源應用程式
3. WHEN 提取通知內容後，THE Notification_Interceptor SHALL 將內容傳送給 Scam_Detector 進行分析
4. THE Notification_Interceptor SHALL 在背景執行，不影響其他應用程式的通知顯示
5. IF 通知內容為空或無法提取，THEN THE Notification_Interceptor SHALL 記錄錯誤並跳過該通知

### Requirement 4: iOS 分享快速掃描

**User Story:** 作為 Elder，我想要透過 iOS 分享功能快速掃描訊息，以便在收到可疑訊息時立即檢查

#### Acceptance Criteria

1. WHERE iOS 平台，THE Share_Scanner SHALL 註冊為系統分享擴充功能
2. WHEN 使用者在任何應用程式中選擇分享到 GuardCircle，THE Share_Scanner SHALL 接收分享的文字內容
3. WHEN 接收到分享內容後，THE Share_Scanner SHALL 將內容傳送給 Scam_Detector 進行分析
4. THE Share_Scanner SHALL 在 3 秒內完成內容接收並開始分析
5. IF 分享內容不包含文字，THEN THE Share_Scanner SHALL 顯示錯誤訊息

### Requirement 5: 詐騙偵測與風險評分

**User Story:** 作為系統，我需要準確偵測詐騙訊息並提供風險評分，以便使用者了解訊息的危險程度

#### Acceptance Criteria

1. WHEN 接收到訊息內容，THE Scam_Detector SHALL 使用 Sagemaker 訓練的機器學習模型進行分析
2. THE Scam_Detector SHALL 在 5 秒內完成分析並返回 Risk_Score（0-100）
3. THE Scam_Detector SHALL 將 Risk_Score 分類為低風險（0-33）、中風險（34-66）或高風險（67-100）
4. WHEN 分析完成後，THE Scam_Detector SHALL 觸發 Explanation_Generator 生成判斷理由
5. IF 模型分析失敗，THEN THE Scam_Detector SHALL 返回預設的中風險分數（50）並記錄錯誤

### Requirement 6: 白話文解釋生成

**User Story:** 作為 Elder，我想要看到白話文的判斷理由，以便真正理解為什麼這則訊息可能是詐騙

#### Acceptance Criteria

1. WHEN Scam_Detector 完成分析，THE Explanation_Generator SHALL 使用 Amazon Bedrock 生成白話文解釋
2. THE Explanation_Generator SHALL 在 10 秒內完成解釋生成
3. THE Explanation_Generator SHALL 生成不超過 200 字的繁體中文解釋
4. THE Explanation_Generator SHALL 包含具體的風險點說明（例如：要求匯款、假冒官方、製造緊急感）
5. IF Bedrock API 呼叫失敗，THEN THE Explanation_Generator SHALL 返回預設的通用解釋並記錄錯誤

### Requirement 7: 掃描結果顯示

**User Story:** 作為 Elder，我想要清楚看到掃描結果，以便決定是否要相信這則訊息

#### Acceptance Criteria

1. WHEN 分析完成，THE GuardCircle_System SHALL 顯示風險等級（低、中、高）的視覺化標示
2. THE GuardCircle_System SHALL 顯示 Risk_Score 數值
3. THE GuardCircle_System SHALL 顯示 Explanation_Generator 生成的白話文解釋
4. THE GuardCircle_System SHALL 顯示原始訊息內容
5. THE GuardCircle_System SHALL 提供「分享給守門人」的按鈕
6. WHILE 風險等級為高，THE GuardCircle_System SHALL 使用紅色警示顏色

### Requirement 8: 掃描事件記錄

**User Story:** 作為系統，我需要記錄所有掃描事件，以便追蹤歷史記錄和提供家庭圈動態

#### Acceptance Criteria

1. WHEN 完成一次掃描，THE GuardCircle_System SHALL 創建 Scan_Event 記錄
2. THE Scan_Event SHALL 包含時間戳記、使用者 ID、訊息內容、Risk_Score、風險等級和解釋
3. THE GuardCircle_System SHALL 將 Scan_Event 儲存到資料庫
4. THE GuardCircle_System SHALL 將 Scan_Event 關聯到使用者所屬的 Family_Circle
5. THE GuardCircle_System SHALL 保留 Scan_Event 記錄至少 90 天

### Requirement 9: 守門人推播通知

**User Story:** 作為 Gatekeeper，我想要在家庭圈成員掃描到高風險訊息時立即收到通知，以便及時介入保護

#### Acceptance Criteria

1. WHEN Elder 掃描到高風險訊息（Risk_Score >= 67），THE GuardCircle_System SHALL 發送 Push_Notification 給所有 Gatekeeper
2. THE Push_Notification SHALL 在掃描完成後 10 秒內送達
3. THE Push_Notification SHALL 包含 Elder 的名稱、風險等級和訊息摘要（前 50 字）
4. WHEN Gatekeeper 點擊 Push_Notification，THE GuardCircle_System SHALL 開啟該 Scan_Event 的詳細頁面
5. IF Push_Notification 發送失敗，THEN THE GuardCircle_System SHALL 重試最多 3 次

### Requirement 10: 家庭圈動態瀏覽

**User Story:** 作為家庭圈成員，我想要查看家庭圈的所有掃描記錄，以便了解家人的防護狀況

#### Acceptance Criteria

1. THE GuardCircle_System SHALL 顯示家庭圈所有成員的 Scan_Event 列表
2. THE GuardCircle_System SHALL 按時間倒序排列 Scan_Event（最新的在最上方）
3. THE GuardCircle_System SHALL 顯示每個 Scan_Event 的掃描者名稱、時間、風險等級和訊息摘要
4. WHEN 使用者點擊 Scan_Event，THE GuardCircle_System SHALL 顯示完整的掃描詳情
5. THE GuardCircle_System SHALL 支援下拉刷新以載入最新的 Scan_Event
6. THE GuardCircle_System SHALL 每次載入最多 20 筆 Scan_Event，並支援向下滾動載入更多

### Requirement 11: 每日挑戰題目

**User Story:** 作為 Elder，我想要透過每日挑戰學習識別詐騙，以便提升自己的防詐騙能力

#### Acceptance Criteria

1. THE GuardCircle_System SHALL 每天提供一題 Daily_Challenge
2. THE Daily_Challenge SHALL 包含一則模擬訊息和多個選項（是否為詐騙）
3. WHEN 使用者選擇答案，THE GuardCircle_System SHALL 立即顯示正確答案和解釋
4. THE GuardCircle_System SHALL 記錄使用者的答題結果
5. THE GuardCircle_System SHALL 在每天午夜（00:00）更新 Daily_Challenge
6. WHERE 使用者已完成當天的 Daily_Challenge，THE GuardCircle_System SHALL 顯示「明天再來」的訊息

### Requirement 12: Solver 協助解題

**User Story:** 作為 Solver，我想要協助 Elder 回答每日挑戰，以便增進家庭互動並教育長輩

#### Acceptance Criteria

1. WHERE 使用者角色為 Solver，WHEN Elder 在 Daily_Challenge 選擇「請家人幫忙」，THE GuardCircle_System SHALL 發送通知給所有 Solver
2. WHEN Solver 點擊通知，THE GuardCircle_System SHALL 顯示該 Daily_Challenge 的題目
3. WHEN Solver 提交答案，THE GuardCircle_System SHALL 將答案和解釋傳送給 Elder
4. THE GuardCircle_System SHALL 記錄 Solver 的協助次數
5. IF 沒有 Solver 在 24 小時內回應，THEN THE GuardCircle_System SHALL 自動顯示正確答案給 Elder

### Requirement 13: 使用者個人資料管理

**User Story:** 作為使用者，我想要管理我的個人資料，以便更新我的名稱、頭像和角色設定

#### Acceptance Criteria

1. THE GuardCircle_System SHALL 允許使用者編輯顯示名稱
2. THE GuardCircle_System SHALL 允許使用者上傳或選擇頭像圖片
3. THE GuardCircle_System SHALL 允許使用者變更角色（Elder、Gatekeeper 或 Solver）
4. WHEN 使用者儲存變更，THE GuardCircle_System SHALL 在 3 秒內更新資料庫
5. THE GuardCircle_System SHALL 在儲存成功後顯示確認訊息
6. IF 頭像圖片大於 5MB，THEN THE GuardCircle_System SHALL 拒絕上傳並顯示錯誤訊息

### Requirement 14: 家庭圈成員管理

**User Story:** 作為家庭圈創建者，我想要管理家庭圈成員，以便移除不再需要的成員或查看成員資訊

#### Acceptance Criteria

1. THE GuardCircle_System SHALL 顯示家庭圈所有成員的列表
2. THE GuardCircle_System SHALL 顯示每個成員的名稱、角色和加入日期
3. WHERE 使用者為家庭圈創建者，THE GuardCircle_System SHALL 提供移除成員的功能
4. WHEN 創建者移除成員，THE GuardCircle_System SHALL 將該成員從家庭圈中移除
5. THE GuardCircle_System SHALL 在移除成員前顯示確認對話框
6. THE GuardCircle_System SHALL 禁止創建者移除自己

### Requirement 15: 離線模式支援

**User Story:** 作為 Elder，我想要在沒有網路連線時仍能查看歷史掃描記錄，以便隨時回顧過去的警示

#### Acceptance Criteria

1. WHILE 裝置沒有網路連線，THE GuardCircle_System SHALL 允許使用者瀏覽本地快取的 Scan_Event
2. THE GuardCircle_System SHALL 在本地快取最近 50 筆 Scan_Event
3. WHILE 裝置沒有網路連線，THE GuardCircle_System SHALL 在畫面上顯示離線模式指示
4. WHEN 裝置恢復網路連線，THE GuardCircle_System SHALL 自動同步最新的 Scan_Event
5. IF 使用者在離線模式嘗試執行需要網路的操作，THEN THE GuardCircle_System SHALL 顯示錯誤訊息

### Requirement 16: 資料隱私與安全

**User Story:** 作為使用者，我想要確保我的掃描記錄和個人資料受到保護，以便安心使用系統

#### Acceptance Criteria

1. THE GuardCircle_System SHALL 使用 HTTPS 加密所有客戶端與伺服器之間的通訊
2. THE GuardCircle_System SHALL 使用 bcrypt 或類似演算法雜湊儲存使用者密碼
3. THE GuardCircle_System SHALL 確保使用者只能存取自己所屬 Family_Circle 的 Scan_Event
4. THE GuardCircle_System SHALL 在資料庫中加密儲存訊息內容
5. THE GuardCircle_System SHALL 實作 API 請求的身份驗證機制（JWT 或類似技術）
6. IF 使用者連續 5 次登入失敗，THEN THE GuardCircle_System SHALL 鎖定帳號 15 分鐘

### Requirement 17: 效能與可擴展性

**User Story:** 作為系統管理員，我需要系統能夠處理大量並發請求，以便支援成長中的使用者基數

#### Acceptance Criteria

1. THE GuardCircle_System SHALL 在 95% 的情況下於 3 秒內完成 API 請求
2. THE GuardCircle_System SHALL 支援至少 1000 個並發使用者
3. THE Scam_Detector SHALL 支援每秒至少 100 次分析請求
4. THE GuardCircle_System SHALL 使用資料庫連線池以優化資料庫存取
5. THE GuardCircle_System SHALL 實作 API 速率限制，每個使用者每分鐘最多 60 次請求
6. IF API 請求超過速率限制，THEN THE GuardCircle_System SHALL 返回 HTTP 429 錯誤

### Requirement 18: 錯誤處理與日誌記錄

**User Story:** 作為開發團隊，我需要完整的錯誤處理和日誌記錄，以便快速診斷和修復問題

#### Acceptance Criteria

1. THE GuardCircle_System SHALL 記錄所有 API 請求和回應到日誌系統
2. THE GuardCircle_System SHALL 記錄所有錯誤和例外狀況，包含堆疊追蹤
3. THE GuardCircle_System SHALL 為每個請求生成唯一的追蹤 ID
4. WHEN 發生錯誤，THE GuardCircle_System SHALL 返回使用者友善的錯誤訊息，不洩漏系統內部資訊
5. THE GuardCircle_System SHALL 保留日誌記錄至少 30 天
6. THE GuardCircle_System SHALL 實作日誌等級（DEBUG、INFO、WARNING、ERROR、CRITICAL）

