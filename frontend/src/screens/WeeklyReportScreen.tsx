import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';
import { useAppStore } from '../store';
import { mockWeeklyReport } from '../mock';
import Header from '../components/Header';
import Card from '../components/Card';
import Avatar from '../components/Avatar';

export default function WeeklyReportScreen() {
  const navigation = useNavigation();
  const { currentUser } = useAppStore();
  const r = mockWeeklyReport;

  const headline =
    currentUser.role === 'guardian'
      ? `守護圈本週幫你擋下 ${r.blocked} 次危險，你很棒 🎉`
      : currentUser.role === 'gatekeeper'
      ? `${mockWeeklyReport.weekLabel} 防詐報告`
      : '本週最新詐騙手法快報';

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="本週報告" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.period}>{r.weekLabel}</Text>

        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{r.totalScans}</Text>
            <Text style={styles.statLabel}>總查詢</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.safe }]}>{r.blocked}</Text>
            <Text style={styles.statLabel}>攔截</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.danger }]}>{r.highRisk}</Text>
            <Text style={styles.statLabel}>高風險</Text>
          </Card>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>本週最常見詐騙</Text>
          <View style={styles.topScam}>
            <Ionicons name="warning" size={20} color={Colors.danger} />
            <Text style={styles.topScamText}>{r.topScamType}</Text>
          </View>
        </Card>

        {currentUser.role !== 'guardian' && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>成員查詢統計</Text>
            {r.memberStats.map((m) => (
              <View key={m.nickname} style={styles.memberRow}>
                <Avatar initials={m.nickname[0]} size={36} />
                <Text style={styles.memberName}>{m.nickname}</Text>
                <Text style={styles.memberStat}>查詢 {m.scans} 次</Text>
                {m.blocked > 0 && (
                  <View style={styles.blockedPill}>
                    <Text style={styles.blockedText}>攔截 {m.blocked}</Text>
                  </View>
                )}
              </View>
            ))}
          </Card>
        )}

        {currentUser.role === 'solver' && (
          <Card variant="warning" style={styles.section}>
            <Text style={styles.sectionTitle}>本週詐騙趨勢</Text>
            <Text style={styles.trendText}>• 假冒銀行客服 +34%{'\n'}• 投資詐騙 +18%{'\n'}• 網路購物詐騙 -5%</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  headline: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4, lineHeight: 30 },
  period: { fontSize: 13, color: Colors.textMuted, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 16 },
  statNum: { fontSize: 28, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  topScam: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topScamText: { fontSize: 18, fontWeight: '700', color: Colors.text },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  memberStat: { fontSize: 13, color: Colors.textLight },
  blockedPill: { backgroundColor: Colors.safeBg, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  blockedText: { fontSize: 11, fontWeight: '700', color: Colors.safe },
  trendText: { fontSize: 14, color: Colors.text, lineHeight: 24 },
});
