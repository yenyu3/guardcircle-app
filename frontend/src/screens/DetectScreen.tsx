import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';
import AppHeader from '../components/Header';

const entries = [
  { key: 'text', icon: 'chatbubble-outline', label: '貼上文字 / 訊息', sub: '複製可疑訊息貼上分析', screen: 'DetectInputText' },
  { key: 'url', icon: 'link-outline', label: '貼上網址', sub: '分析可疑連結是否安全', screen: 'DetectInputUrl' },
  { key: 'phone', icon: 'call-outline', label: '輸入電話號碼', sub: '查詢電話是否有詐騙紀錄', screen: 'DetectInputPhone' },
  { key: 'image', icon: 'image-outline', label: '上傳截圖', sub: '上傳對話截圖進行分析', screen: 'DetectInputImage' },
] as const;

export default function DetectScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser } = useAppStore();
  const isGuardian = currentUser.role === 'guardian';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.title, isGuardian && styles.titleLarge]}>偵測可疑內容</Text>
          <Text style={[styles.sub, isGuardian && styles.subLarge]}>選擇你想要確認的內容類型</Text>
        </View>

        {/* Detection list */}
        <View style={styles.list}>
          {entries.map((e) => (
            <TouchableOpacity
              key={e.key}
              style={[styles.card, Shadow.card]}
              onPress={() => navigation.navigate(e.screen as any)}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={e.icon as any} size={isGuardian ? 34 : 30} color={Colors.primaryDark} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, isGuardian && styles.cardLabelLarge]}>{e.label}</Text>
                <Text style={[styles.cardSub, isGuardian && styles.cardSubLarge]}>{e.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Share entry */}
        <View style={styles.shareSection}>
          <Text style={styles.shareTitle}>從其他 App 分享過來</Text>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => navigation.navigate('Analyzing', {
              type: 'text',
              // 固定包含高風險關鍵字，模擬從外部分享進來的詐騙訊息
              input: '您好，我是台灣銀行客服，您的帳戶有異常交易，請立即操作ATM解除分期付款，否則將凍結帳戶。',
              // TODO: 後端接口 — 接收 Share Extension 傳入的 input
            })}
          >
            <Ionicons name="share-social" size={18} color={Colors.primaryDark} />
            <Text style={styles.shareBtnText}>模擬分享入口（Demo）</Text>
          </TouchableOpacity>
        </View>

        {/* Result preview */}
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>結果頁面預覽（測試用）</Text>
          <View style={styles.previewRow}>
            <TouchableOpacity
              style={[styles.previewBtn, { backgroundColor: '#E97A7A' }]}
              onPress={() => navigation.navigate('ResultHigh', { scamType: '假冒銀行', riskScore: 92, riskFactors: ['要求轉帳', '偽造官方身份'], summary: '這個訊息要求你轉帳，很可能是詐騙' })}
            >
              <Text style={styles.previewBtnText}>🔴 高風險</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewBtn, { backgroundColor: '#F5C842' }]}
              onPress={() => navigation.navigate('ResultMedium', { scamType: '可疑訊息', riskScore: 55, riskFactors: ['要求提供個人資料', '要求進行轉帳'], summary: '此訊息含有可疑特徵' })}
            >
              <Text style={styles.previewBtnText}>🟡 中風險</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.previewBtn, { backgroundColor: '#7BBF8E' }]}
              onPress={() => navigation.navigate('ResultSafe')}
            >
              <Text style={styles.previewBtnText}>🟢 安全</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: { marginTop: 28, marginBottom: 28 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, marginBottom: 6, letterSpacing: -0.5 },
  titleLarge: { fontSize: 38 },
  sub: { fontSize: 15, color: Colors.textLight, fontWeight: '500' },
  subLarge: { fontSize: 18 },
  list: { gap: 14 },
  card: {
    backgroundColor: '#fcf2e3',
    borderRadius: Radius.xl,
    paddingVertical: 22,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  iconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#ffdbca',
    alignItems: 'center', justifyContent: 'center',
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 19, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  cardLabelLarge: { fontSize: 23 },
  cardSub: { fontSize: 14, color: Colors.textLight },
  cardSubLarge: { fontSize: 17 },
  previewSection: { marginTop: 20 },
  shareSection: { marginTop: 28, alignItems: 'center' },
  shareTitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fcf2e3', borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12 },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark },
  previewLabel: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', gap: 10 },
  previewBtn: { flex: 1, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  previewBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
