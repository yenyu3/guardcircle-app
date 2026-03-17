import { User, Family, DetectEvent, Notification, KnowledgeCard, WeeklyReport } from '../types';

export const mockUsers: User[] = [
  {
    id: 'u1', nickname: '阿嬤', email: 'grandma@example.com',
    role: 'guardian', birthYear: 1950, familyIds: ['f1'], contributionPoints: 0,
  },
  {
    id: 'u2', nickname: '小明', email: 'ming@example.com',
    role: 'gatekeeper', birthYear: 1985, familyIds: ['f1'], contributionPoints: 120,
  },
  {
    id: 'u3', nickname: '阿志', email: 'zhi@example.com',
    role: 'solver', birthYear: 1995, familyIds: ['f1'], contributionPoints: 380,
  },
];

export const mockFamily: Family = {
  id: 'f1',
  name: '林家守護圈',
  code: '482951',
  createdAt: '2024-11-01',
  members: [
    { id: 'u1', nickname: '阿嬤', role: 'guardian', status: 'safe', lastActive: '10分鐘前' },
    { id: 'u2', nickname: '小明', role: 'gatekeeper', status: 'safe', lastActive: '剛剛' },
    { id: 'u3', nickname: '阿志', role: 'solver', status: 'safe', lastActive: '1小時前' },
    { id: 'u4', nickname: '媽媽', role: 'guardian', status: 'pending', lastActive: '30分鐘前' },
  ],
};

export const mockEvents: DetectEvent[] = [
  {
    id: 'e1', userId: 'u1', userNickname: '阿嬤', type: 'text',
    input: '您好，我是台灣銀行客服，您的帳戶有異常交易，請立即操作ATM解除分期付款，否則將凍結帳戶。',
    riskLevel: 'high', riskScore: 94, scamType: '假冒銀行客服',
    summary: '偵測到假冒銀行客服詐騙，要求操作ATM解除分期，為典型詐騙話術。',
    riskFactors: ['要求操作ATM', '假冒官方機構', '製造緊迫感', '威脅凍結帳戶'],
    createdAt: '2025-01-15 14:32',
    gatekeeperResponse: '小明已確認：這是詐騙，請勿理會',
    gatekeeperResponseAt: '2025-01-15 14:35',
  },
  {
    id: 'e2', userId: 'u4', userNickname: '媽媽', type: 'url',
    input: 'https://tw-bank-secure-login.xyz/verify',
    riskLevel: 'high', riskScore: 88, scamType: '釣魚網站',
    summary: '此網址為仿冒銀行登入頁面，域名非官方，疑似釣魚網站。',
    riskFactors: ['非官方域名', '仿冒銀行介面', 'SSL憑證異常', 'Gogolook資料庫標記'],
    createdAt: '2025-01-14 09:15',
  },
  {
    id: 'e3', userId: 'u1', userNickname: '阿嬤', type: 'phone',
    input: '0800-123-456',
    riskLevel: 'medium', riskScore: 55, scamType: '可疑電話',
    summary: '此號碼有多筆民眾回報為詐騙電話，建議謹慎。',
    riskFactors: ['多筆民眾回報', '非官方客服號碼'],
    createdAt: '2025-01-13 16:20',
  },
  {
    id: 'e4', userId: 'u2', userNickname: '小明', type: 'text',
    input: '親愛的用戶，您的包裹因地址不符無法配送，請點擊連結更新資料。',
    riskLevel: 'medium', riskScore: 62, scamType: '假冒物流',
    summary: '偵測到假冒物流通知，要求點擊連結，為常見釣魚手法。',
    riskFactors: ['要求點擊連結', '假冒物流公司', '個資蒐集風險'],
    createdAt: '2025-01-12 11:05',
  },
  {
    id: 'e5', userId: 'u3', userNickname: '阿志', type: 'text',
    input: '明天下午三點開會，記得帶報告。',
    riskLevel: 'safe', riskScore: 5, scamType: '無',
    summary: '此訊息無詐騙特徵，為一般日常訊息。',
    riskFactors: [],
    createdAt: '2025-01-11 08:30',
  },
];

