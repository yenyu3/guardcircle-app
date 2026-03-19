import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { RootStackParamList } from '../navigation';
import { mockFamily } from '../mock';
import { LinearGradient } from 'expo-linear-gradient';
import NpcAvatar from '../components/NpcAvatar';
import AppHeader from '../components/Header';

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

const mockTimeline = [
  { id: 't1', icon: 'chatbubble', color: Colors.primary, title: '媽媽 查看了訊息', time: '10 分鐘前', desc: '已確認來自不明號碼的簡訊為安全類別。' },
  { id: 't2', icon: 'person-add', color: Colors.warning, title: '爸爸 新增了聯絡人', time: '2 小時前', desc: '新增了聯絡人「王大明」，系統正在驗證身分。' },
  { id: 't3', icon: 'warning', color: Colors.danger, title: '爺爺 收到可疑電話', time: '5 小時前', desc: '偵測到來自國外的異常來電，已自動標示為高風險。' },
];

export default function FamilyScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const members = mockFamily.members.slice(0, 3).map((m, i) => ({
    ...m,
    status: ['safe', 'pending', 'high_risk'][i] as string,
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Members */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>家庭成員</Text>
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
        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>最近動態</Text>
        <View style={styles.timeline}>
          <View style={styles.timelineLine} />
          {mockTimeline.map((item) => (
            <View key={item.id} style={styles.timelineRow}>
              <View style={[styles.timelineIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={18} color="#fff" />
              </View>
              <View style={styles.timelineCard}>
                <View style={styles.timelineCardHeader}>
                  <Text style={styles.timelineTitle}>{item.title}</Text>
                  <Text style={styles.timelineTime}>{item.time}</Text>
                </View>
                <Text style={styles.timelineDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
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
  timelineDesc: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
});
