import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { useAppStore } from '../../store';
import Card from '../../components/Card';
import RiskBadge from '../../components/RiskBadge';
import Header from '../../components/Header';
import { Ionicons } from '@expo/vector-icons';
import { RiskLevel } from '../../types';

const FILTERS: { label: string; value: RiskLevel | 'all' }[] = [
  { label: '全部', value: 'all' },
  { label: '高風險', value: 'high' },
  { label: '中風險', value: 'medium' },
  { label: '安全', value: 'safe' },
];

export default function FamilyRecordScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { events } = useAppStore();
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = events.filter((e) => {
    const matchFilter = filter === 'all' || e.riskLevel === filter;
    const matchSearch = !search || e.scamType.includes(search) || e.userNickname.includes(search);
    return matchFilter && matchSearch;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="事件紀錄" onBack={() => navigation.goBack()} />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginLeft: 12 }} />
        <TextInput style={styles.search} placeholder="搜尋詐騙類型或成員" value={search} onChangeText={setSearch} placeholderTextColor={Colors.textMuted} />
      </View>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.value} onPress={() => setFilter(f.value)} style={[styles.filterBtn, filter === f.value && styles.filterActive]}>
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.container}>
        {filtered.map((e) => (
          <TouchableOpacity key={e.id} onPress={() => navigation.navigate('FamilyEventDetail', { eventId: e.id })}>
            <Card style={styles.eventCard}>
              <View style={styles.timelineLeft}>
                <View style={[styles.dot, { backgroundColor: e.riskLevel === 'high' ? Colors.danger : e.riskLevel === 'medium' ? Colors.warning : Colors.safe }]} />
                <View style={styles.line} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.eventHeader}>
                  <RiskBadge level={e.riskLevel} />
                  <Text style={styles.eventTime}>{e.createdAt}</Text>
                </View>
                <Text style={styles.eventTitle}>{e.userNickname} · {e.scamType}</Text>
                <Text style={styles.eventSummary} numberOfLines={2}>{e.summary}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </Card>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && <Text style={styles.empty}>沒有符合的紀錄</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.md, marginHorizontal: 16, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border },
  search: { flex: 1, padding: 12, fontSize: 14, color: Colors.text },
  filters: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterBtn: { borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: Colors.card },
  filterActive: { backgroundColor: Colors.primaryDark },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  filterTextActive: { color: Colors.white },
  container: { padding: 16, paddingBottom: Platform.OS === 'web' ? 100 : 32 },
  eventCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  timelineLeft: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, backgroundColor: Colors.border, marginTop: 4 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  eventTime: { fontSize: 11, color: Colors.textMuted },
  eventTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  eventSummary: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 14 },
});
