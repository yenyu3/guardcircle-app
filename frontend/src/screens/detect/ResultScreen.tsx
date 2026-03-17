import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store';
import Button from '../../components/Button';
import Card from '../../components/Card';
import RiskBadge from '../../components/RiskBadge';
import Header from '../../components/Header';

export default function ResultScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Result'>>();
  const { currentUser } = useAppStore();
  const { riskLevel, riskScore, scamType, riskFactors, summary, hasFinancialKeyword } = route.params;
  const isGuardian = currentUser.role === 'guardian';
  const [confirmed, setConfirmed] = useState(false);

  const isSafe = riskLevel === 'safe';

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="分析結果" onBack={() => navigation.navigate('Main')} />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Risk icon */}
        <View style={[styles.iconWrap, { backgroundColor: isSafe ? Colors.safeBg : Colors.warningBg }]}>
          <Ionicons
            name={isSafe ? 'checkmark-circle' : 'alert-circle'}
            size={64}
            color={isSafe ? Colors.safe : Colors.warning}
          />
        </View>

        <Text style={styles.title}>
          {isSafe ? '看起來安全' : '請先暫停，確認後再行動'}
        </Text>
        <RiskBadge level={riskLevel} score={riskScore} size="lg" />

        {/* Guardian safe + financial keyword */}
        {isGuardian && isSafe && hasFinancialKeyword && !confirmed && (
          <Card variant="warning" style={styles.section}>
            <Text style={styles.warningText}>
              目前沒有明確詐騙特徵，但內容提到了匯款，建議先和家人確認再行動
            </Text>
            <Button
              title="我已和家人確認，這是安全的"
              onPress={() => setConfirmed(true)}
              variant="secondary"
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>分析摘要</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </Card>

        {riskFactors.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>風險因子</Text>
            {riskFactors.map((f, i) => (
              <View key={i} style={styles.factorRow}>
                <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                <Text style={styles.factorText}>{f}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Role-specific actions */}
        {isGuardian && isSafe && (
          <>
            <Text style={styles.guardianNote}>即使結果顯示安全，若感覺怪怪的，仍可詢問家人</Text>
            <Button title="如果還是不確定，詢問家人" onPress={() => Alert.alert('已通知守門人', '家人會盡快回覆你')} variant="ghost" style={{ marginTop: 8 }} />
          </>
        )}

        {isGuardian && !isSafe && (
          <View style={styles.actions}>
            <Button title="聯絡家人確認" onPress={() => Alert.alert('已通知守門人')} size="large" />
            <Button title="撥打 165 反詐騙專線" onPress={() => Alert.alert('撥打 165')} variant="secondary" />
          </View>
        )}

        {currentUser.role === 'gatekeeper' && !isSafe && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>守門人建議</Text>
            <Text style={styles.summaryText}>此訊息有可疑特徵，建議主動聯繫家人確認，並持續監控後續動態。</Text>
          </Card>
        )}

        {currentUser.role === 'solver' && !isSafe && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>手法說明</Text>
            <Text style={styles.summaryText}>此為「{scamType}」常見手法，利用緊迫感與權威感讓受害者在壓力下做出錯誤決定。建議保持警覺並回報。</Text>
          </Card>
        )}

        <Button title="完成" onPress={() => navigation.navigate('Main')} variant="ghost" style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  iconWrap: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 10, textAlign: 'center' },
  section: { width: '100%', marginTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  summaryText: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  factorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  factorText: { fontSize: 14, color: Colors.text },
  warningText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  guardianNote: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginTop: 16, lineHeight: 20 },
  actions: { width: '100%', gap: 12, marginTop: 16 },
});
