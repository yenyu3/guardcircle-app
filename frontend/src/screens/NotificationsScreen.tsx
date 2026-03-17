import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../theme';
import { RootStackParamList } from '../navigation';
import { mockNotifications } from '../mock';
import Card from '../components/Card';
import { Ionicons } from '@expo/vector-icons';

const typeIcon: Record<string, { icon: string; color: string }> = {
  HIGH_RISK: { icon: 'warning', color: Colors.danger },
  GUARDIAN_REPLY: { icon: 'checkmark-circle', color: Colors.safe },
  ESCALATE: { icon: 'alert-circle', color: Colors.danger },
  WEEKLY_REPORT: { icon: 'bar-chart', color: Colors.primaryDark },
  CONTRIBUTE_CONFIRM: { icon: 'star', color: Colors.warning },
  FAMILY_JOIN: { icon: 'people', color: Colors.primaryDark },
};

export default function NotificationsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [notifs, setNotifs] = useState(mockNotifications);

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
      <View style={styles.header}>
        <Text style={styles.title}>通知</Text>
        {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {notifs.map((n) => {
          const ic = typeIcon[n.type] || { icon: 'notifications', color: Colors.primaryDark };
          return (
            <TouchableOpacity key={n.id} onPress={() => handlePress(n)} activeOpacity={0.8}>
              <Card style={[styles.notifCard, !n.read ? styles.unread : null] as any}>
                <View style={[styles.iconWrap, { backgroundColor: ic.color + '22' }]}>
                  <Ionicons name={ic.icon as any} size={22} color={ic.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{n.title}</Text>
                  <Text style={styles.notifSummary}>{n.summary}</Text>
                  <Text style={styles.notifTime}>{n.createdAt}</Text>
                </View>
                {!n.read && <View style={styles.dot} />}
              </Card>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  badge: { backgroundColor: Colors.danger, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  container: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  unread: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  notifTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  notifSummary: { fontSize: 13, color: Colors.textLight, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: Colors.textMuted },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginTop: 6 },
});
