import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadow } from '../theme';
import { RootStackParamList } from '../navigation';
import { mockNotifications } from '../mock';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../components/Header';

const typeConfig: Record<string, { icon: string; color: string; subtitle: string }> = {
  HIGH_RISK:          { icon: 'warning',          color: Colors.danger,      subtitle: '高風險警報' },
  GUARDIAN_REPLY:     { icon: 'checkmark-circle',  color: Colors.safe,        subtitle: '守門人回應' },
  ESCALATE:           { icon: 'alert-circle',      color: Colors.danger,      subtitle: '緊急升級' },
  WEEKLY_REPORT:      { icon: 'bar-chart',         color: Colors.primaryDark, subtitle: '每週報告' },
  CONTRIBUTE_CONFIRM: { icon: 'star',              color: Colors.warning,     subtitle: '貢獻確認' },
  FAMILY_JOIN:        { icon: 'people',            color: Colors.primaryDark, subtitle: '家庭圈動態' },
};

export default function NotificationsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [notifs, setNotifs] = useState(mockNotifications);

  const markAllRead = () =>
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));

  const markRead = (id: string) =>
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const handlePress = (n: typeof notifs[0]) => {
    markRead(n.id);
    if (n.eventId) navigation.navigate('FamilyEventDetail', { eventId: n.eventId });
    else if (n.type === 'WEEKLY_REPORT') navigation.navigate('WeeklyReport');
  };

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader notifCount={unread} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Unread bar */}
        {unread > 0 && (
          <View style={styles.unreadBar}>
            <Text style={styles.unreadCount}>{unread} 則未讀</Text>
            <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
              <Ionicons name="checkmark-done" size={16} color={Colors.primaryDark} />
              <Text style={styles.markAllText}>全部已讀</Text>
            </TouchableOpacity>
          </View>
        )}
        {notifs.map((n) => {
          const cfg = typeConfig[n.type] ?? { icon: 'notifications', color: Colors.primaryDark, subtitle: '通知' };
          return (
            <TouchableOpacity key={n.id} onPress={() => handlePress(n)} activeOpacity={0.85}>
              <View style={[styles.card, !n.read && styles.cardUnread]}>

                {/* Top row: icon + title/subtitle + time */}
                <View style={styles.topRow}>
                  <View style={styles.iconWrap}>
                    <Ionicons name={cfg.icon as any} size={24} color={cfg.color} />
                  </View>
                  <View style={styles.titleBlock}>
                    <View style={styles.titleRow}>
                      <Text style={styles.title}>{n.title}</Text>
                      <Text style={styles.time}>{n.createdAt}</Text>
                    </View>
                    <Text style={styles.subtitle}>{cfg.subtitle}</Text>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Insight row */}
                <Text style={styles.insightText}>
                  <Text style={styles.insightLabel}>AI 洞察：</Text>
                  {n.summary}
                </Text>

              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_BG = '#F9F3EB';
const ICON_BG = '#E8E1D8';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },

  unreadBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  unreadCount: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.card,
  },
  markAllText: { fontSize: 13, fontWeight: '600', color: Colors.primaryDark },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.xl,
    padding: 20,
    gap: 16,
    ...Shadow.card,
  },
  cardUnread: {
    borderWidth: 1.5,
    borderColor: Colors.primary + '60',
  },

  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: ICON_BG,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  titleBlock: { flex: 1, gap: 4, paddingTop: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  subtitle: { fontSize: 14, color: Colors.textMuted },
  time: { fontSize: 13, color: Colors.textMuted, flexShrink: 0, marginTop: 2 },

  divider: { height: 1, backgroundColor: Colors.text + '0D' },

  insightLabel: { fontSize: 15, fontWeight: '700', color: Colors.primaryDark },
  insightText: { fontSize: 15, color: Colors.textLight, lineHeight: 24 },
});
