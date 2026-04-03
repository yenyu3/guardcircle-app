## Backend Deployment

**Prereqs**
- Terraform >= 1.5
- AWS CLI authenticated (profile or env vars)
- Docker running (required for Lambda container build/push)
- Region: `us-east-1`

**1) Create Terraform Backend (one-time)**
```sh
cd backend/terraform/backend-bootstrap
terraform init
terraform apply
```

**2) Deploy All Resources (clean environment)**
This creates VPC, Aurora, API Gateway, 9 Lambda functions, ECR repos, and runs schema migration.
```sh
cd ../
terraform init -reconfigure
terraform apply -var="run_schema_migration=true"
```

**3) Get API Base URL**
```sh
terraform output -raw api_base_url
```

**4) Re-run Schema Migration (if needed)**
If you changed `backend/terraform/sql/schema.sql`, force rerun:
```sh
terraform apply -var="run_schema_migration=true" -replace="null_resource.schema[0]"
```

**Notes**
- Lambda responses are hardcoded (MVP fake responses).
- Aurora cluster identifier: `guardcircle-aurora`
- Database name: `guardcircle`

**Troubleshooting**
- State lock stuck: `terraform force-unlock <LOCK_ID>`
- ECR push/build issues: ensure Docker is running and AWS CLI is authenticated.

---

## API Spec (MVP)

## 1. 資料模型設計

建三個表 `users`, `scan_events`, `families`

### 1.1 users

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(family_id) ON DELETE SET NULL, 
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other', 'unknown')),
    birthday DATE,
    role VARCHAR(20) NOT NULL DEFAULT 'youth' 
        CHECK (role IN ('guardian', 'gatekeeper', 'youth')),
    contact_phone VARCHAR(20) NOT NULL, -- 註冊時填寫的緊急聯絡人手機
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_users_phone ON users(phone);
```

### 1.2 scan_events

```sql
CREATE TABLE IF NOT EXISTS scan_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,             -- 僅記錄 ID，不設 Foreign Key

    -- 輸入內容
    input_type VARCHAR(20) NOT NULL 
        CHECK (input_type IN ('text', 'image', 'url', 'phone', 'video', 'audio', 'file')),
    input_content TEXT NOT NULL,

    -- AI 分析核心結果
    risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    risk_score INT CHECK (risk_score >= 0 AND risk_score <= 100),
    scam_type VARCHAR(100),            -- 詐騙類型
    summary TEXT,                      -- AI 產生的簡短摘要
    reason TEXT,                       -- 判斷理由
    consequence TEXT,                  -- 新增：如果不慎點擊或操作可能導致的後果

    -- 結構化詳細訊號
    risk_factors JSONB,                -- 具體的風險因子清單
    top_signals JSONB,                 -- 關鍵標籤
    raw_result JSONB,                  -- AI 原始完整回應

    -- 狀態管理與通知
    notify_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (notify_status IN ('pending', 'sent', 'not_required', 'failed')),
    updated_by VARCHAR(100),           -- 記錄最後修改狀態者 (例如: 王爸爸)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引加速查詢
