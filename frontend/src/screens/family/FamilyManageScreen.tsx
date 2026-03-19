import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import { mockFamily } from '../../mock';
import Header from '../../components/Header';
import Card from '../../components/Card';
import NpcAvatar from '../../components/NpcAvatar';

const roleLabel = { guardian: '守護者', gatekeeper: '守門人', solver: '識破者' };
const roleColor = { guardian: Colors.danger, gatekeeper: Colors.primaryDark, solver: Colors.safe };

export default function FamilyManageScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="管理家庭圈" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionLabel}>成員列表</Text>
        {mockFamily.members.map((m, i) => (
          <Card key={m.id} style={styles.memberCard}>
            <View style={styles.priority}>
              <Text style={styles.priorityNum}>{i + 1}</Text>
            </View>
            <NpcAvatar avatar={m.avatar} initials={m.nickname[0]} size={44} color={roleColor[m.role]} borderColor={roleColor[m.role] + '44'} borderWidth={2} />
            <View style={{ flex: 1 }}>
              <Text style={styles.memberName}>{m.nickname}</Text>
              <View style={[styles.rolePill, { backgroundColor: roleColor[m.role] + '22' }]}>
                <Text style={[styles.roleText, { color: roleColor[m.role] }]}>{roleLabel[m.role]}</Text>
              </View>
            </View>
            <Ionicons name="reorder-three-outline" size={22} color={Colors.textMuted} />
          </Card>
        ))}
        <Text style={styles.hint}>守門人優先順序：當高風險事件發生時，依序通知守門人</Text>

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>家庭圈資訊</Text>
        <Card>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>家庭圈名稱</Text>
            <Text style={styles.infoValue}>{mockFamily.name}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>家庭 ID</Text>
            <Text style={styles.infoValue}>GC-482951</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>建立日期</Text>
            <Text style={styles.infoValue}>{mockFamily.createdAt}</Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  memberCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  priority: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  priorityNum: { fontSize: 13, fontWeight: '700', color: Colors.textLight },
  memberName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  rolePill: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  roleText: { fontSize: 11, fontWeight: '700' },
  hint: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 14, color: Colors.textLight },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
});
