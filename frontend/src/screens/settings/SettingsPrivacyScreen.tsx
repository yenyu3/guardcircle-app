import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { Colors, Radius, Shadow } from '../../theme';

const DS = {
  primary: '#89502e',
  secondary: '#6e5b45',
  outlineVariant: '#d7c2b9',
};

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
      <Header title="隱私與安全" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* 資料保留期限 */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>資料保留期限</Text>
          <Text style={styles.sectionDesc}>分析紀錄將在選定天數後自動刪除</Text>
          <View style={styles.options}>
            {RETENTION_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={[styles.optionBtn, retention === o.value && styles.optionActive]}
                onPress={() => setRetention(o.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, retention === o.value && styles.optionTextActive]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 資料管理 */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>資料管理</Text>
          <Text style={styles.sectionDesc}>清除後無法復原，請謹慎操作</Text>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert('確認清除', '此操作無法復原，確定要清除所有紀錄嗎？', [
                { text: '取消' },
                { text: '清除', style: 'destructive', onPress: () => Alert.alert('已清除') },
              ])
            }
          >
            <View style={styles.actionIcon}>
              <Ionicons name="trash-outline" size={18} color={DS.primary} />
            </View>
            <Text style={styles.actionLabel}>清除所有分析紀錄</Text>

          </TouchableOpacity>
        </View>

        {/* 危險區域 */}
        <View style={[styles.card, Shadow.card, styles.dangerCard]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>危險區域</Text>
          <Text style={styles.sectionDesc}>以下操作無法復原</Text>
          <TouchableOpacity
            style={styles.dangerRow}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert('刪除帳號', '此操作無法復原，所有資料將永久刪除', [
                { text: '取消' },
                { text: '刪除', style: 'destructive', onPress: () => Alert.alert('帳號已刪除（Demo）') },
              ])
            }
          >
            <View style={styles.dangerIcon}>
              <Ionicons name="person-remove-outline" size={18} color={Colors.danger} />
            </View>
            <Text style={styles.dangerLabel}>刪除帳號</Text>

          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40, gap: 16, paddingTop: 8 },

  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: Colors.textMuted, marginBottom: 16, lineHeight: 18 },

  options: { flexDirection: 'row', gap: 10 },
  optionBtn: {
    flex: 1, borderRadius: Radius.md, paddingVertical: 12,
    backgroundColor: Colors.bg, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  optionActive: { backgroundColor: DS.primary, borderColor: DS.primary },
  optionText: { fontSize: 14, fontWeight: '600', color: Colors.textLight },
  optionTextActive: { color: Colors.white },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bg, borderRadius: Radius.md,
    padding: 14, borderWidth: 1.5, borderColor: Colors.border,
  },
  actionIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: DS.primary + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },

  dangerCard: {},
  dangerTitle: { color: Colors.danger },
  dangerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF5F5', borderRadius: Radius.md,
    padding: 14, borderWidth: 1.5, borderColor: '#FDDEDE',
  },
  dangerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.danger + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  dangerLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.danger },
});
