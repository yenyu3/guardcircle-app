import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';
import { mockEvents, mockFamily } from '../mock';
import Card from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import Avatar from '../components/Avatar';
import Banner from '../components/Banner';
import Button from '../components/Button';
import AppHeader from '../components/Header';

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? '早安' : h < 18 ? '午安' : '晚安';
}

// ── Guardian Home ──────────────────────────────────────────────
function GuardianHome() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser } = useAppStore();
  const pendingEvents = mockEvents.filter((e) => e.userId === 'u1' && e.riskLevel !== 'safe');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.gGreeting}>{getGreeting()}，{currentUser.nickname} 👋</Text>

      {pendingEvents.length > 0 ? (
        <Card variant="warning" style={styles.statusCard}>
          <Ionicons name="alert-circle" size={28} color={Colors.warning} />
          <Text style={styles.gStatusTitle}>有 {pendingEvents.length} 件待確認事件</Text>
          <Text style={styles.gStatusSub}>家人正在幫你確認，請稍候</Text>
        </Card>
      ) : (
        <Card variant="safe" style={styles.statusCard}>
          <Ionicons name="checkmark-circle" size={28} color={Colors.safe} />
          <Text style={styles.gStatusTitle}>今天一切安全 ✓</Text>
          <Text style={styles.gStatusSub}>守護圈持續守護你</Text>
        </Card>
      )}

      <TouchableOpacity
        style={styles.gMainBtn}
        onPress={() => (navigation as any).navigate('Detect')}
        activeOpacity={0.85}
      >
        <Ionicons name="shield-checkmark" size={32} color={Colors.white} />
        <Text style={styles.gMainBtnText}>我收到可疑訊息</Text>
        <Text style={styles.gMainBtnSub}>點這裡讓守護圈幫你確認</Text>
      </TouchableOpacity>

      <Text style={styles.sectionLabel}>我的守門人</Text>
      <View style={styles.gatekeepers}>
        {mockFamily.members.filter((m) => m.role === 'gatekeeper').map((m) => (
          <View key={m.id} style={styles.gkItem}>
            <Avatar initials={m.nickname[0]} size={48} color={Colors.primaryDark} />
            <Text style={styles.gkName}>{m.nickname}</Text>
            <View style={styles.onlineDot} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Gatekeeper Home ────────────────────────────────────────────
function GatekeeperHome() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const highRisk = mockEvents.filter((e) => e.riskLevel === 'high');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {highRisk.length > 0 && (
        <TouchableOpacity onPress={() => navigation.navigate('GuardianAlert', { eventId: highRisk[0].id })}>
          <Banner message={`🔴 ${highRisk[0].userNickname} 收到高風險訊息，點此立即處理`} variant="danger" />
        </TouchableOpacity>
      )}

      <Text style={styles.familyName}>{mockFamily.name}</Text>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statNum}>12</Text>
          <Text style={styles.statLabel}>本月查詢</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.safe }]}>3</Text>
          <Text style={styles.statLabel}>本月攔截</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: Colors.danger }]}>2</Text>
          <Text style={styles.statLabel}>高風險</Text>
        </Card>
      </View>

      <Text style={styles.sectionLabel}>成員安全狀態</Text>
      {mockFamily.members.map((m) => {
        const statusColor = m.status === 'safe' ? Colors.safe : m.status === 'high_risk' ? Colors.danger : Colors.warning;
        const statusLabel = m.status === 'safe' ? '安全' : m.status === 'high_risk' ? '高風險' : '待確認';
        return (
          <Card key={m.id} style={styles.memberCard}>
            <Avatar initials={m.nickname[0]} size={44} color={statusColor} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.nickname}</Text>
              <Text style={styles.memberTime}>最後活動：{m.lastActive}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
              <Text style={[styles.statusPillText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </Card>
        );
      })}

      <Text style={styles.sectionLabel}>近期事件</Text>
      {mockEvents.slice(0, 4).map((e) => (
        <TouchableOpacity key={e.id} onPress={() => navigation.navigate('FamilyEventDetail', { eventId: e.id })}>
          <Card style={styles.eventCard}>
            <RiskBadge level={e.riskLevel} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{e.userNickname} · {e.scamType}</Text>
              <Text style={styles.eventTime}>{e.createdAt}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </Card>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ── Solver Home ────────────────────────────────────────────────
function SolverHome() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser } = useAppStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.gGreeting}>{getGreeting()}，{currentUser.nickname} 🔍</Text>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statNum}>7</Text>
          <Text style={styles.statLabel}>本週識破</Text>
        </Card>
        <Card style={[styles.statCard, { flex: 1.5 }] as any}>
          <Text style={[styles.statNum, { color: Colors.primaryDark }]}>{currentUser.contributionPoints}</Text>
          <Text style={styles.statLabel}>貢獻點數</Text>
        </Card>
      </View>

      <Card variant="warning" style={{ marginBottom: 14 }}>
        <Text style={styles.alertTitle}>🚨 本週詐騙警報</Text>
        <Text style={styles.alertBody}>假冒銀行客服詐騙案件本週激增 34%，主要針對 60 歲以上長輩，請提醒家人注意。</Text>
      </Card>

      <Text style={styles.sectionLabel}>今日知識卡</Text>
      <TouchableOpacity onPress={() => navigation.navigate('KnowledgeCard', { cardId: 'k1' })}>
        <Card style={styles.knowledgeCard}>
          <View style={styles.knowledgeHeader}>
            <Ionicons name="bulb" size={20} color={Colors.primaryDark} />
            <Text style={styles.knowledgeType}>假冒銀行客服</Text>
          </View>
          <Text style={styles.knowledgeDesc}>了解 3 個識別訊號，保護家人不受騙</Text>
          <Text style={styles.knowledgeLink}>查看知識卡 →</Text>
        </Card>
      </TouchableOpacity>

      <Button title="查看本週報告" onPress={() => navigation.navigate('WeeklyReport')} variant="secondary" style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

// ── Main Export ────────────────────────────────────────────────
export default function HomeScreen() {
  const { currentUser, hasFamilyCircle } = useAppStore();

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader />
      {!hasFamilyCircle && (
        <Banner message="你還沒有加入家庭圈，前往設定加入" variant="info" />
      )}
      {currentUser.role === 'guardian' && <GuardianHome />}
      {currentUser.role === 'gatekeeper' && <GatekeeperHome />}
      {currentUser.role === 'solver' && <SolverHome />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  // Guardian
  gGreeting: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 16 },
  statusCard: { alignItems: 'center', gap: 6, paddingVertical: 20, marginBottom: 20 },
  gStatusTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  gStatusSub: { fontSize: 14, color: Colors.textLight },
  gMainBtn: {
    backgroundColor: Colors.primaryDark, borderRadius: Radius.xl, padding: 28,
    alignItems: 'center', gap: 8, marginBottom: 24,
    ...Shadow.strong,
  },
  gMainBtnText: { fontSize: 24, fontWeight: '800', color: Colors.white },
  gMainBtnSub: { fontSize: 14, color: Colors.white + 'CC' },
  gatekeepers: { flexDirection: 'row', gap: 20 },
  gkItem: { alignItems: 'center', gap: 6 },
  gkName: { fontSize: 13, color: Colors.text, fontWeight: '600' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.safe },
  // Gatekeeper
  familyName: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14 },
  statNum: { fontSize: 26, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  memberTime: { fontSize: 12, color: Colors.textMuted },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  eventTime: { fontSize: 12, color: Colors.textMuted },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 4 },
  // Solver
  alertTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  alertBody: { fontSize: 14, color: Colors.textLight, lineHeight: 20 },
  knowledgeCard: { marginBottom: 12 },
  knowledgeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  knowledgeType: { fontSize: 15, fontWeight: '700', color: Colors.text },
  knowledgeDesc: { fontSize: 13, color: Colors.textLight, marginBottom: 8 },
  knowledgeLink: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
});
