import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store';
import { DetectEvent, RiskLevel } from '../../types';
import { useElderStyle } from '../../hooks/useElderStyle';

const STEPS = [
  { label: 'Gogolook 資料庫查詢' },
  { label: 'AI 語意分析' },
  { label: '產生風險報告' },
];

// 附件類型 → mock 分析結果
function analyzeAttachment(type: string): ReturnType<typeof analyze> {
  if (type === 'image') return {
    riskLevel: 'medium', riskScore: 62, scamType: '可疑截圖',
    summary: '圖片中偵測到可疑文字特徵，建議謹慎確認來源。',
    riskFactors: ['圖片含可疑文字', '來源不明'],
    reason: '圖片中偵測到可疑文字特徵，建議謹慎確認來源。',
  };
  if (type === 'video') return {
    riskLevel: 'medium', riskScore: 55, scamType: '可疑影音',
    summary: '影音檔案需進一步後端分析，目前顯示初步結果。',
    riskFactors: ['影音內容待審查'],
    reason: '影音檔案需進一步後端分析，目前顯示初步結果。',
  };
  return {
    riskLevel: 'safe', riskScore: 8, scamType: '無',
    summary: '檔案無明顯詐騙特徵，仍建議確認來源。',
    riskFactors: [],
    reason: '檔案無明顯詐騙特徵，仍建議確認來源。',
  };
}

// ── 關鍵字規則 ──────────────────────────────────────────────────
const HIGH_KEYWORDS = [
  'ATM', '解除分期', '匯款', '轉帳', '提款機', '保管費', '操作ATM',
  'bank-secure', 'secure-login', '凍結帳戶', '警察', '檢察官', '洗錢',
  '保管帳戶', '手續費', '保證金', '解除設定',
];
const MEDIUM_KEYWORDS = [
  '包裹', '物流', '點擊連結', '更新資料', '驗證', '中獎', '免費領取',
  '限時優惠', '帳號異常', '密碼', '個人資料', '身分證', '投資', '獲利',
  '內部消息', '私密群組', '0800',
];
const HIGH_URL_PATTERNS = ['secure-login', 'bank-verify', 'tw-bank', 'verify-account', '.xyz', '.top', '.cc'];
const MEDIUM_URL_PATTERNS = ['free', 'prize', 'lucky', 'win', 'click'];

function analyze(type: string, input: string): { riskLevel: RiskLevel; riskScore: number; scamType: string; summary: string; riskFactors: string[]; reason: string } {
  const lower = input.toLowerCase();

  if (type === 'url') {
    if (HIGH_URL_PATTERNS.some((p) => lower.includes(p))) {
      return {
        riskLevel: 'high', riskScore: 88, scamType: '釣魚網站',
        summary: '此網址疑似仿冒官方網站，域名異常，請勿點擊或輸入任何資料。',
        riskFactors: ['非官方域名', '仿冒官方介面', 'SSL 憑證異常'],
        reason: '網址包含仿冒官方網站的域名特徵，並偵測到 SSL 憑證異常。',
      };
    }
    if (MEDIUM_URL_PATTERNS.some((p) => lower.includes(p))) {
      return {
        riskLevel: 'medium', riskScore: 58, scamType: '可疑連結',
        summary: '此連結含有可疑特徵，建議謹慎確認來源後再點擊。',
        riskFactors: ['可疑關鍵字', '來源不明'],
        reason: '連結中包含常見詐騙關鍵字，來源無法確認。',
      };
    }
  }

  if (type === 'phone') {
    const digits = input.replace(/\D/g, '');
    if (digits.startsWith('0800') || digits.startsWith('0900')) {
      return {
        riskLevel: 'medium', riskScore: 55, scamType: '可疑電話',
        summary: '此號碼類型常見於詐騙來電，有多筆民眾回報紀錄，建議謹慎。',
        riskFactors: ['多筆民眾回報', '非官方客服號碼'],
        reason: '此號碼已有多筆民眾回報為詐騙來電，非官方客服號碼。',
      };
    }
  }

  const hitHigh = HIGH_KEYWORDS.filter((k) => input.includes(k));
  if (hitHigh.length > 0) {
    return {
      riskLevel: 'high', riskScore: Math.min(70 + hitHigh.length * 8, 98), scamType: '假冒官方詐騙',
      summary: '偵測到多項高風險詐騙特徵，請勿依照指示操作，立即停止。',
      riskFactors: hitHigh.map((k) => `包含關鍵字「${k}」`),
      reason: `訊息中出現 ${hitHigh.join('、')} 等高風險詐騙關鍵字。`,
    };
  }

  const hitMedium = MEDIUM_KEYWORDS.filter((k) => input.includes(k));
  if (hitMedium.length > 0) {
    return {
      riskLevel: 'medium', riskScore: Math.min(40 + hitMedium.length * 7, 75), scamType: '可疑訊息',
      summary: '偵測到可疑特徵，建議謹慎確認後再行動，勿輕易提供個人資料。',
      riskFactors: hitMedium.map((k) => `包含關鍵字「${k}」`),
      reason: `訊息中出現 ${hitMedium.join('、')} 等可疑特徵。`,
    };
  }

  return {
    riskLevel: 'safe', riskScore: Math.floor(Math.random() * 15) + 3, scamType: '無',
    summary: '此內容無明顯詐騙特徵，看起來是一般訊息，仍建議保持警覺。',
    riskFactors: [],
    reason: '未偵測到明顯詐騙特徵，內容看起來是一般訊息。',
  };
}

