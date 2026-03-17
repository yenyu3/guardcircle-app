import { create } from 'zustand';
import { Role, User, Family } from '../types';
import { mockUsers, mockFamily } from '../mock';

interface AppState {
  currentUser: User;
  family: Family;
  isLoggedIn: boolean;
  hasFamilyCircle: boolean;
  setRole: (role: Role) => void;
  setUser: (user: Partial<User>) => void;
  login: (nickname: string, email: string) => void;
  logout: () => void;
  joinFamily: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: mockUsers[1], // default gatekeeper
  family: mockFamily,
  isLoggedIn: false,
  hasFamilyCircle: false,

  setRole: (role) =>
    set((s) => ({ currentUser: { ...s.currentUser, role } })),

  setUser: (user) =>
    set((s) => ({ currentUser: { ...s.currentUser, ...user } })),

  login: (nickname, email) =>
    set((s) => ({
      isLoggedIn: true,
      currentUser: { ...s.currentUser, nickname, email },
    })),

  logout: () =>
    set({ isLoggedIn: false, hasFamilyCircle: false }),

  joinFamily: () => set({ hasFamilyCircle: true }),
}));
