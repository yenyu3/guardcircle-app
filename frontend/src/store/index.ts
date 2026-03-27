import { create } from "zustand";
import { mockDailyChallenges } from "../mock";
import {
  DailyChallengeResult,
  DetectEvent,
  EventStatus,
  Family,
  Role,
  User,
} from "../types";
import * as API from "../api";
import { resolveAvatar } from "../components/NpcAvatar";

interface RegisteredAccount {
  id: string;
  phone: string;
  password: string;
  nickname: string;
  birthYear?: number;
  birthMonth?: string;
  birthDay?: string;
  gender?: 'male' | 'female' | 'other';
  emergencyPhone?: string;
  role: Role;
  hasFamilyCircle: boolean;
  familyId?: string | null;
  contributionPoints?: number;
  reportCount?: number;
  memberStatuses?: Record<string, "safe" | "pending" | "high_risk">;
}

interface AppState {
  currentUser: User;
  family: Family;
  events: DetectEvent[];
  dailyChallengeResults: DailyChallengeResult[];
  isLoggedIn: boolean;
  hasFamilyCircle: boolean;
  suggestedRole: Role | null;
  registeredAccounts: RegisteredAccount[];
  // 後端真實 ID
  userId: string | null;
  familyId: string | null;
  setRole: (role: Role) => void;
  setUser: (user: Partial<User>) => void;
  login: (nickname: string, phone: string, birthYear?: number, gender?: string, emergencyPhone?: string, birthMonth?: string, birthDay?: string) => void;
  directLogin: (phone: string, password: string) => boolean;
  // 真實 API 登入
  apiLogin: (phone: string, password: string) => Promise<void>;
  // 真實 API 註冊
  apiRegister: (params: {
    phone: string; password: string; nickname: string;
    gender?: 'male' | 'female' | 'other' | 'unknown';
    birthday?: string; role: API.BackendRole; contact_phone: string;
  }) => Promise<void>;
  // 真實 API 建立家庭圈
  apiCreateFamily: (familyName: string, inviteCode: string) => Promise<{ family_id: string; invite_code: string }>;
  // 真實 API 加入家庭圈
  apiJoinFamily: (inviteCode: string) => Promise<void>;
  // 真實 API 拉取家庭圈成員
  apiFetchFamily: () => Promise<void>;
  // 真實 API 新增家庭圈成員（手機號碼）
  apiAddFamilyMember: (phone: string) => Promise<void>;
  // Polling
  startFamilyPolling: () => void;
  stopFamilyPolling: () => void;
  _pollingTimer: ReturnType<typeof setInterval> | null;
  // 真實 API 分析
  apiAnalyze: (params: { input_type: 'text' | 'image' | 'url' | 'phone' | 'video' | 'audio' | 'file' | ('text' | 'image' | 'url' | 'phone' | 'video' | 'audio' | 'file')[]; content: string; file_ext?: string; attachmentUri?: string; mimeType?: string; fileName?: string }) => Promise<API.AnalysisRes['data']>;
  // 真實 API 更新個人資料
  apiPatchUser: (body: API.PatchUserReq) => Promise<void>;
  logout: () => void;
  joinFamily: () => void;
  addEvent: (event: DetectEvent) => void;
  setEventStatus: (
    eventId: string,
    status: EventStatus,
    extra?: Partial<DetectEvent>,
  ) => void;
  resolveEvent: (eventId: string, gatekeeperResponse: string) => Promise<void>;
  setMemberStatus: (
    userId: string,
    status: "safe" | "pending" | "high_risk",
  ) => void;
  generatePairingCode: () => string;
  bindGuardian: (pairingCode: string) => boolean;
  saveAccount: (password?: string) => void;
  addContributionPoints: (points: number) => void;
  addReport: () => void;
  submitDailyChallengeResult: (
    payload: Omit<DailyChallengeResult, "userId">,
  ) => void;
  elderMode: boolean;
  toggleElderMode: () => void;
  blacklistKeywords: string[];
  setBlacklistKeywords: (keywords: string[]) => void;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: {
    id: "",
    nickname: "",
    phone: "",
    role: "gatekeeper" as Role,
    familyIds: [],
    contributionPoints: 0,
    reportCount: 0,
  },
  family: {
    id: "",
    name: "",
    code: "",
    members: [],
    createdAt: "",
  },
  events: [],
  dailyChallengeResults: [],
  elderMode: true,
  isLoggedIn: false,
  hasFamilyCircle: false,
  suggestedRole: null,
  registeredAccounts: [],
  userId: null,
  familyId: null,
  _pollingTimer: null,

