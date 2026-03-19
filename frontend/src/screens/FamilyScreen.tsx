import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';
import { RootStackParamList } from '../navigation';
import { mockEvents, mockFamily } from '../mock';
import Card from '../components/Card';
import RiskBadge from '../components/RiskBadge';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import AppHeader from '../components/Header';

export default function FamilyScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [familyName] = useState(mockFamily.name);

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        rightElement={
          <Button title="邀請家人" onPress={() => navigation.navigate('FamilyInvite')} variant="secondary" style={{ paddingHorizontal: 14 }} />
        }
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{familyName}</Text>
          <Text style={styles.sub}>ID: GC-482951</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>12</Text>
            <Text style={styles.statLabel}>本週查詢</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.safe }]}>3</Text>
            <Text style={styles.statLabel}>本週攔截</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNum}>{mockFamily.members.length}</Text>
            <Text style={styles.statLabel}>成員</Text>
          </Card>
        </View>

        {/* Members */}
        <Text style={styles.sectionLabel}>成員狀態</Text>
        {mockFamily.members.map((m) => {
          const statusColor = m.status === 'safe' ? Colors.safe : m.status === 'high_risk' ? Colors.danger : Colors.warning;
          const statusLabel = m.status === 'safe' ? '安全' : m.status === 'high_risk' ? '高風險' : '待確認';
          return (
            <Card key={m.id} style={styles.memberCard}>
              <Avatar initials={m.nickname[0]} size={44} color={statusColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{m.nickname}</Text>
                <Text style={styles.memberRole}>{m.role === 'guardian' ? '守護者' : m.role === 'gatekeeper' ? '守門人' : '識破者'}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </Card>
          );
        })}

        {/* Recent events */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>近期事件</Text>
          <TouchableOpacity onPress={() => navigation.navigate('FamilyRecord')}>
            <Text style={styles.seeAll}>查看全部</Text>
          </TouchableOpacity>
        </View>
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

        <View style={styles.mgmtRow}>
          <TouchableOpacity style={styles.mgmtBtn} onPress={() => navigation.navigate('FamilyManage')}>
            <Ionicons name="settings-outline" size={18} color={Colors.primaryDark} />
            <Text style={styles.mgmtText}>管理家庭圈</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mgmtBtn} onPress={() => navigation.navigate('WeeklyReport')}>
            <Ionicons name="bar-chart-outline" size={18} color={Colors.primaryDark} />
            <Text style={styles.mgmtText}>本週報告</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  titleRow: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 12, color: Colors.textMuted },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14 },
  statNum: { fontSize: 24, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  seeAll: { fontSize: 13, color: Colors.primaryDark, fontWeight: '600' },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  memberRole: { fontSize: 12, color: Colors.textMuted },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  eventCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  eventTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  eventTime: { fontSize: 12, color: Colors.textMuted },
  mgmtRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  mgmtBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 14 },
  mgmtText: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark },
});
