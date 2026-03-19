import { create } from 'zustand';
import { Role, User, Family } from '../types';
import { mockUsers, mockFamily } from '../mock';

interface AppState {
  currentUser: User;
  family: Family;
  isLoggedIn: boolean;
  hasFamilyCircle: boolean;
  suggestedRole: Role | null;
  setRole: (role: Role) => void;
  setUser: (user: Partial<User>) => void;
  login: (nickname: string, email: string, birthYear?: number, gender?: string) => void;
  logout: () => void;
  joinFamily: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: mockUsers[1], // default gatekeeper
  family: mockFamily,
  isLoggedIn: false,
  hasFamilyCircle: false,
  suggestedRole: null,

  setRole: (role) =>
    set((s) => ({ currentUser: { ...s.currentUser, role } })),

  setUser: (user) =>
    set((s) => ({ currentUser: { ...s.currentUser, ...user } })),

  login: (nickname: string, email: string, birthYear?: number, gender?: string) => {
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

  joinFamily: () => set({ hasFamilyCircle: true }),
}));