  setRole: (role) => set((s) => ({ currentUser: { ...s.currentUser, role } })),

  setUser: (user) =>
    set((s) => ({ currentUser: { ...s.currentUser, ...user } })),

  login: (nickname, phone, birthYear, gender, emergencyPhone, birthMonth, birthDay) => {
    let suggestedRole: Role | null = null;
    if (birthYear !== undefined) {
      const age = new Date().getFullYear() - birthYear;
      suggestedRole =
        age <= 18 ? "solver" : age <= 59 ? "gatekeeper" : "guardian";
    }
    const genderMapped =
      gender === "男"
        ? "male"
        : gender === "女"
          ? "female"
          : gender === "其他"
            ? "other"
            : undefined;
    set((s) => ({
      isLoggedIn: true,
      suggestedRole,
      currentUser: { ...s.currentUser, nickname, phone, birthYear, birthMonth, birthDay, gender: genderMapped, emergencyPhone, contributionPoints: 0, reportCount: 0 },
    }));
  },

  saveAccount: (password?: string) =>
    set((s) => {
      const existing = s.registeredAccounts.findIndex(
        (a) => a.phone === s.currentUser.phone,
      );
      const memberStatuses: Record<string, "safe" | "pending" | "high_risk"> = {};
      s.family.members.forEach((m) => { memberStatuses[m.id] = m.status; });
      const resolvedPassword = password ?? s.registeredAccounts[existing]?.password ?? '';
      const account: RegisteredAccount = {
        id: s.currentUser.id || s.currentUser.phone,
        phone: s.currentUser.phone,
        password: resolvedPassword,
        nickname: s.currentUser.nickname,
        birthYear: s.currentUser.birthYear,
        birthMonth: s.currentUser.birthMonth,
        birthDay: s.currentUser.birthDay,
        gender: s.currentUser.gender,
        emergencyPhone: s.currentUser.emergencyPhone,
        role: s.currentUser.role,
        hasFamilyCircle: s.hasFamilyCircle,
        familyId: s.familyId,
        contributionPoints: s.currentUser.contributionPoints ?? 0,
        reportCount: s.currentUser.reportCount ?? 0,
        memberStatuses,
      };
      const accounts = [...s.registeredAccounts];
      if (existing >= 0) accounts[existing] = account;
      else accounts.push(account);
      return { registeredAccounts: accounts };
    }),

  directLogin: (phone: string, password: string) => {
    const accounts = useAppStore.getState().registeredAccounts;
    const account = accounts.find(
      (a) => a.phone === phone && a.password === password,
    );
    if (!account) return false;
    set((s) => ({
      isLoggedIn: true,
      hasFamilyCircle: account.hasFamilyCircle,
      familyId: account.familyId ?? null,
      currentUser: {
        ...s.currentUser,
        id: account.id || account.phone,
        nickname: account.nickname,
        phone: account.phone,
        birthYear: account.birthYear,
        birthMonth: account.birthMonth,
        birthDay: account.birthDay,
        gender: account.gender,
        emergencyPhone: account.emergencyPhone,
        role: account.role,
        contributionPoints: account.contributionPoints ?? 0,
        reportCount: account.reportCount ?? 0,
      },
      family: account.memberStatuses
        ? {
            ...s.family,
            members: s.family.members.map((m) => ({
              ...m,
              status: account.memberStatuses![m.id] ?? m.status,
            })),
          }
        : s.family,
    }));
    return true;
  },

  apiLogin: async (phone, password) => {
    const res = await API.login({ phone, password });
    const d = res.data;
    const role = API.mapRole(d.role);
    set((s) => ({
      isLoggedIn: true,
      userId: d.user_id,
      familyId: d.family_id,
      hasFamilyCircle: !!d.family_id,
      currentUser: { ...s.currentUser, id: d.user_id, nickname: d.nickname, phone, role },
    }));
    // 補抓完整個人資料 + 家庭圈資料（並行）
    try {
      const fetches: Promise<unknown>[] = [API.getUser(d.user_id)];
      if (d.family_id) fetches.push(useAppStore.getState().apiFetchFamily());
      const [userRes] = await Promise.all(fetches) as [Awaited<ReturnType<typeof API.getUser>>, ...unknown[]];
      const u = userRes.data;
      const g = u.gender as 'male' | 'female' | 'other' | undefined;
      const [by, bm, bd] = u.birthday ? u.birthday.split('-') : [];
      set((s) => ({
        currentUser: {
          ...s.currentUser,
          gender: g,
          emergencyPhone: u.contact_phone || undefined,
          birthYear: by ? parseInt(by, 10) : undefined,
          birthMonth: bm || undefined,
          birthDay: bd || undefined,
        },
      }));
    } catch {}
  },

