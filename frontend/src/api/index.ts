import { api } from './client';
import { Role } from '../types';

// ── 型別 ──────────────────────────────────────────────────────

export type BackendRole = 'guardian' | 'gatekeeper' | 'youth';
export type BackendRiskLevel = 'low' | 'medium' | 'high';

/** 後端 role → 前端 role */
export function mapRole(r: BackendRole): Role {
  return r === 'youth' ? 'solver' : r;
}

/** 後端 risk_level → 前端 RiskLevel */
export function mapRiskLevel(r: BackendRiskLevel): 'safe' | 'medium' | 'high' {
  return r === 'low' ? 'safe' : r;
}

// ── 5.1 建立使用者 ────────────────────────────────────────────

export interface CreateUserReq {
  phone: string;
  password: string;
  nickname: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthday?: string; // 'YYYY-MM-DD'
  role: BackendRole;
  contact_phone: string;
}

export interface CreateUserRes {
  message: string;
  data: { user_id: string; nickname: string; role: BackendRole };
}

export const createUser = (body: CreateUserReq) =>
  api.post<CreateUserRes>('/users', body);

// ── 5.2 取得使用者資料 ────────────────────────────────────────

export interface GetUserRes {
  data: {
    user_id: string;
    family_id: string | null;
    phone: string;
    nickname: string;
    gender: string;
    birthday: string;
    role: BackendRole;
    contact_phone: string;
    created_at: string;
    updated_at: string;
  };
}

export const getUser = (userId: string) =>
  api.get<GetUserRes>(`/users/${userId}`);

// ── 5.3 建立家庭圈 ────────────────────────────────────────────

export interface CreateFamilyReq {
  family_name: string;
  invite_code: string;
  creator_id: string;
}

export interface CreateFamilyRes {
  message: string;
  data: { family_id: string; family_name: string; invite_code: string };
}

export const createFamily = (body: CreateFamilyReq) =>
  api.post<CreateFamilyRes>('/families', body);

// ── 5.4 加入家庭圈 ────────────────────────────────────────────

export interface JoinFamilyReq {
  user_id: string;
  invite_code: string;
}

export interface JoinFamilyRes {
  message: string;
  data: { family_id: string; family_name: string };
}

export const joinFamily = (body: JoinFamilyReq) =>
  api.post<JoinFamilyRes>('/families/join', body);

// ── 5.5 取得家庭圈所有掃描事件 ───────────────────────────────

export interface FamilyScanEvent {
  event_id: string;
  user_id: string;
  user_nickname: string;
  input_type: string; // JSON 字串如 "[\"video\"]" 或 "[\"text\",\"phone\"]"
  input_content: string;
  s3_key?: string;
  media_url?: string;
  risk_level: BackendRiskLevel;
  risk_score: number;
  scam_type: string;
  summary: string;
  consequence: string;
  reason: string;
  risk_factors: string[];
  top_signals: string[];
  notify_status: string;
  updated_by?: string;
  updated_at?: string;
  created_at: string;
}

export interface GetFamilyScanEventsRes {
  family_id: string;
  family_name: string;
  events: FamilyScanEvent[];
}

export const getFamilyScanEvents = (
  familyId: string,
  params?: { limit?: number; offset?: number },
) => {
  const qs = new URLSearchParams();
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));
  const query = qs.toString() ? `?${qs}` : '';
  return api.get<GetFamilyScanEventsRes>(`/families/${familyId}/scan-events${query}`);
};

// ── 5.6 綜合詐騙分析 ─────────────────────────────────────────

export interface AnalysisReq {
  user_id: string;
  input_type: ('text' | 'image' | 'url' | 'phone' | 'video' | 'audio' | 'file')[];
  input_content: string;
  s3_key?: string;
  file_ext?: string;
  region?: string;
  poll?: boolean;
}

export interface AnalysisRes {
  message: string;
  data: {
    event_id: string;
    user_id: string;
    input_type: string;
    input_content: string;
    risk_level: BackendRiskLevel;
    risk_score: number;
    scam_type: string;
    summary: string | null;
    reason: string | null;
    consequence: string | null;
    risk_factors: string[];
    top_signals: string[];
    notify_status: string;
    created_at: string;
  };
}

export const analyze = (body: AnalysisReq) =>
  api.post<AnalysisRes & { data?: AnalysisRes['data']; error?: string }>('/analysis', body);

// ── 5.12 取得檔案預簽名網址 (S3 Presign) ────────────────────

export interface PresignReq {
  file_name: string;
  content_type: string;
  file_size: number;
  purpose: 'analysis';
}

export interface PresignRes {
  upload_url: string;
  object_key: string;
  bucket: string;
  expires_in: number;
  method: 'PUT';
  headers: Record<string, string>;
}

export const presignUpload = (body: PresignReq) =>
  api.post<PresignRes>('/uploads/presign', body);

// ── 5.7 查詢單筆事件詳情 ─────────────────────────────────────

export interface GetUserEventRes {
  data: {
    event_id: string;
    user_id: string;
    input_type: string;
    input_content: string;
    s3_key?: string;
    media_url?: string;
    risk_level: BackendRiskLevel;
    risk_score: number;
    scam_type: string;
    summary: string;
    consequence: string;
    reason: string;
    risk_factors: string[];
    top_signals: string[];
    raw_result?: Record<string, unknown>;
    notify_status: string;
    updated_by?: string;
    updated_at?: string;
    created_at: string;
  };
}

export const getUserEvent = (userId: string, eventId: string) =>
  api.get<GetUserEventRes>(`/users/${userId}/events/${eventId}`);

// ── 5.8 修改個人資料 ─────────────────────────────────────────

export interface PatchUserReq {
  nickname?: string;
  contact_phone?: string;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthday?: string;
  role?: BackendRole;
}

export interface PatchUserRes {
  message: string;
  data: { user_id: string; nickname: string; role: BackendRole; updated_at: string };
}

export const patchUser = (userId: string, body: PatchUserReq) =>
  api.patch<PatchUserRes>(`/users/${userId}`, body);

// ── 5.11 更新通知狀態 ────────────────────────────────────────

export interface PatchNotifyStatusReq {
  notify_status: 'pending' | 'sent' | 'not_required' | 'failed';
  updated_by: string;
}

export interface PatchNotifyStatusRes {
  message: string;
  data: { event_id: string; notify_status: string; updated_by: string; updated_at: string };
}

export const patchNotifyStatus = (eventId: string, body: PatchNotifyStatusReq) =>
  api.patch<PatchNotifyStatusRes>(`/scan-events/${eventId}/notify-status`, body);

// ── 5.9 家庭圈近況 Feed ──────────────────────────────────────

export interface FamilyFeedMember {
  user_id: string;
  nickname: string;
  role: BackendRole;
  last_event: {
    event_id: string;
    risk_level: BackendRiskLevel;
    input_type: string;
    created_at: string;
  } | null;
}

export interface GetFamilyFeedRes {
  family_id: string;
  last_updated: string;
  members_status: FamilyFeedMember[];
}

export const getFamilyFeed = (familyId: string) =>
  api.get<GetFamilyFeedRes>(`/families/${familyId}/feed`);

// ── 5.10 登入 ────────────────────────────────────────────────

export interface LoginReq {
  phone: string;
  password: string;
}

export interface LoginRes {
  message: string;
  data: {
    user_id: string;
    family_id: string | null;
    nickname: string;
    role: BackendRole;
    phone: string;
  };
}

export const login = (body: LoginReq) =>
  api.post<LoginRes>('/auth/login', body);