export default function AnalyzingScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Analyzing'>>();
  const { type, input, imageUri } = route.params;
  const { currentUser, addEvent, addContributionPoints } = useAppStore();
  const elder = useElderStyle();
  const [step, setStep] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.18, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(glowOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      Animated.timing(glowOpacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
    ])).start();

    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3200),
      setTimeout(() => {
        const result = ['image', 'video', 'file'].includes(type)
          ? analyzeAttachment(type)
          : analyze(type, input);
        const now = new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 15);

        // safe 結果直接寫入 store（高/中風險由各 Result 畫面自行寫入）
        if (result.riskLevel === 'safe') {
          const event: DetectEvent = {
            id: `e_${Date.now()}`,
            userId: currentUser.id,
            userNickname: currentUser.nickname,
            type: type as any,
            input,
            imageUri,
            ...result,
            createdAt: now,
            status: 'safe',
          };
          addEvent(event);
          if (currentUser.role === 'solver') addContributionPoints(10);
          navigation.replace('ResultSafe', { reason: result.reason });
        } else if (result.riskLevel === 'high') {
          if (currentUser.role === 'solver') addContributionPoints(10);
          navigation.replace('ResultHigh', {
            scamType: result.scamType, riskScore: result.riskScore,
            riskFactors: result.riskFactors, summary: result.summary,
            reason: result.reason, originalInput: input, imageUri,
          });
        } else {
          if (currentUser.role === 'solver') addContributionPoints(10);
          navigation.replace('ResultMedium', {
            scamType: result.scamType, riskScore: result.riskScore,
            riskFactors: result.riskFactors, summary: result.summary,
            reason: result.reason, originalInput: input, imageUri,
          });
        }
      }, 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.center}>
          {/* 光暈動畫 */}
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.glow, { opacity: glowOpacity, transform: [{ scale: pulse }] }]} />
            <Animated.View style={[styles.spinnerRing, { transform: [{ rotate }] }]} />
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={44} color="#ffb38a" />
            </View>
          </View>

          <Text style={[styles.title, elder.active && { fontSize: 30 * elder.f }]}>AI 分析中</Text>
          <Text style={[styles.subtitle, elder.active && { fontSize: 17 * elder.f }]}>正在檢查內容是否包含詐騙特徵…</Text>

          {/* 步驟卡片 */}
          <View style={styles.steps}>
            {STEPS.map((s, i) => {
              const done = step > i;
              const active = step === i;
              return (
                <View key={i} style={[styles.stepCard, done && styles.stepCardDone, active && styles.stepCardActive]}>
                  <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                    {done
                      ? <Ionicons name="checkmark" size={elder.active ? 17 : 13} color="#fff" />
                      : <Text style={[styles.stepNum, elder.active && { fontSize: 16 * elder.f }]}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[styles.stepLabel, (done || active) && styles.stepLabelActive, elder.active && { fontSize: 17 * elder.f }]}>{s.label}</Text>
                  {active && (
                    <Animated.View style={[styles.activeDot, { opacity: glowOpacity }]} />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  cancel: { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingHorizontal: 28 },

  iconWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  glow: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.primary, opacity: 0.15,
  },
  spinnerRing: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: 'transparent',
    borderTopColor: Colors.primary, borderRightColor: 'rgba(255,179,138,0.4)',
  },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.cardLight,
    borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  title: { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textLight, marginTop: -8 },

  steps: { gap: 10, width: '100%', marginTop: 8 },
  stepCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  stepCardActive: {
    backgroundColor: '#fff3e8',
    borderColor: Colors.primary,
  },
  stepCardDone: {
    backgroundColor: Colors.safeBg,
    borderColor: 'rgba(123,191,142,0.4)',
  },
  stepDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.safe },
  stepNum: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  stepLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  stepLabelActive: { color: Colors.text },
  activeDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary,
  },
});
