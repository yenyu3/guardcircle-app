import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { mockEvents } from '../../mock';
import Button from '../../components/Button';
import Card from '../../components/Card';
import RiskBadge from '../../components/RiskBadge';

export default function GuardianAlertScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'GuardianAlert'>>();
  const event = mockEvents.find((e) => e.id === route.params.eventId) || mockEvents[0];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.alertHeader}>
          <View style={styles.alertIcon}>
            <Ionicons name="warning" size={36} color={Colors.danger} />
          </View>
          <Text style={styles.alertTitle}>需要你的協助！</Text>
          <Text style={styles.alertSub}>{event.userNickname} 收到了高風險訊息</Text>
        </View>

        <Card variant="danger" style={styles.summaryCard}>
          <RiskBadge level={event.riskLevel} score={event.riskScore} />
          <Text style={styles.summaryText}>{event.summary.slice(0, 60)}…</Text>
          <Text style={styles.eventTime}>{event.createdAt}</Text>
        </Card>

        <View style={styles.mockThumb}>
          <Ionicons name="image" size={32} color={Colors.textMuted} />
          <Text style={styles.mockThumbText}>截圖縮圖（Demo）</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title={`📞 我去確認（打給${event.userNickname}）`}
            onPress={() => Alert.alert('撥打電話', `撥打給 ${event.userNickname}`)}
            size="large"
          />
          <Button
            title="✅ 已協助阻止"
            onPress={() => { Alert.alert('已記錄', '感謝你的協助！'); navigation.goBack(); }}
            variant="secondary"
          />
          <Button
            title="查看完整報告"
            onPress={() => navigation.navigate('FamilyEventDetail', { eventId: event.id })}
            variant="ghost"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: 24, gap: 16 },
  alertHeader: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  alertIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 24, fontWeight: '800', color: Colors.text },
  alertSub: { fontSize: 15, color: Colors.textLight },
  summaryCard: { gap: 8 },
  summaryText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  eventTime: { fontSize: 12, color: Colors.textMuted },
  mockThumb: { backgroundColor: Colors.card, borderRadius: Radius.lg, height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mockThumbText: { fontSize: 13, color: Colors.textMuted },
  actions: { gap: 12, marginTop: 8 },
});