  apiRegister: async ({ phone, password, nickname, gender, birthday, role, contact_phone }) => {
    const res = await API.createUser({ phone, password, nickname, gender, birthday, role, contact_phone });
    const frontendRole = API.mapRole(res.data.role);
    set((s) => ({
      isLoggedIn: true,
      userId: res.data.user_id,
      currentUser: { ...s.currentUser, id: res.data.user_id, nickname, phone, role: frontendRole },
    }));
  },

  apiCreateFamily: async (familyName, inviteCode) => {
    const { userId } = useAppStore.getState();
    if (!userId) throw new Error('not logged in');
    const payload = { family_name: familyName, invite_code: inviteCode, creator_id: userId };
    console.log('[apiCreateFamily] payload:', JSON.stringify(payload, null, 2));
    const res = await API.createFamily(payload);
    set((s) => ({
      familyId: res.data.family_id,
      hasFamilyCircle: true,
      family: { ...s.family, id: res.data.family_id, name: res.data.family_name, code: res.data.invite_code },
    }));
    return { family_id: res.data.family_id, invite_code: res.data.invite_code };
  },

  apiJoinFamily: async (inviteCode) => {
    const { userId } = useAppStore.getState();
    if (!userId) throw new Error('not logged in');
    const payload = { user_id: userId, invite_code: inviteCode };
    console.log('[apiJoinFamily] payload:', JSON.stringify(payload, null, 2));
    const res = await API.joinFamily(payload);
    set((s) => ({
      familyId: res.data.family_id,
      hasFamilyCircle: true,
      family: { ...s.family, id: res.data.family_id, name: res.data.family_name },
    }));
  },

  apiAddFamilyMember: async (phone) => {
    const { familyId } = useAppStore.getState();
    if (!familyId) throw new Error('no family');
    await API.addFamilyMember({ phone, family_id: familyId });
    await useAppStore.getState().apiFetchFamily();
  },

  apiFetchFamily: async () => {
    const { familyId, currentUser } = useAppStore.getState();
    if (!familyId) return;

    // 分頁全量拉取所有揃描事件
    const PAGE = 100;
    let offset = 0;
    let allEvents: API.FamilyScanEvent[] = [];
    let familyName = '';
    while (true) {
      const res = await API.getFamilyScanEvents(familyId, { limit: PAGE, offset });
      familyName = res.family_name;
      allEvents = allEvents.concat(res.events);
      if (res.events.length < PAGE) break;
      offset += PAGE;
    }

    const feedRes = await API.getFamilyFeed(familyId);

    const members: import('../types').FamilyMember[] = feedRes.members_status.map((m) => ({
      id: m.user_id,
      nickname: m.nickname,
      role: m.user_id === currentUser.id ? currentUser.role : API.mapRole(m.role),
      avatar: resolveAvatar(API.mapRole(m.role), m.user_id),
      status: m.last_event
        ? (m.last_event.risk_level === 'high' ? 'high_risk' : m.last_event.risk_level === 'medium' ? 'pending' : 'safe')
        : 'safe',
      lastActive: m.last_event ? formatDate(m.last_event.created_at) : '',
    }));
    const events: import('../types').DetectEvent[] = allEvents.map((e) => {
      // input_type 後端回傳 JSON 字串如 "[\"video\"]"，解析取第一個
      let parsedType: import('../types').DetectType = 'text';
      try {
        const arr = JSON.parse(e.input_type);
        if (Array.isArray(arr) && arr.length > 0) parsedType = arr[0] as import('../types').DetectType;
      } catch {
        parsedType = e.input_type as import('../types').DetectType;
      }
      // media_url 含 \u0026 編碼，decodeURIComponent 轉換
      const mediaUrl = e.media_url ? decodeURIComponent(e.media_url.replace(/\\u0026/g, '&')) : undefined;
      // 圖片類型的 input_content 是 base64，不應顯示為文字
      const isBase64 = parsedType === 'image' && e.input_content && e.input_content.length > 100 && !/\s/.test(e.input_content.slice(0, 50));
      return {
        id: e.event_id,
        userId: e.user_id,
        userNickname: e.user_nickname,
        type: parsedType,
        input: isBase64 ? '' : e.input_content,
        attachmentUri: mediaUrl,
        riskLevel: API.mapRiskLevel(e.risk_level),
        riskScore: e.risk_score,
        scamType: e.scam_type,
        summary: e.summary,
        reason: e.reason,
        consequence: e.consequence,
        riskFactors: e.risk_factors ?? [],
        topSignals: e.top_signals ?? [],
        createdAt: formatDate(e.created_at),
        status: (e.notify_status === 'sent' || e.notify_status === 'not_required')
          ? 'safe'
          : e.risk_level === 'high' ? 'high_risk' : e.risk_level === 'medium' ? 'pending' : 'safe',
        gatekeeperResponse: e.updated_by || undefined,
        gatekeeperResponseAt: e.updated_at ? formatDate(e.updated_at) : undefined,
      };
    });
    set((s) => ({
      family: { ...s.family, id: familyId, name: familyName || s.family.name, members },
      events,
    }));
  },