CREATE INDEX idx_scan_events_family_id ON scan_events(family_id);
CREATE INDEX idx_scan_events_user_id_created_at ON scan_events(user_id, created_at DESC);
CREATE INDEX idx_scan_events_risk_level ON scan_events(risk_level);
```

### 1.3 families

```sql
CREATE TABLE families (
    family_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(10) UNIQUE,    -- 邀請碼，方便其他成員加入
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 2. API 規格（MVP）

以下以 RESTful API 為主，供 Web Dashboard 與 LINE Bot Backend 使用。

### 2.1 建立使用者

**POST** `/users`

**Request**

```sql
{
    "phone": "0912345678",
    "password": "mySecurePassword123",
    "nickname": "小明",
    "gender": "male",
    "birthday": "2010-05-20",
    "role": "youth",
    "contact_phone": "0987654321"
}
```

**Response**

```sql
{
    "message": "user created successfully",
    "data": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "nickname": "小明",
        "role": "youth"
    }
}
```

重複電話

```sql
{ "error": "phone already exists" }
```

### 2.2 取得使用者資料

**GET** `/users/{user_id}`

**Response**

```sql
{
    "data": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "family_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",  
        "phone": "0912345678",
        "nickname": "小明",
        "gender": "male",
        "birthday": "2010-05-20",
        "role": "youth",
        "contact_phone": "0987654321",
        "created_at": "2026-03-23T10:00:00Z",
        "updated_at": "2026-03-23T10:00:00Z"
    }
}
```

### 2.3 建立家庭圈

**POST** `/families`

**Request Body**

```sql
{
    "family_name": "王小明的溫馨家園",
    "invite_code": "HAPPY888", 
    "creator_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response (201 Created)**

```sql
{
    "message": "Family created and user joined successfully",
    "data": {
        "family_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "family_name": "王小明的溫馨家園",
        "invite_code": "HAPPY888"
    }
}
```

### 2.4 加入家庭圈 (透過邀請碼)

**POST** `/families/join`

**Request Body**

```sql
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "invite_code": "ABCD12",
  "family_name": "王小明的溫馨家園"
}
```

**Response (200 OK)**

```sql
{
    "message": "Successfully joined the family",
    "data": {
        "family_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "family_name": "王小明的溫馨家園"
    }
}
```

**Response (404 Not Found)**

```sql
{
    "error": "Invalid invite code"
}
```

### 2.5 取得家庭圈所有掃描事件

**GET** `/families/{family_id}/scan-events`

**Response (200 OK)**

```sql
{
  "family_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
  "family_name": "王小明的溫馨家園",
  "events": [
    {
      "event_id": "e987f654-3210-4abc-9def-abcdef123456",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "user_nickname": "小明",
      "input_type": ["text","phone"],
      "input_content": "我是銀行客服，你的帳戶異常，請立即提供驗證碼",
      "risk_level": "high",
      "risk_score": 95,
      "scam_type": "假冒官方詐騙",
      "summary": "典型的假冒銀行客服詐騙，要求提供驗證碼以盜取帳戶控制權",
      "consequence": "若提供驗證碼，詐騙者可盜轉資金並變更帳戶設定",
      "reason": "內容含假冒身份與索取驗證碼等高風險特徵",
      "risk_factors": ["假冒銀行官方身份", "要求提供驗證碼", "製造緊迫感"],
      "top_signals": ["要求提供驗證碼", "假冒官方身份", "使用緊迫性話術"],
      "notify_status": "sent",
      "updated_by": "王爸爸",
      "updated_at": "2026-03-26T14:20:00Z",
      "created_at": "2026-03-26T14:10:00Z"
    }
  ]
}
```

### 2.6 綜合詐騙分析 API

**POST** `/analysis`

**Request Body (JSON)**

```sql
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "input_type": ["text"],
  "input_content": "我是銀行客服，你的帳戶異常，請立即提供驗證碼",
  "region": "TW"
}
```

**Response (200 OK)**

```sql
{
  "message": "analysis completed",
  "data": {
    "event_id": "uuid",
    "user_id": "uuid",
    "input_type": ["text"],
    "input_content": "內容（最多 500 字）",
    "risk_level": "high",
    "risk_score": 92,
    "scam_type": "假冒官方詐騙",
    "summary": "簡短風險摘要",
    "reason": "詳細判斷依據",
    "risk_factors": ["風險因子1", "風險因子2"],
    "top_signals": ["信號1", "信號2", "信號3"],
    "notify_status": "pending",
    "created_at": "2026-03-26T04:00:00Z"
  }
}
```

### 2.7 查詢單筆事件詳情

**GET** `/users/{user_id}/events/{event_id}`

**Response (200 OK)**

```sql
{
  "data": {
    "event_id": "e987f654-3210-4abc-9def-abcdef123456",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "input_type": ["text", "phone"],
    "input_content": "我是銀行客服，你的帳戶異常，請立即提供驗證碼",
    "risk_level": "high",
    "risk_score": 95,
    "scam_type": "假冒官方詐騙",
    "summary": "典型的假冒銀行客服詐騙，要求提供驗證碼以盜取帳戶控制權",
    "consequence": "若提供驗證碼，詐騙者可盜轉資金並變更帳戶設定",
    "reason": "內容含假冒身份與索取驗證碼等高風險特徵",
    "risk_factors": ["假冒銀行官方身份", "要求提供驗證碼", "製造緊迫感"],
    "top_signals": ["要求提供驗證碼", "假冒官方身份", "使用緊迫性話術"],
    "notify_status": "sent",
    "updated_by": "王爸爸",
    "updated_at": "2026-03-26T14:20:00Z",
    "created_at": "2026-03-26T14:10:00Z",
    "raw_result": null
  }
}
```

### 2.8 修改個人資料

**PATCH** `/users/{user_id}`

**Request Body (JSON)**

```sql
{
  "nickname": "小明 (已改名)",
  "contact_phone": "0900111222",
  "gender": "male",
  "birthday": "2010-06-01",
  "role": "guardian"
}
```

**Response (200 OK)**

```sql
{
  "message": "User profile updated successfully",
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "nickname": "小明 (已改名)",
    "role": "guardian",
    "updated_at": "2026-03-23T10:30:00Z"
  }
}
```

### 2.9 取得家庭圈近況 (Activity Feed)

**GET** `/families/{family_id}/feed`

**Response (200 OK)**

```sql
{
    "family_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
    "last_updated": "2026-03-23T10:45:00Z",
    "members_status": [
        {
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "nickname": "小明",
            "role": "youth",
            "last_event": {
                "event_id": "e987-f654",
                "risk_level": "high",
                "input_type": "url",
                "created_at": "2026-03-23T10:10:00Z"
            }
        }
    ]
}
```

### 2.10 使用者登入

**POST** `/auth/login`

**Request Body (JSON)**

```sql
{
    "phone": "0912345678",
    "password": "mySecurePassword123"
}
```

**Response (200 OK)**

```sql
{
    "message": "Login successful",
    "data": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "family_id": "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
        "nickname": "小明",
        "role": "youth",
        "phone": "0912345678"
    }
}
```

### 2.11 更新通知狀態

**PATCH** `/scan-events/{event_id}/notify-status`

**Request Body (JSON)**

```sql
{
    "notify_status": "sent", 
    "updated_by": "王爸爸"
}
```

**Response (200 OK)**

```sql
{
    "message": "Notification status updated successfully",
    "data": {
        "event_id": "770e8400-e29b-41d4-a716-446655440000",
        "notify_status": "sent",
        "updated_by": "王爸爸",
        "updated_at": "2026-03-26T14:20:00Z"
    }
}
```

### 2.12 取得檔案預簽名網址 (S3 Presign)

**POST** `/uploads/presign`

**Request Body**

```sql
{
    "file_name": "suspicious_video.mp4",
    "content_type": "video/mp4",
    "file_size": 1837265,
    "purpose": "analysis"
}
```

**Response (200 OK)**

```sql
{
    "upload_url": "https://guardcircle-upload.s3.ap-northeast-1.amazonaws.com/uploads/2026/03/26/550e-video.mp4?X-Amz-Algorithm=...",
    "object_key": "uploads/2026/03/26/550e-video.mp4",
    "bucket": "guardcircle-upload",
    "expires_in": 3600,
    "method": "PUT",
    "headers": {
        "Content-Type": "video/mp4"
    }
}
```

### 2.13 新增家庭成員 (by phone)

**POST** `/families/add-member`

**Request Body**

```sql
{
  "phone": "+886935528625",
  "family_id": "770e8400-e29b-41d4-a716-446655440000"
}
```

**Response (200)**

```json
{
  "message": "Successfully added member to family",
  "data": {
    "user_id": "2bde331c-4871-4d46-ad3d-fe40ab10d59c",
    "phone": "+886935528625",
    "family_id": "770e8400-e29b-41d4-a716-446655440000",
    "family_name": "王家"
  }
}
```
