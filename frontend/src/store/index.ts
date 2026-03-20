import { create } from 'zustand';
import { Role, User, Family, DetectEvent, EventStatus } from '../types';
import { mockUsers, mockFamily, mockEvents as initialEvents } from '../mock';

interface AppState {
  currentUser: User;
  family: Family;
  events: DetectEvent[];
  isLoggedIn: boolean;
  hasFamilyCircle: boolean;
  suggestedRole: Role | null;
  setRole: (role: Role) => void;
  setUser: (user: Partial<User>) => void;
  login: (nickname: string, email: string, birthYear?: number, gender?: string) => void;
  logout: () => void;
  joinFamily: () => void;
  addEvent: (event: DetectEvent) => void;
  setEventStatus: (eventId: string, status: EventStatus, extra?: Partial<DetectEvent>) => void;
  resolveEvent: (eventId: string, gatekeeperResponse: string) => void;
  setMemberStatus: (userId: string, status: 'safe' | 'pending' | 'high_risk') => void;
  generatePairingCode: () => string;
  bindGuardian: (pairingCode: string) => boolean;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: mockUsers[1], // default gatekeeper
  family: mockFamily,
  events: initialEvents,
  isLoggedIn: false,
  hasFamilyCircle: false,
  suggestedRole: null,

  setRole: (role) =>
    set((s) => ({ currentUser: { ...s.currentUser, role } })),

  setUser: (user) =>
    set((s) => ({ currentUser: { ...s.currentUser, ...user } })),

  login: (nickname, email, birthYear, gender) => {
    let suggestedRole: Role | null = null;
    if (birthYear !== undefined) {
      const age = new Date().getFullYear() - birthYear;
      suggestedRole = age <= 18 ? 'solver' : age <= 59 ? 'gatekeeper' : 'guardian';
    }
    const genderMapped = gender === '男' ? 'male' : gender === '女' ? 'female' : gender === '其他' ? 'other' : undefined;
    set((s) => ({
      isLoggedIn: true,
      suggestedRole,
      currentUser: { ...s.currentUser, nickname, email, birthYear, gender: genderMapped },
    }));
  },

  logout: () =>
    set({ isLoggedIn: false, hasFamilyCircle: false }),

  joinFamily: () =>
    set({ hasFamilyCircle: true }),

  addEvent: (event) =>
    set((s) => ({ events: [event, ...s.events] })),

  setEventStatus: (eventId, status, extra = {}) =>
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId ? { ...e, status, ...extra } : e
      ),
    })),

  resolveEvent: (eventId, gatekeeperResponse) => {
    const now = new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 16);
    set((s) => ({
      events: s.events.map((e) =>
        e.id === eventId
          ? { ...e, status: 'safe', resolvedAt: now, gatekeeperResponse, gatekeeperResponseAt: now }
          : e
      ),
    }));
  },

  setMemberStatus: (userId, status) =>
    set((s) => ({
      family: {
        ...s.family,
        members: s.family.members.map((m) =>
          m.id === userId ? { ...m, status } : m
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
          m.id === s.currentUser.id ? { ...m, pairingCode: code, pairingExpiry: expiry } : m
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
        if (m.pairingCode === pairingCode && m.pairingExpiry && m.pairingExpiry > now) {
          found = true;
          return { ...m, pairingCode: undefined, pairingExpiry: undefined };
        }
        return m;
      });
      return { family: { ...s.family, members } };
    });
    return found;
  },
}));
