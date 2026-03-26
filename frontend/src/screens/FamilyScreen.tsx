import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { RootStackParamList } from '../navigation';
import { useAppStore } from '../store';
import { DetectEvent } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import NpcAvatar from '../components/NpcAvatar';
import AppHeader from '../components/Header';
import { useScrollRef } from '../navigation/ScrollRefContext';

const STATUS_COLOR: Record<string, string> = {
  safe: Colors.safe,
  pending: Colors.warning,
  high_risk: Colors.danger,
};
const STATUS_LABEL: Record<string, string> = {
  safe: '安全',
  pending: '待處理',
  high_risk: '高風險',
};
const ROLE_LABEL: Record<string, string> = {
  guardian: '守護者',
  gatekeeper: '守門人',
  solver: '解析者',
};

export default function FamilyScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { events, family, apiFetchFamily } = useAppStore();
  const members = family.members;
  const scrollRef = useRef<ScrollView>(null);
  const { register } = useScrollRef();

  useFocusEffect(
    React.useCallback(() => {
      register('Family', scrollRef);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      apiFetchFamily().catch(() => {});
    }, [])
  );

  type ActivityItem =
    | { kind: 'detect'; event: DetectEvent; time: string }
    | { kind: 'resolve'; event: DetectEvent; resolverNickname: string; time: string };

  const activities: ActivityItem[] = [];
  events.forEach((e) => {
    activities.push({ kind: 'detect', event: e, time: e.createdAt });
    if (e.gatekeeperResponseAt && e.gatekeeperResponse) {
      const resolverNickname = e.gatekeeperResponse.split('已')[0] ?? '守門人';
      activities.push({ kind: 'resolve', event: e, resolverNickname, time: e.gatekeeperResponseAt });
    }
  });
  const timelineActivities = activities
    .sort((a, b) => b.time.localeCompare(a.time))
    .slice(0, 8);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Members */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{family.name}</Text>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{members.length} 位成員</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.membersScroll}>
          {members.map((m) => {
            const dotColor = STATUS_COLOR[m.status] ?? Colors.textMuted;
            const label = STATUS_LABEL[m.status] ?? '';
            return (
              <View key={m.id} style={styles.memberItem}>
                <View style={styles.avatarWrap}>
                  <NpcAvatar avatar={m.avatar} initials={m.nickname[0]} size={72} color={dotColor} borderColor={dotColor + '44'} borderWidth={2} />
                  <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                </View>
                <Text style={styles.memberName}>{m.nickname}</Text>
                <Text style={styles.memberRole}>{ROLE_LABEL[m.role] ?? m.role}</Text>
                <Text style={[styles.memberStatus, { color: dotColor }]}>{label}</Text>
              </View>
            );
          })}
          {/* Invite placeholder */}
          <TouchableOpacity style={styles.memberItem} onPress={() => navigation.navigate('FamilyInvite')}>
            <View style={styles.inviteCircle}>
              <Ionicons name="add" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.inviteLabel}>邀請</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* CTA */}
        <Pressable onPress={() => navigation.navigate('FamilyInvite')} style={{ marginVertical: 24 }}>
          <LinearGradient
            colors={['#89502e', '#ffb38a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={[styles.ctaText, { color: '#fff' }]}>邀請新成員</Text>
          </LinearGradient>
        </Pressable>

        {/* Timeline */}
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>最新動態</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {timelineActivities.length === 0 ? (
            <View style={styles.emptyTimeline}>
              <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
              <Text style={styles.emptyTimelineText}>目前尚無動態</Text>
            </View>
          ) : (
            timelineActivities.map((item, idx) => {
              if (item.kind === 'detect') {
                const e = item.event;
                const isHigh = e.riskLevel === 'high';
                const isSafe = e.riskLevel === 'safe';
                const iconColor = isSafe ? Colors.safe : isHigh ? Colors.danger : Colors.warning;
                const iconName = isSafe ? 'shield-checkmark' : isHigh ? 'warning' : 'alert-circle';
                const label = isSafe ? '偵測安全訊息' : `偵測到${e.scamType}`;
                return (
                  <TouchableOpacity
                    key={`detect-${e.id}`}
                    style={styles.timelineRow}
                    onPress={() => navigation.navigate('FamilyEventDetail', { eventId: e.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.timelineIcon, { backgroundColor: iconColor }]}>
                      <Ionicons name={iconName} size={18} color="#fff" />
                    </View>
                    <View style={styles.timelineCard}>
                      <View style={styles.timelineCardHeader}>
                        <Text style={styles.timelineTitle}>{e.userNickname} · {label}</Text>
                        <Text style={styles.timelineTime}>{e.createdAt}</Text>
                      </View>
                      <Text style={styles.timelineDesc}>{e.summary.slice(0, 40)}…</Text>
                    </View>
                  </TouchableOpacity>
                );
              } else {
                const e = item.event;
                return (
                  <TouchableOpacity
                    key={`resolve-${e.id}`}
                    style={styles.timelineRow}
                    onPress={() => navigation.navigate('FamilyEventDetail', { eventId: e.id })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.timelineIcon, { backgroundColor: Colors.safe }]}>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    </View>
                    <View style={styles.timelineCard}>
                      <View style={styles.timelineCardHeader}>
                        <Text style={styles.timelineTitle}>{item.resolverNickname} · 協助處理事件</Text>
                        <Text style={styles.timelineTime}>{e.gatekeeperResponseAt}</Text>
                      </View>
                      <Text style={styles.timelineDesc}>{e.gatekeeperResponse?.slice(0, 40)}…</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  countPill: { backgroundColor: Colors.primary + '22', borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  countText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  membersScroll: { paddingBottom: 8, gap: 20 },
  memberItem: { alignItems: 'center', gap: 6, minWidth: 80 },
  avatarWrap: { position: 'relative' },
  statusDot: { position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: Colors.bg },
  memberName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  memberRole: { fontSize: 10, color: Colors.textMuted, fontWeight: '500' },
  memberStatus: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  inviteCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.primary + '66', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff8' },
  inviteLabel: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.xl, paddingVertical: 16, ...Shadow.strong,
  },
  ctaText: { fontSize: 16, fontWeight: '700', color: Colors.text },
  timeline: { position: 'relative', gap: 20 },
  timelineLine: { position: 'absolute', left: 19, top: 8, bottom: 8, width: 2, backgroundColor: Colors.primary + '22' },
  timelineRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  timelineIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineCard: { flex: 1, backgroundColor: '#fff', borderRadius: Radius.lg, padding: 14, ...Shadow.card, borderWidth: 1, borderColor: Colors.primary + '0D' },
  timelineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  timelineTitle: { fontSize: 13, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  timelineTime: { fontSize: 11, color: Colors.textMuted },
  emptyTimeline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingLeft: 8 },
  emptyTimelineText: { fontSize: 14, color: Colors.safe, fontWeight: '600' },
  timelineDesc: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
});