export const mockNotifications: Notification[] = [
  {
    id: 'n1', type: 'HIGH_RISK', title: '⚠️ 阿嬤收到高風險訊息',
    summary: '偵測到假冒銀行客服詐騙，已通知守門人',
    createdAt: '14:32', read: false, eventId: 'e1',
  },
  {
    id: 'n2', type: 'GUARDIAN_REPLY', title: '✅ 小明已回應警報',
    summary: '小明確認：這是詐騙，請阿嬤勿理會',
    createdAt: '14:35', read: false, eventId: 'e1',
  },
  {
    id: 'n3', type: 'ESCALATE', title: '🔴 媽媽點擊了可疑網址',
    summary: '釣魚網站風險分數88，需要立即確認',
    createdAt: '昨天 09:15', read: true, eventId: 'e2',
  },
  {
    id: 'n4', type: 'WEEKLY_REPORT', title: '📊 本週防詐報告出爐',
    summary: '林家守護圈本週攔截3次危險，做得很好！',
    createdAt: '週一', read: true,
  },
  {
    id: 'n5', type: 'CONTRIBUTE_CONFIRM', title: '🎯 你的回報已被採用',
    summary: '你回報的詐騙案例已加入知識庫，獲得+20點',
    createdAt: '週日', read: true,
  },
  {
    id: 'n6', type: 'FAMILY_JOIN', title: '👋 媽媽加入了守護圈',
    summary: '媽媽已成功加入林家守護圈',
    createdAt: '上週', read: true,
  },
];

export const mockKnowledgeCards: KnowledgeCard[] = [
  {
    id: 'k1', scamType: '假冒銀行客服', saved: false,
    signals: ['要求操作ATM或網銀', '聲稱帳戶異常需立即處理', '提供非官方客服電話'],
    exampleScript: '「您好，我是台灣銀行風控部門，您的帳戶偵測到異常交易，為保護您的資產，請立即前往ATM操作解除分期，否則帳戶將在2小時內凍結。」',
    howToRespond: '立即掛斷，直接撥打銀行官方電話（背面號碼）確認，銀行絕不會要求你操作ATM。',
  },
  {
    id: 'k2', scamType: '投資詐騙', saved: true,
    signals: ['保證高報酬低風險', '要求加入私密群組', '初期小額獲利誘惑'],
    exampleScript: '「我有內部消息，這支股票下週必漲，先投個5萬試試，上週我朋友賺了3倍，你要不要一起？」',
    howToRespond: '世界上沒有保證獲利的投資，遇到這類邀請立即封鎖並向165回報。',
  },
  {
    id: 'k3', scamType: '假冒政府機關', saved: false,
    signals: ['自稱警察或檢察官', '說你涉及洗錢案件', '要求轉帳到「保管帳戶」'],
    exampleScript: '「我是刑事局偵查員，你的帳戶被用於洗錢，為配合調查需將存款轉至指定帳戶保管，事後會歸還。」',
    howToRespond: '政府機關絕不會要求轉帳，立即掛斷並撥打165或110確認。',
  },
  {
    id: 'k4', scamType: '網路購物詐騙', saved: false,
    signals: ['超低價商品', '要求私下交易', '收款後消失或寄空包裹'],
    exampleScript: '「全新iPhone 15 Pro只要3000，因為急需用錢，要的話私訊我，用轉帳比較快。」',
    howToRespond: '使用有保障的購物平台，避免私下轉帳交易，價格異常低廉要特別警覺。',
  },
];

export const mockWeeklyReport: WeeklyReport = {
  weekLabel: '2025/01/13 – 01/19',
  totalScans: 12,
  blocked: 3,
  highRisk: 2,
  topScamType: '假冒銀行客服',
  memberStats: [
    { nickname: '阿嬤', scans: 4, blocked: 2 },
    { nickname: '媽媽', scans: 3, blocked: 1 },
    { nickname: '小明', scans: 3, blocked: 0 },
    { nickname: '阿志', scans: 2, blocked: 0 },
  ],
};

export const mockDetectResults = {
  safe: {
    riskLevel: 'safe' as const, riskScore: 8, scamType: '無',
    summary: '此訊息無明顯詐騙特徵，看起來是一般訊息。',
    riskFactors: [],
  },
  medium: {
    riskLevel: 'medium' as const, riskScore: 62, scamType: '假冒物流',
    summary: '偵測到可疑特徵，建議謹慎確認後再行動。',
    riskFactors: ['要求點擊連結', '假冒官方名義', '個資蒐集風險'],
  },
  high: {
    riskLevel: 'high' as const, riskScore: 91, scamType: '假冒銀行客服',
    summary: '高度疑似詐騙！偵測到多項詐騙特徵，請勿依照指示操作。',
    riskFactors: ['要求操作ATM', '假冒官方機構', '製造緊迫感', '威脅凍結帳戶'],
  },
};
