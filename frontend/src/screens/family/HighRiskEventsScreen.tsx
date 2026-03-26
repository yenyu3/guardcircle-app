import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadow } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store';
import NpcAvatar from '../../components/NpcAvatar';

const DS = {
  primary: '#89502e',
  card: '#fcf2e3',
  surface: '#f6edde',
  outline: '#d7c2b9',
};
const M = { main: '#E8820C', light: '#FFB347', bg: '#FFF3E0' };

export default function HighRiskEventsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { events, family } = useAppStore();
  const highRiskEvents = events.filter((e) => e.status === 'high_risk' || e.status === 'pending');

  function getMember(userId: string) {
    return family.members.find((m) => m.id === userId);
  }

  function getTimeAgo(createdAt: string) {
    return createdAt;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={DS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>未處理事件</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* Count badge */}
      <View style={styles.countRow}>
        <View style={styles.countBadge}>
          <Ionicons name="warning" size={14} color={Colors.danger} />
          <Text style={styles.countText}>共 {highRiskEvents.length} 件待處理</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {highRiskEvents.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="checkmark-circle" size={56} color={Colors.safe} />
            <Text style={styles.emptyTitle}>目前無未處理風險事件</Text>
            <Text style={styles.emptySub}>家人目前都很安全</Text>
          </View>
        ) : (
          highRiskEvents.map((ev) => {
            const isMedium = ev.riskLevel === 'medium';
            const accentColor = isMedium ? M.main : Colors.danger;
            const accentBg = isMedium ? M.bg : Colors.dangerBg;
            const accentLight = isMedium ? M.light : '#FF9560';
            const member = getMember(ev.userId);
            return (
              <TouchableOpacity
                key={ev.id}
                style={styles.eventCard}
                onPress={() => navigation.navigate('GuardianAlert', { eventId: ev.id })}
                activeOpacity={0.85}
              >
                {/* Left accent */}
                <View style={[styles.dangerAccent, { backgroundColor: accentColor }]} />

                <View style={styles.cardInner}>
                  {/* Top row */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.avatarWrap}>
                      <NpcAvatar
                        avatar={member?.avatar}
                        initials={ev.userNickname[0]}
                        size={44}
                        color={accentColor}
                        borderColor={accentBg}
                        borderWidth={2}
                      />
                      <View style={[styles.dangerDot, { backgroundColor: accentColor }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.memberName}>{ev.userNickname}</Text>
                      <Text style={styles.scamType}>{ev.scamType}</Text>
                    </View>
                    <View style={[styles.scorePill, { backgroundColor: accentBg }]}>
                      <Text style={[styles.scoreNum, { color: accentColor }]}>{ev.riskScore}</Text>
                      <Text style={[styles.scoreLabel, { color: accentColor }]}>RISK</Text>
                    </View>
                  </View>

                  {/* Summary */}
                  <Text style={styles.summary} numberOfLines={2}>{ev.summary}</Text>

                  {/* Bottom row */}
                  <View style={styles.cardBottomRow}>
                    <View style={styles.timeRow}>
                      <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                      <Text style={styles.timeText}>{getTimeAgo(ev.createdAt)}</Text>
                    </View>
                    <LinearGradient
                      colors={[accentColor, accentLight]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.actionBtn}
                    >
                      <Text style={styles.actionBtnText}>立即處理</Text>
                      <Ionicons name="chevron-forward" size={13} color="#fff" />
                    </LinearGradient>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.bg,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: DS.primary },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  countRow: { paddingHorizontal: 20, paddingBottom: 12 },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: '#fca5a540',
  },
  countText: { fontSize: 13, fontWeight: '700', color: Colors.danger },
  container: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  // Empty
  emptyWrap: { alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  emptySub: { fontSize: 14, color: Colors.textMuted },
  // Event card
  eventCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...Shadow.card,
  },
  dangerAccent: { width: 4, backgroundColor: Colors.danger },
  cardInner: { flex: 1, padding: 16, gap: 10 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarWrap: { position: 'relative' },
  dangerDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.danger,
    borderWidth: 2, borderColor: Colors.white,
  },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  scamType: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scorePill: {
    alignItems: 'center',
    backgroundColor: Colors.dangerBg,
    borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  scoreNum: { fontSize: 18, fontWeight: '900', color: Colors.danger, lineHeight: 22 },
  scoreLabel: { fontSize: 9, fontWeight: '800', color: Colors.danger, letterSpacing: 1 },
  summary: { fontSize: 13, color: Colors.textLight, lineHeight: 20 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: Colors.textMuted },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
