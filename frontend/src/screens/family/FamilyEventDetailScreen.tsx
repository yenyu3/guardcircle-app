import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store';
import Card from '../../components/Card';
import RiskBadge from '../../components/RiskBadge';
import Header from '../../components/Header';
import Button from '../../components/Button';

export default function FamilyEventDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'FamilyEventDetail'>>();
  const { currentUser } = useAppStore();
  const event = useAppStore.getState().events.find((e) => e.id === route.params.eventId) || useAppStore.getState().events[0];
  const [blurred, setBlurred] = useState(true);

  const riskColor = event.riskLevel === 'high' ? Colors.danger : event.riskLevel === 'medium' ? Colors.warning : Colors.safe;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="事件詳情" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Risk icon */}
        <View style={[styles.riskIcon, { backgroundColor: riskColor + '22' }]}>
          <Ionicons name={event.riskLevel === 'safe' ? 'checkmark-circle' : 'warning'} size={48} color={riskColor} />
        </View>
        <RiskBadge level={event.riskLevel} score={event.riskScore} size="lg" />
        <Text style={styles.meta}>{event.createdAt} · {event.userNickname}</Text>

        {/* Input content */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>原始輸入內容</Text>
            {event.type === 'image' && (
              <TouchableOpacity onPress={() => setBlurred(!blurred)}>
                <Text style={styles.toggleBlur}>{blurred ? '顯示原圖' : '模糊處理'}</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.inputBox, blurred && event.type === 'image' && styles.blurred]}>
            <Text style={styles.inputText}>{event.input}</Text>
          </View>
        </Card>

        {/* Analysis */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>分析摘要</Text>
          <Text style={styles.summaryText}>{event.summary}</Text>
          <View style={styles.scamTag}>
            <Text style={styles.scamTagText}>{event.scamType}</Text>
          </View>
        </Card>

        {event.riskFactors.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>風險因子</Text>
            {event.riskFactors.map((f, i) => (
              <View key={i} style={styles.factorRow}>
                <Ionicons name="warning-outline" size={14} color={Colors.warning} />
                <Text style={styles.factorText}>{f}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Gatekeeper response timeline */}
        {event.gatekeeperResponse && (
          <Card variant="safe" style={styles.section}>
            <Text style={styles.sectionTitle}>守門人回應</Text>
            <View style={styles.responseRow}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.safe} />
              <View>
                <Text style={styles.responseText}>{event.gatekeeperResponse}</Text>
                <Text style={styles.responseTime}>{event.gatekeeperResponseAt}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Role actions */}
        {currentUser.role === 'gatekeeper' && (
          <View style={styles.actions}>
            <Button title="回報 165" onPress={() => Alert.alert('前往 165 回報')} variant="danger" />
            <Button title="生成證據包" onPress={() => Alert.alert('證據包已生成（Demo）')} variant="secondary" />
          </View>
        )}
        {currentUser.role === 'guardian' && (
          <Button title="感謝家人幫忙 ❤️" onPress={() => Alert.alert('已傳送感謝給守門人')} style={{ marginTop: 16 }} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  riskIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  meta: { fontSize: 13, color: Colors.textMuted, marginTop: 8, marginBottom: 4 },
  section: { width: '100%', marginTop: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  toggleBlur: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600' },
  inputBox: { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 12 },
  blurred: { opacity: 0.1 },
  inputText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  summaryText: { fontSize: 14, color: Colors.text, lineHeight: 22, marginBottom: 8 },
  scamTag: { backgroundColor: Colors.card, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start' },
  scamTagText: { fontSize: 12, fontWeight: '700', color: Colors.primaryDark },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  factorText: { fontSize: 13, color: Colors.text },
  responseRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  responseText: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  responseTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  actions: { width: '100%', gap: 12, marginTop: 16 },
});
