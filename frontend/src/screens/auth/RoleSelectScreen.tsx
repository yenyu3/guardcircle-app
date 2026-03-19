import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Radius } from '../../theme';
import { useAppStore } from '../../store';
import { Role } from '../../types';
import { RootStackParamList } from '../../navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ShieldHeartIcon from '../../components/ShieldHeartIcon';

const DS = {
  bg: '#fff8f1',
  surface: '#fcf2e3',
  cardBg: '#f1e7d8',
  cardSelected: '#ffffff',
  primary: '#89502e',
  primaryContainer: '#ffb38a',
  secondary: '#6e5b45',
  onSurface: '#1f1b12',
  outline: '#85736b',
  outlineVariant: '#d7c2b9',
  tertiary: '#146870',
  tertiaryContainer: '#88d0d8',
};

const roles: { role: Role; icon: keyof typeof Ionicons.glyphMap; title: string; titleEn: string; desc: string; recommended?: boolean; iconBg: string; iconColor: string }[] = [
  {
    role: 'guardian',
    icon: 'shield-outline',
    title: '守護者',
    titleEn: 'Guardian',
    desc: '我希望家人協助我確認可疑訊息',
    iconBg: DS.primaryContainer + '44',
    iconColor: DS.primary,
  },
  {
    role: 'gatekeeper',
    icon: 'eye',
    title: '守門人',
    titleEn: 'Gatekeeper',
    desc: '我想保護家人，監控家人的安全狀態',
    recommended: true,
    iconBg: DS.primary,
    iconColor: '#ffffff',
  },
  {
    role: 'solver',
    icon: 'bulb-outline',
    title: '識破者',
    titleEn: 'Solver',
    desc: '我想快速識破詐騙，了解最新詐騙手法',
    iconBg: DS.tertiaryContainer + '44',
    iconColor: DS.tertiary,
  },
];

export default function RoleSelectScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { setRole } = useAppStore();
  const [selected, setSelected] = useState<Role>('gatekeeper');

  const handleConfirm = () => {
    setRole(selected);
    navigation.replace('FamilyJoin');
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — fixed, outside ScrollView */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <ShieldHeartIcon size={28} color={DS.primary} bgColor={DS.bg} />
          <Text style={styles.headerTitle}>GuardCircle</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="person" size={18} color={DS.outline} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>
            你想怎麼使用{'\n'}<Text style={styles.titleAccent}>守護圈？</Text>
          </Text>
          <Text style={styles.sub}>選擇最符合你的使用方式，之後可以在設定中切換。</Text>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {roles.map((r) => {
            const active = selected === r.role;
            return (
              <View key={r.role}>
                {r.recommended && (
                  <View style={styles.recommendedWrap}>
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>推薦</Text>
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => setSelected(r.role)}
                  activeOpacity={0.85}
                  style={[styles.card, active && styles.cardSelected]}
                >
                  <View style={[styles.iconWrap, { backgroundColor: r.iconBg }]}>
                    <Ionicons name={r.icon} size={26} color={r.iconColor} />
                  </View>
                  <Text style={styles.roleTitle}>{r.titleEn}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
                  {active && (
                    <View style={styles.selectedRow}>
                      <Text style={styles.selectedLabel}>已選擇</Text>
                      <Ionicons name="checkmark-circle" size={16} color={DS.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable onPress={handleConfirm} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <LinearGradient
            colors={[DS.primary, DS.primaryContainer]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>確認</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: DS.bg,
  },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: DS.primary, letterSpacing: -0.5 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ebe1d3', alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  titleWrap: { marginTop: 12, marginBottom: 28 },
  title: { fontSize: 30, fontWeight: '800', color: DS.onSurface, lineHeight: 38, marginBottom: 12 },
  titleAccent: { color: DS.primary },
  sub: { fontSize: 14, color: DS.secondary, lineHeight: 22 },

  cards: { gap: 16, marginBottom: 32 },

  recommendedWrap: { alignItems: 'center', marginBottom: -14, zIndex: 1 },
  recommendedBadge: {
    backgroundColor: DS.primary, paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  recommendedText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  card: {
    backgroundColor: DS.cardBg, borderRadius: 20,
    padding: 24, borderWidth: 2, borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: DS.cardSelected,
    borderColor: DS.primary,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  roleTitle: { fontSize: 22, fontWeight: '800', color: DS.onSurface, marginBottom: 8 },
  roleDesc: { fontSize: 14, color: DS.secondary, lineHeight: 22 },
  selectedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  selectedLabel: { fontSize: 12, fontWeight: '700', color: DS.primary, letterSpacing: 1 },

  ctaBtn: {
    borderRadius: Radius.full, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  step: { textAlign: 'center', fontSize: 13, color: DS.secondary, marginTop: 16 },

  footer: { alignItems: 'center', marginTop: 40, gap: 12 },
  footerLine: { width: 48, height: 2, backgroundColor: '#ebe1d3', borderRadius: 1 },
  footerText: { fontSize: 12, color: DS.outline },
});
