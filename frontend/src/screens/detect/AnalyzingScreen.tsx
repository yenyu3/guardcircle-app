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

const STEPS = ['Gogolook 資料庫查詢', 'AI 語意分析中', '產生風險報告'];

// 附件類型 → mock 分析結果
function analyzeAttachment(type: string): ReturnType<typeof analyze> {
  if (type === 'image') return {
    riskLevel: 'medium', riskScore: 62, scamType: '可疑截圖',
    summary: '圖片中偵測到可疑文字特徵，建議謹慎確認來源。',
    riskFactors: ['圖片含可疑文字', '來源不明'],
  };
  if (type === 'video') return {
    riskLevel: 'medium', riskScore: 55, scamType: '可疑影音',
    summary: '影音檔案需進一步後端分析，目前顯示初步結果。',
    riskFactors: ['影音內容待審查'],
  };
  return {
    riskLevel: 'safe', riskScore: 8, scamType: '無',
    summary: '檔案無明顯詐騙特徵，仍建議確認來源。',
    riskFactors: [],
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

function analyze(type: string, input: string): { riskLevel: RiskLevel; riskScore: number; scamType: string; summary: string; riskFactors: string[] } {
  const lower = input.toLowerCase();

  if (type === 'url') {
    if (HIGH_URL_PATTERNS.some((p) => lower.includes(p))) {
      return {
        riskLevel: 'high', riskScore: 88, scamType: '釣魚網站',
        summary: '此網址疑似仿冒官方網站，域名異常，請勿點擊或輸入任何資料。',
        riskFactors: ['非官方域名', '仿冒官方介面', 'SSL 憑證異常'],
      };
    }
    if (MEDIUM_URL_PATTERNS.some((p) => lower.includes(p))) {
      return {
        riskLevel: 'medium', riskScore: 58, scamType: '可疑連結',
        summary: '此連結含有可疑特徵，建議謹慎確認來源後再點擊。',
        riskFactors: ['可疑關鍵字', '來源不明'],
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
      };
    }
  }

  const hitHigh = HIGH_KEYWORDS.filter((k) => input.includes(k));
  if (hitHigh.length > 0) {
    return {
      riskLevel: 'high', riskScore: Math.min(70 + hitHigh.length * 8, 98), scamType: '假冒官方詐騙',
      summary: '偵測到多項高風險詐騙特徵，請勿依照指示操作，立即停止。',
      riskFactors: hitHigh.map((k) => `包含關鍵字「${k}」`),
    };
  }

  const hitMedium = MEDIUM_KEYWORDS.filter((k) => input.includes(k));
  if (hitMedium.length > 0) {
    return {
      riskLevel: 'medium', riskScore: Math.min(40 + hitMedium.length * 7, 75), scamType: '可疑訊息',
      summary: '偵測到可疑特徵，建議謹慎確認後再行動，勿輕易提供個人資料。',
      riskFactors: hitMedium.map((k) => `包含關鍵字「${k}」`),
    };
  }

  return {
    riskLevel: 'safe', riskScore: Math.floor(Math.random() * 15) + 3, scamType: '無',
    summary: '此內容無明顯詐騙特徵，看起來是一般訊息，仍建議保持警覺。',
    riskFactors: [],
  };
}

export default function AnalyzingScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Analyzing'>>();
  const { type, input } = route.params;
  const { currentUser, addEvent, addContributionPoints } = useAppStore();
  const [step, setStep] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })).start();

    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3200),
      setTimeout(() => {
        const result = ['image', 'video', 'file'].includes(type)
          ? analyzeAttachment(type)
          : analyze(type, input);
        const now = new Date().toLocaleString('zh-TW', { hour12: false }).slice(0, 16);

        // safe 結果直接寫入 store（高/中風險由各 Result 畫面自行寫入）
        if (result.riskLevel === 'safe') {
          const event: DetectEvent = {
            id: `e_${Date.now()}`,
            userId: currentUser.id,
            userNickname: currentUser.nickname,
            type: type as any,
            input,
            ...result,
            createdAt: now,
            status: 'safe',
          };
          addEvent(event);
          if (currentUser.role === 'solver') addContributionPoints(10);
          navigation.replace('ResultSafe');
        } else if (result.riskLevel === 'high') {
          if (currentUser.role === 'solver') addContributionPoints(10);
          navigation.replace('ResultHigh', {
            scamType: result.scamType, riskScore: result.riskScore,
            riskFactors: result.riskFactors, summary: result.summary,
          });
        } else {
          if (currentUser.role === 'solver') addContributionPoints(10);
          navigation.replace('ResultMedium', {
            scamType: result.scamType, riskScore: result.riskScore,
            riskFactors: result.riskFactors, summary: result.summary,
          });
        }
      }, 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={Colors.textLight} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.primaryDark} />
        </Animated.View>
        <Text style={styles.title}>分析中…</Text>

        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, step > i && styles.stepDotDone, step === i && styles.stepDotActive]}>
                {step > i && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
              <Text style={[styles.stepText, step > i && styles.stepTextDone]}>{s}</Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  cancel: { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 },
  spinner: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  steps: { gap: 16, width: '100%' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.safe },
  stepText: { fontSize: 15, color: Colors.textMuted },
  stepTextDone: { color: Colors.text, fontWeight: '600' },
});
