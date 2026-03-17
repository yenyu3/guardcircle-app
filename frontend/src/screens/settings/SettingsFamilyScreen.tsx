import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import { useAppStore } from '../../store';
import { mockFamily } from '../../mock';
import Header from '../../components/Header';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';

export default function SettingsFamilyScreen() {
  const navigation = useNavigation();
  const { currentUser } = useAppStore();
  const isGatekeeper = currentUser.role === 'gatekeeper';
  const [threshold, setThreshold] = useState<'60' | '70' | '80'>('70');

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="家庭圈設定" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.section}>
          <View style={styles.familyHeader}>
            <View>
              <Text style={styles.familyName}>{mockFamily.name}</Text>
              <Text style={styles.familyId}>ID: GC-482951</Text>
            </View>
            <Button title="邀請" onPress={() => Alert.alert('邀請家人')} variant="secondary" style={{ paddingHorizontal: 14 }} />
          </View>
          {mockFamily.members.map((m) => (
            <View key={m.id} style={styles.memberRow}>
              <Avatar initials={m.nickname[0]} size={36} />
              <Text style={styles.memberName}>{m.nickname}</Text>
              <Text style={styles.memberRole}>{m.role === 'guardian' ? '守護者' : m.role === 'gatekeeper' ? '守門人' : '識破者'}</Text>
            </View>
          ))}
        </Card>

        {isGatekeeper && (
          <>
            <Text style={styles.sectionLabel}>守護者設定</Text>
            <Card style={styles.section}>
              <Text style={styles.settingLabel}>風險通知門檻</Text>
              <View style={styles.thresholdRow}>
                {(['60', '70', '80'] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.thresholdBtn, threshold === v && styles.thresholdActive]}
                    onPress={() => setThreshold(v)}
                  >
                    <Text style={[styles.thresholdText, threshold === v && styles.thresholdTextActive]}>
                      {v} 分以上
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.settingLabel}>關鍵字黑名單</Text>
              <Text style={styles.settingHint}>偵測到以下關鍵字時立即通知守門人</Text>
              <View style={styles.keywords}>
                {['匯款', '轉帳', '提款機', '解除分期', '保管費'].map((k) => (
                  <View key={k} style={styles.keyword}>
                    <Text style={styles.keywordText}>{k}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.settingLabel}>靜默時段</Text>
              <Text style={styles.settingHint}>此時段不發送通知（緊急高風險除外）</Text>
              <Text style={styles.settingValue}>23:00 – 07:00</Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 6 },
  familyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  familyName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  familyId: { fontSize: 12, color: Colors.textMuted },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  memberName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  memberRole: { fontSize: 12, color: Colors.textMuted },
  settingLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  settingHint: { fontSize: 12, color: Colors.textLight, marginBottom: 10 },
  settingValue: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  thresholdRow: { flexDirection: 'row', gap: 8 },
  thresholdBtn: { flex: 1, borderRadius: Radius.md, padding: 10, backgroundColor: Colors.bg, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  thresholdActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  thresholdText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  thresholdTextActive: { color: Colors.white },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keyword: { backgroundColor: Colors.dangerBg, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  keywordText: { fontSize: 13, fontWeight: '600', color: Colors.danger },
});
