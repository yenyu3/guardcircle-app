import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../theme';

const DS = {
  primary: '#89502e',
  primaryContainer: '#ffb38a',
  secondary: '#6e5b45',
  onSurface: '#1f1b12',
  onSurfaceVariant: '#52443c',
  surfaceContainerLow: '#fcf2e3',
  surfaceContainerHighest: '#ebe1d3',
  outlineVariant: '#d7c2b9',
};

const BRIEF = {
  tag: '緊急快報',
  date: '2026-03-20',
  source: '新聞來源：內政部警政署 165 全民防詐騙網',
  title: 'AI 語音變聲詐騙急升：假冒子女求救，要求匯款至不明帳戶',
  summary:
    '近期詐騙集團利用先進的 AI 語音複製技術（Voice Cloning），僅需數秒的錄音即可完美模擬特定親友的音色與說話習慣。歹徒常假借發生重大車禍、醫療緊急需求或突發財務危機等「求救情境」，使長輩在極度焦慮下放低戒心。由於變聲後的語音極其逼真，語氣與親人幾乎無異，受害者往往在未經查證的情況下，便依照指示匯款至指定不明帳戶。',
  points: [
    {
      title: '查證第一步',
      body: '不要隨意回撥對方提供的電話，請自行撥打親友常用門號或通訊軟體再次確認。',
    },
    {
      title: '建立家庭代碼',
      body: '立即與家人建立只有彼此知道的「防詐密碼」，針對涉及金錢的對話進行核對身份。',
    },
    {
      title: '冷靜求助專線',
      body: '凡提到匯款請務必先掛斷並多方查證，若有疑慮請立即撥打 165 反詐騙專線諮詢。',
    },
  ],
};

export default function ScamBriefScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={DS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>今日詐騙快報</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={() => Alert.alert('分享（Demo）')} activeOpacity={0.7}>
          <Ionicons name="share-outline" size={22} color={DS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{BRIEF.tag}</Text>
          </View>
          <Text style={styles.metaDate}>{BRIEF.date}</Text>
          <View style={styles.metaDot} />
        </View>
        <Text style={styles.metaSource}>{BRIEF.source}</Text>

        {/* Title */}
        <Text style={styles.title}>{BRIEF.title}</Text>

        {/* Hero image placeholder */}
        <View style={styles.heroImg}>
          <View style={styles.heroOverlay} />
          <Ionicons name="mic" size={64} color="rgba(255,255,255,0.6)" />
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="flash" size={20} color={DS.primary} />
            <Text style={styles.summaryTitle}>快報摘要</Text>
          </View>
          <Text style={styles.summaryBody}>{BRIEF.summary}</Text>
        </View>

        {/* Key Points */}
        <View style={styles.pointsSection}>
          <View style={styles.pointsSectionHeader}>
            <View style={styles.pointsAccent} />
            <Text style={styles.pointsSectionTitle}>防範關鍵點</Text>
          </View>
          {BRIEF.points.map((p, i) => (
            <View key={i} style={styles.pointCard}>
              <View style={styles.pointNum}>
                <Text style={styles.pointNumText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointTitle}>{p.title}</Text>
                <Text style={styles.pointBody}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Pressable
          onPress={() => Alert.alert('分享（Demo）')}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: 32 }]}
        >
          <LinearGradient
            colors={[DS.primary, DS.primaryContainer]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.shareBtn}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>分享給家人</Text>
          </LinearGradient>
        </Pressable>


      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.bg,
    borderBottomWidth: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: DS.primary },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  container: { paddingHorizontal: 20, paddingBottom: 48 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  tagPill: {
    backgroundColor: DS.primaryContainer + '4D',
    borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: DS.primary },
  metaDate: { fontSize: 13, fontWeight: '500', color: DS.onSurfaceVariant },
  metaDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: DS.outlineVariant },
  metaSource: { fontSize: 12, color: DS.onSurfaceVariant, marginTop: 6, marginBottom: 16 },

  title: {
    fontSize: 28, fontWeight: '800', color: DS.onSurface,
    lineHeight: 38, letterSpacing: -0.5, marginBottom: 24,
  },

  heroImg: {
    height: 200, borderRadius: 20, backgroundColor: '#2a1a0e',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
    overflow: 'hidden', ...Shadow.card,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(137,80,46,0.35)',
  },

  summaryCard: {
    backgroundColor: DS.surfaceContainerLow, borderRadius: Radius.lg,
    padding: 24, marginBottom: 32, gap: 12,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryTitle: { fontSize: 20, fontWeight: '700', color: DS.primary },
  summaryBody: { fontSize: 15, color: DS.onSurfaceVariant, lineHeight: 26 },

  pointsSection: { gap: 12 },
  pointsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  pointsAccent: { width: 4, height: 24, borderRadius: 2, backgroundColor: DS.primary },
  pointsSectionTitle: { fontSize: 20, fontWeight: '700', color: DS.onSurface },
  pointCard: {
    flexDirection: 'row', gap: 16, padding: 20,
    backgroundColor: DS.surfaceContainerHighest + '80',
    borderRadius: Radius.lg, alignItems: 'flex-start',
  },
  pointNum: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: DS.primary, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  pointNumText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  pointTitle: { fontSize: 16, fontWeight: '600', color: DS.onSurface, marginBottom: 4 },
  pointBody: { fontSize: 14, color: DS.onSurfaceVariant, lineHeight: 22 },

  shareBtn: {
    borderRadius: Radius.lg, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    ...Shadow.strong,
  },
  shareBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

});
