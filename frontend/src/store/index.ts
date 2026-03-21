import { create } from "zustand";
import { mockEvents as initialEvents, mockFamily, mockUsers } from "../mock";
import {
  DailyChallengeResult,
  DetectEvent,
  EventStatus,
  Family,
  Role,
  User,
} from "../types";

interface RegisteredAccount {
  email: string;
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
  setRole: (role: Role) => void;
  setUser: (user: Partial<User>) => void;
  login: (nickname: string, email: string, birthYear?: number, gender?: string, emergencyPhone?: string, birthMonth?: string, birthDay?: string) => void;
  directLogin: (email: string, password: string) => boolean;
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
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: mockUsers[1], // default gatekeeper
  family: mockFamily,
  events: initialEvents,
  dailyChallengeResults: [],
  isLoggedIn: false,
  hasFamilyCircle: false,
  suggestedRole: null,
  registeredAccounts: [],

  setRole: (role) => set((s) => ({ currentUser: { ...s.currentUser, role } })),

  setUser: (user) =>
    set((s) => ({ currentUser: { ...s.currentUser, ...user } })),

  login: (nickname, email, birthYear, gender, emergencyPhone, birthMonth, birthDay) => {
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
      currentUser: { ...s.currentUser, nickname, email, birthYear, birthMonth, birthDay, gender: genderMapped, emergencyPhone, contributionPoints: 0, reportCount: 0 },
    }));
  },

  saveAccount: (password: string) =>
    set((s) => {
      const existing = s.registeredAccounts.findIndex(
        (a) => a.email === s.currentUser.email,
      );
      const account: RegisteredAccount = {
        email: s.currentUser.email,
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
      };
      const accounts = [...s.registeredAccounts];
      if (existing >= 0) accounts[existing] = account;
      else accounts.push(account);
      return { registeredAccounts: accounts };
    }),

  directLogin: (email: string, password: string) => {
    const accounts = useAppStore.getState().registeredAccounts;
    const account = accounts.find(
      (a) => a.email === email && a.password === password,
    );
    if (!account) return false;
    set((s) => ({
      isLoggedIn: true,
      hasFamilyCircle: account.hasFamilyCircle,
      currentUser: {
        ...s.currentUser,
        nickname: account.nickname,
        email: account.email,
        birthYear: account.birthYear,
        birthMonth: account.birthMonth,
        birthDay: account.birthDay,
        gender: account.gender,
        emergencyPhone: account.emergencyPhone,
        role: account.role,
        contributionPoints: account.contributionPoints ?? 0,
        reportCount: account.reportCount ?? 0,
      },
    }));
    return true;
  },

  logout: () => set({ isLoggedIn: false, hasFamilyCircle: false }),

  joinFamily: () => set({ hasFamilyCircle: true }),

  addEvent: (event) => set((s) => ({ events: [event, ...s.events] })),

  setEventStatus: (eventId, status, extra = {}) =>
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, status, ...extra } : e,
      ),
    })),

  resolveEvent: (eventId, gatekeeperResponse) => {
    const now = new Date()
      .toLocaleString("zh-TW", { hour12: false })
      .slice(0, 16);
    set((s) => ({
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
    }));
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
}));
