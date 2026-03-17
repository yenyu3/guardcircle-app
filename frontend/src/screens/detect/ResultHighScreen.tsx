import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store';
import Button from '../../components/Button';
import Card from '../../components/Card';
import RiskBadge from '../../components/RiskBadge';

export default function ResultHighScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ResultHigh'>>();
  const { currentUser } = useAppStore();
  const { scamType, riskScore, riskFactors, summary } = route.params;
  const isGuardian = currentUser.role === 'guardian';

  // Guardian: full-screen danger
  if (isGuardian) {
    return (
      <View style={styles.guardianFull}>
        <View style={styles.guardianCenter}>
          <View style={styles.dangerIcon}>
            <Ionicons name="warning" size={64} color={Colors.white} />
          </View>
          <Text style={styles.dangerTitle}>危險！</Text>
          <Text style={styles.dangerDesc}>
            這很可能是詐騙！{'\n'}請不要轉帳，也不要依照對方指示操作
          </Text>
          <View style={styles.notifyBox}>
            <Ionicons name="notifications" size={18} color={Colors.white} />
            <Text style={styles.notifyText}>已通知守門人「小明」，正在等待確認</Text>
          </View>
        </View>
        <View style={styles.guardianBottom}>
          <Button
            title="請勿轉帳，我知道了"
            onPress={() => navigation.navigate('Main')}
            size="large"
            style={styles.guardianBtn}
          />
        </View>
      </View>
    );
  }

  // Gatekeeper
  if (currentUser.role === 'gatekeeper') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <Ionicons name="warning" size={32} color={Colors.danger} />
            <Text style={styles.highTitle}>高風險詐騙偵測</Text>
          </View>
          <RiskBadge level="high" score={riskScore} size="lg" />
          <Card variant="danger" style={styles.section}>
            <Text style={styles.sectionTitle}>詐騙類型</Text>
            <Text style={styles.scamType}>{scamType}</Text>
          </Card>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Top 3 風險因子</Text>
            {riskFactors.slice(0, 3).map((f, i) => (
              <View key={i} style={styles.factorRow}>
                <Text style={styles.factorNum}>{i + 1}</Text>
                <Text style={styles.factorText}>{f}</Text>
              </View>
            ))}
          </Card>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>分析摘要</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </Card>
          <View style={styles.actions}>
            <Button title="聯絡長輩" onPress={() => Alert.alert('撥打電話給長輩')} size="large" />
            <Button title="回報 165 反詐騙" onPress={() => Alert.alert('前往 165 回報')} variant="danger" />
          </View>
          <Button title="返回首頁" onPress={() => navigation.navigate('Main')} variant="ghost" style={{ marginTop: 8 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Solver
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Ionicons name="warning" size={32} color={Colors.danger} />
          <Text style={styles.highTitle}>高風險詐騙偵測</Text>
        </View>
        <RiskBadge level="high" score={riskScore} size="lg" />
        <Card variant="danger" style={styles.section}>
          <Text style={styles.sectionTitle}>詐騙類型</Text>
          <Text style={styles.scamType}>{scamType}</Text>
        </Card>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>手法拆解</Text>
          <Text style={styles.summaryText}>{summary}</Text>
          {riskFactors.map((f, i) => (
            <View key={i} style={styles.factorRow}>
              <Ionicons name="chevron-forward" size={14} color={Colors.primaryDark} />
              <Text style={styles.factorText}>{f}</Text>
            </View>
          ))}
        </Card>
        <Card variant="warning" style={styles.section}>
          <Text style={styles.sectionTitle}>話術心理學</Text>
          <Text style={styles.summaryText}>此類詐騙利用「權威感」與「緊迫感」雙重壓力，讓受害者在恐慌中做出非理性決定，無法冷靜思考。</Text>
        </Card>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>本週趨勢</Text>
          <Text style={styles.summaryText}>本週同類型詐騙案件 +34%，主要目標為 60 歲以上長輩，請提醒家人。</Text>
        </Card>
        <View style={styles.actions}>
          <Button title="查看知識卡" onPress={() => navigation.navigate('KnowledgeCard', { cardId: 'k1' })} />
          <Button title="回報詐騙" onPress={() => Alert.alert('感謝回報！', '你的貢獻幫助更多人')} variant="secondary" />
        </View>
        <Button title="返回首頁" onPress={() => navigation.navigate('Main')} variant="ghost" style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  // Guardian full screen
  guardianFull: { flex: 1, backgroundColor: Colors.danger },
  guardianCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  dangerIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dangerTitle: { fontSize: 48, fontWeight: '900', color: Colors.white },
  dangerDesc: { fontSize: 20, color: Colors.white, textAlign: 'center', lineHeight: 30, fontWeight: '600' },
  notifyBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.lg, padding: 14 },
  notifyText: { fontSize: 14, color: Colors.white, flex: 1 },
  guardianBottom: { padding: 24, paddingBottom: 40 },
  guardianBtn: { backgroundColor: Colors.white },
  // Shared
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  highTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  section: { marginTop: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  scamType: { fontSize: 18, fontWeight: '700', color: Colors.danger },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  factorNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.danger, color: Colors.white, fontSize: 12, fontWeight: '700', textAlign: 'center', lineHeight: 22 },
  factorText: { fontSize: 14, color: Colors.text, flex: 1 },
  summaryText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  actions: { gap: 12, marginTop: 20 },
});
