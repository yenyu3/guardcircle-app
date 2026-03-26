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
  // 真實 API 分析
  apiAnalyze: (params: { input_type: 'text' | 'image' | 'url' | 'phone'; content: string; file_ext?: string }) => Promise<API.AnalysisRes['data']>;
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
  resolveEvent: (eventId: string, gatekeeperResponse: string) => void;
  setMemberStatus: (
    userId: string,
    status: "safe" | "pending" | "high_risk",
  ) => void;
  generatePairingCode: () => string;
  bindGuardian: (pairingCode: string) => boolean;
  saveAccount: (password: string) => void;
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

  saveAccount: (password: string) =>
    set((s) => {
      const existing = s.registeredAccounts.findIndex(
        (a) => a.phone === s.currentUser.phone,
      );
      const memberStatuses: Record<string, "safe" | "pending" | "high_risk"> = {};
      s.family.members.forEach((m) => { memberStatuses[m.id] = m.status; });
      const account: RegisteredAccount = {
        phone: s.currentUser.phone,
        password,
        nickname: s.currentUser.nickname,
        birthYear: s.currentUser.birthYear,
        birthMonth: s.currentUser.birthMonth,
        birthDay: s.currentUser.birthDay,
        gender: s.currentUser.gender,
        emergencyPhone: s.currentUser.emergencyPhone,
        role: s.currentUser.role,
        hasFamilyCircle: s.hasFamilyCircle,
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
      currentUser: {
        ...s.currentUser,
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
      currentUser: { ...s.currentUser, nickname: d.nickname, phone, role },
    }));
    // 補抓 gender 以還原頭貼
    try {
      const userRes = await API.getUser(d.user_id);
      const g = userRes.data.gender as 'male' | 'female' | 'other' | undefined;
      set((s) => ({ currentUser: { ...s.currentUser, gender: g } }));
    } catch {}
  },

  apiRegister: async ({ phone, password, nickname, gender, birthday, role, contact_phone }) => {
    const res = await API.createUser({ phone, password, nickname, gender, birthday, role, contact_phone });
    const frontendRole = API.mapRole(res.data.role);
    set((s) => ({
      isLoggedIn: true,
      userId: res.data.user_id,
      currentUser: { ...s.currentUser, nickname, phone, role: frontendRole },
    }));
  },

  apiCreateFamily: async (familyName, inviteCode) => {
    const { userId } = useAppStore.getState();
    if (!userId) throw new Error('not logged in');
    const res = await API.createFamily({ family_name: familyName, invite_code: inviteCode, creator_id: userId });
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
    const res = await API.joinFamily({ user_id: userId, invite_code: inviteCode });
    set((s) => ({
      familyId: res.data.family_id,
      hasFamilyCircle: true,
      family: { ...s.family, id: res.data.family_id, name: res.data.family_name },
    }));
  },

  apiFetchFamily: async () => {
    const { familyId } = useAppStore.getState();
    if (!familyId) return;
    const [feedRes, scanRes] = await Promise.all([
      API.getFamilyFeed(familyId),
      API.getFamilyScanEvents(familyId),
    ]);

    const members: import('../types').FamilyMember[] = feedRes.members_status.map((m) => ({
      id: m.user_id,
      nickname: m.nickname,
      role: API.mapRole(m.role),
      avatar: resolveAvatar(API.mapRole(m.role), m.user_id),
      status: m.last_event
        ? (m.last_event.risk_level === 'high' ? 'high_risk' : m.last_event.risk_level === 'medium' ? 'pending' : 'safe')
        : 'safe',
      lastActive: m.last_event ? formatDate(m.last_event.created_at) : '',
    }));
    const events: import('../types').DetectEvent[] = scanRes.events.map((e) => {
      const existing = useAppStore.getState().events.find((ev) => ev.id === e.event_id);
      // 若本地已 resolve，保留本地狀態不被後端覆蓋
      if (existing?.resolvedAt) return existing;
      return {
        id: e.event_id,
        userId: e.user_id,
        userNickname: e.user_nickname,
        type: e.input_type,
        input: e.input_content,
        riskLevel: API.mapRiskLevel(e.risk_level),
        riskScore: e.risk_score,
        scamType: e.scam_type,
        summary: e.summary,
        riskFactors: e.risk_factors ?? [],
        createdAt: formatDate(e.created_at),
        status: e.risk_level === 'high' ? 'high_risk' : e.risk_level === 'medium' ? 'pending' : 'safe',
      };
    });
    set((s) => ({
      family: { ...s.family, id: familyId, name: scanRes.family_name || s.family.name, members },
      events,
    }));
  },

  apiAnalyze: async ({ input_type, content, file_ext }) => {
    const { userId } = useAppStore.getState();
    if (!userId) throw new Error('not logged in');
    const res = await API.analyze({ user_id: userId, input_type: [input_type], input_content: content, file_ext });
    return res.data;
  },

  apiPatchUser: async (body) => {
    const { userId } = useAppStore.getState();
    if (!userId) throw new Error('not logged in');
    const res = await API.patchUser(userId, body);
    set((s) => ({
      currentUser: {
        ...s.currentUser,
        nickname: res.data.nickname,
        role: API.mapRole(res.data.role),
      },
    }));
  },

  logout: () => set({ isLoggedIn: false, hasFamilyCircle: false, userId: null, familyId: null }),

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

  resolveEvent: (eventId, gatekeeperResponse) => {
    const now = formatDate(new Date().toISOString());
    set((s) => {
      const targetEvent = s.events.find((e) => e.id === eventId);
      const updatedMembers = targetEvent
        ? s.family.members.map((m) =>
            m.id === targetEvent.userId ? { ...m, status: "safe" as const } : m,
          )
        : s.family.members;
      return {
        events: s.events.map((e) =>
          e.id === eventId
            ? {
                ...e,
                status: "safe",
                resolvedAt: now,
                gatekeeperResponse,
                gatekeeperResponseAt: now,
              }
            : e,
        ),
        family: { ...s.family, members: updatedMembers },
      };
    });
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