  apiAnalyze: async ({ input_type, content, file_ext, attachmentUri, mimeType, fileName }) => {
    const { userId } = useAppStore.getState();
    if (!userId) throw new Error('not logged in');

    const types = Array.isArray(input_type) ? input_type : [input_type];
    const needsS3 = types.some((t) => t === 'video' || t === 'audio' || t === 'file');

    console.log('[apiAnalyze] entry:', { types, needsS3, hasAttachmentUri: !!attachmentUri, fileName, mimeType });

    let s3Key: string | undefined;
    let resolvedExt = file_ext;
    if (needsS3 && attachmentUri && fileName) {
      resolvedExt = fileName.split('.').pop()?.toLowerCase() ?? file_ext ?? '';
      const resolvedMime = mimeType ?? 'application/octet-stream';

      console.log('[S3] presign request:', { fileName, resolvedMime, resolvedExt, attachmentUri });

      // 1. 取得 presign URL
      const presign = await API.presignUpload({
        file_name: fileName,
        content_type: resolvedMime,
        file_size: 0,
        purpose: 'analysis',
      });
      console.log('[S3] presign response:', presign);

      // 2. 上傳檔案到 S3（直接用 fetch PUT，不走 API Gateway）
      const uploadRes = await fetch(presign.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': resolvedMime },
        body: await (await fetch(attachmentUri)).blob(),
      });
      console.log('[S3] upload status:', uploadRes.status);
      if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);
      s3Key = presign.object_key;
    }

    const payload: API.AnalysisReq = {
      user_id: userId,
      input_type: types as API.AnalysisReq['input_type'],
      input_content: s3Key ? 'presigned' : content,
      ...(s3Key && { s3_key: s3Key }),
      ...(resolvedExt && { file_ext: resolvedExt }),
    };

    console.log('[Analysis] payload:', payload);

    // 3. 呼叫分析 API，遇 503/202 則 retry（video 最多 5 分鐘）
    const MAX_WAIT_MS = 5 * 60 * 1000;
    const INITIAL_DELAY_MS = needsS3 ? 10_000 : 0;
    const RETRY_INTERVAL_MS = 10_000;

    if (INITIAL_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, INITIAL_DELAY_MS));
    }

    const startTime = Date.now();
    let isPoll = false;
    while (true) {
      try {
        const res = await API.analyze({ ...payload, ...(isPoll && { poll: true }) });
        console.log('[Analysis] response message:', res.message, 'error:', res.error);
        const stillInProgress =
          res.message === 'Service Unavailable' ||
          !!(res.error ?? '').toLowerCase().includes('in progress') ||
          !res.data;
        if (!stillInProgress) {
          return res.data!;
        }
      } catch (e) {
        // network error 也當作 in-progress 處理，繼續 retry
        console.log('[Analysis] fetch error, will retry:', e);
      }
      if (Date.now() - startTime >= MAX_WAIT_MS) throw new Error('Analysis timed out');
      isPoll = true;
      await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    }
  },

  apiPatchUser: async (body) => {
    const { userId } = useAppStore.getState();
    if (!userId) throw new Error('not logged in');
    const res = await API.patchUser(userId, body);
    const [by, bm, bd] = body.birthday ? body.birthday.split('-') : [];
    set((s) => ({
      currentUser: {
        ...s.currentUser,
        nickname: res.data.nickname,
        role: API.mapRole(res.data.role),
        ...(body.contact_phone !== undefined && { emergencyPhone: body.contact_phone || undefined }),
        ...(body.gender !== undefined && { gender: body.gender }),
        ...(body.birthday !== undefined && { birthYear: by ? parseInt(by, 10) : undefined, birthMonth: bm || undefined, birthDay: bd || undefined }),
      },
    }));
  },

  startFamilyPolling: () => {
    const state = useAppStore.getState();
    if (state._pollingTimer || !state.familyId) return;
    const timer = setInterval(() => {
      useAppStore.getState().apiFetchFamily().catch(() => {});
    }, 30_000);
    set({ _pollingTimer: timer });
  },

  stopFamilyPolling: () => {
    const { _pollingTimer } = useAppStore.getState();
    if (_pollingTimer) clearInterval(_pollingTimer);
    set({ _pollingTimer: null });
  },

  logout: () => {
    const { _pollingTimer } = useAppStore.getState();
    if (_pollingTimer) clearInterval(_pollingTimer);
    set({
      isLoggedIn: false,
      hasFamilyCircle: false,
      userId: null,
      familyId: null,
      _pollingTimer: null,
      events: [],
      family: { id: '', name: '', code: '', members: [], createdAt: '' },
    });
  },

  joinFamily: () => set({ hasFamilyCircle: true }),

  addEvent: (event) => set((s) => {
    if (s.events.some((e) => e.id === event.id)) return s;
    return { events: [event, ...s.events] };
  }),

  setEventStatus: (eventId, status, extra = {}) =>
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, status, ...extra } : e,
      ),
    })),

  resolveEvent: async (eventId, gatekeeperResponse) => {
    const now = formatDate(new Date().toISOString());
    const { currentUser, events } = useAppStore.getState();
    // 先更新本地，讓 UI 即時反映
    set((s) => {
      const targetEvent = s.events.find((e) => e.id === eventId);
      const updatedMembers = targetEvent
        ? s.family.members.map((m) =>
            m.id === targetEvent.userId ? { ...m, status: 'safe' as const } : m,
          )
        : s.family.members;
      return {
        events: s.events.map((e) =>
          e.id === eventId
            ? { ...e, status: 'safe', resolvedAt: now, gatekeeperResponse, gatekeeperResponseAt: now }
            : e,
        ),
        family: { ...s.family, members: updatedMembers },
      };
    });
    // 寫回後端，讓其他守門人的 polling 能同步到
    try {
      await API.patchNotifyStatus(eventId, {
        notify_status: 'sent',
        updated_by: currentUser.nickname,
      });
    } catch {}
  },

  setMemberStatus: (userId, status) =>
    set((s) => ({
      family: {
        ...s.family,
        members: s.family.members.map((m) =>
          m.id === userId ? { ...m, status } : m,
        ),
      },
    })),

  generatePairingCode: () => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const expiry = Date.now() + 10 * 60 * 1000; // 10 分鐘
    set((s) => ({
      family: {
        ...s.family,
        members: s.family.members.map((m) =>
          m.id === s.currentUser.id
            ? { ...m, pairingCode: code, pairingExpiry: expiry }
            : m,
        ),
      },
    }));
    return code;
  },

  bindGuardian: (pairingCode) => {
    let found = false;
    set((s) => {
      const now = Date.now();
      const members = s.family.members.map((m) => {
        if (
          m.pairingCode === pairingCode &&
          m.pairingExpiry &&
          m.pairingExpiry > now
        ) {
          found = true;
          return { ...m, pairingCode: undefined, pairingExpiry: undefined };
        }
        return m;
      });
      return { family: { ...s.family, members } };
    });
    return found;
  },

  submitDailyChallengeResult: (payload) =>
    set((s) => {
      const record: DailyChallengeResult = {
        userId: s.currentUser.id,
        ...payload,
      };
      const index = s.dailyChallengeResults.findIndex(
        (r) => r.userId === record.userId && r.dateKey === record.dateKey,
      );
      if (index >= 0) {
        const next = [...s.dailyChallengeResults];
        next[index] = record;
        return { dailyChallengeResults: next };
      }
      return { dailyChallengeResults: [record, ...s.dailyChallengeResults] };
    }),

  addContributionPoints: (points) =>
    set((s) => ({
      currentUser: {
        ...s.currentUser,
        contributionPoints: (s.currentUser.contributionPoints ?? 0) + points,
      },
    })),

  addReport: () =>
    set((s) => ({
      currentUser: {
        ...s.currentUser,
        reportCount: (s.currentUser.reportCount ?? 0) + 1,
      },
    })),

  toggleElderMode: () => set((s) => ({ elderMode: !s.elderMode })),

  blacklistKeywords: [],
  setBlacklistKeywords: (keywords) => set({ blacklistKeywords: keywords }),
}));
