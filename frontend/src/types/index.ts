export type Role = "guardian" | "gatekeeper" | "solver";
export type RiskLevel = "safe" | "medium" | "high";
export type DetectType = "text" | "url" | "phone" | "image";
// safe: 常態 | high_risk: 等待守門人救援 | pending: 已發出協助請求
export type EventStatus = "safe" | "high_risk" | "pending";

export interface User {
  id: string;
  nickname: string;
  email: string;
  role: Role;
  birthYear?: number;
  birthMonth?: string;
  birthDay?: string;
  gender?: 'male' | 'female' | 'other';
  emergencyPhone?: string;
  avatar?: string;
  familyIds: string[];
  contributionPoints?: number;
  reportCount?: number;
}

export interface FamilyMember {
  id: string;
  nickname: string;
  role: Role;
  status: "safe" | "pending" | "high_risk";
  lastActive: string;
  avatar?: string;
  pairingCode?: string; // 守護者臨時配對碼（4位數字）
  pairingExpiry?: number; // 配對碼過期時間 timestamp
}

export interface Family {
  id: string;
  name: string;
  code: string;
  members: FamilyMember[];
  createdAt: string;
}

export interface DetectEvent {
  id: string;
  userId: string;
  userNickname: string;
  type: DetectType;
  input: string;
  imageUri?: string;
  attachmentUri?: string;
  riskLevel: RiskLevel;
  riskScore: number;
  scamType: string;
  summary: string;
  riskFactors: string[];
  createdAt: string;
  status: EventStatus;
  resolvedAt?: string;
  gatekeeperResponse?: string;
  gatekeeperResponseAt?: string;
  isMock?: boolean;
}

export interface Notification {
  id: string;
  type:
    | "HIGH_RISK"
    | "GUARDIAN_REPLY"
    | "ESCALATE"
    | "WEEKLY_REPORT"
    | "CONTRIBUTE_CONFIRM"
    | "FAMILY_JOIN";
  title: string;
  summary: string;
  createdAt: string;
  read: boolean;
  eventId?: string;
}

export interface KnowledgeCard {
  id: string;
  scamType: string;
  signals: string[];
  exampleScript: string;
  howToRespond: string;
  saved: boolean;
}

export interface WeeklyReport {
  weekLabel: string;
  totalScans: number;
  blocked: number;
  highRisk: number;
  topScamType: string;
  memberStats: { nickname: string; scans: number; blocked: number }[];
}

export type DailyChallengeType = "single_choice" | "true_false";

export interface DailyChallengeQuestion {
  id: number;
  type: DailyChallengeType;
  category: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  source_url: string;
  source_title: string;
}

export interface DailyChallengeResult {
  userId: string;
  dateKey: string;
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
}
