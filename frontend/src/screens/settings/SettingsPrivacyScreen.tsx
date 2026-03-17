import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import Header from '../../components/Header';
import Card from '../../components/Card';
import Button from '../../components/Button';

const RETENTION_OPTIONS = [
  { label: '7 天', value: 7 },
  { label: '30 天', value: 30 },
  { label: '90 天', value: 90 },
];

export default function SettingsPrivacyScreen() {
  const navigation = useNavigation();
  const [retention, setRetention] = useState(30);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="隱私設定" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>資料保留期限</Text>
          <Text style={styles.hint}>分析紀錄將在選定天數後自動刪除</Text>
          <View style={styles.options}>
            {RETENTION_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.optionBtn, retention === o.value && styles.optionActive]}
                onPress={() => setRetention(o.value)}
              >
                <Text style={[styles.optionText, retention === o.value && styles.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>資料管理</Text>
          <Button
            title="清除所有分析紀錄"
            onPress={() => Alert.alert('確認清除', '此操作無法復原，確定要清除所有紀錄嗎？', [
              { text: '取消' },
              { text: '清除', style: 'destructive', onPress: () => Alert.alert('已清除') },
            ])}
            variant="secondary"
          />
        </Card>

        <Card variant="danger" style={styles.section}>
          <Text style={styles.sectionTitle}>危險區域</Text>
          <Button
            title="刪除帳號"
            onPress={() => Alert.alert('刪除帳號', '此操作無法復原，所有資料將永久刪除', [
              { text: '取消' },
              { text: '刪除', style: 'destructive', onPress: () => Alert.alert('帳號已刪除（Demo）') },
            ])}
            variant="danger"
          />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, gap: 14 },
  section: {},
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  hint: { fontSize: 12, color: Colors.textLight, marginBottom: 12 },
  options: { flexDirection: 'row', gap: 10 },
  optionBtn: { flex: 1, borderRadius: Radius.md, padding: 12, backgroundColor: Colors.bg, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  optionActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  optionText: { fontSize: 14, fontWeight: '600', color: Colors.textLight },
  optionTextActive: { color: Colors.white },
});
