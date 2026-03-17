import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Radius, Shadow } from '../../theme';
import { useAppStore } from '../../store';
import { Role } from '../../types';
import { RootStackParamList } from '../../navigation';
import Button from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const roles: { role: Role; icon: string; title: string; desc: string; color: string }[] = [
  { role: 'guardian', icon: 'heart', title: '守護者 Guardian', desc: '我希望有人幫我守護，家人協助我確認可疑訊息', color: '#E97A7A' },
  { role: 'gatekeeper', icon: 'shield', title: '守門人 Gatekeeper', desc: '我想保護家中長輩，監控家人安全狀態', color: '#FFB38A' },
  { role: 'solver', icon: 'bulb', title: '識破者 Solver', desc: '我想快速識破詐騙，了解最新詐騙手法', color: '#7BBF8E' },
];

export default function RoleSelectScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { setRole, currentUser } = useAppStore();
  const [selected, setSelected] = useState<Role>('gatekeeper');

  const handleConfirm = () => {
    setRole(selected);
    navigation.replace('FamilyJoin');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>你想怎麼使用守護圈？</Text>
        <Text style={styles.sub}>選擇最符合你的使用方式，之後可以在設定中切換</Text>

        <View style={styles.cards}>
          {roles.map((r) => {
            const active = selected === r.role;
            return (
              <TouchableOpacity
                key={r.role}
                onPress={() => setSelected(r.role)}
                activeOpacity={0.8}
                style={[styles.card, active ? { borderColor: r.color, borderWidth: 2.5 } : null, Shadow.card] as any}
              >
                <View style={[styles.iconWrap, { backgroundColor: r.color + '22' }]}>
                  <Ionicons name={r.icon as any} size={28} color={r.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleTitle}>{r.title}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={24} color={r.color} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <Button title="確認角色，繼續" onPress={handleConfirm} size="large" style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.textLight, marginBottom: 28, lineHeight: 20 },
  cards: { gap: 14, marginBottom: 24 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, gap: 14, borderWidth: 2, borderColor: 'transparent' },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  roleDesc: { fontSize: 13, color: Colors.textLight, lineHeight: 18 },
});
