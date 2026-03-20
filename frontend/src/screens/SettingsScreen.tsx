import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';

const roleLabel = { guardian: '守護者', gatekeeper: '守門人', solver: '識破者' };

const avatarMap: Record<string, any> = {
  guardian_female:   require('../public/guardian_w.png'),
  guardian_male:     require('../public/guardian_m.png'),
  gatekeeper_female: require('../public/gatekeeper_w.png'),
  gatekeeper_male:   require('../public/gatekeeper_m.png'),
  solver_female:     require('../public/solver_w.png'),
  solver_male:       require('../public/solver_m.png'),
};

const menuItems = [
  { icon: 'person-outline',        label: '個人資料',    screen: 'SettingsProfile' },
  { icon: 'notifications-outline', label: '通知提醒設定', screen: 'SettingsAndroid' },
  { icon: 'lock-closed-outline',   label: '隱私與安全',  screen: 'SettingsPrivacy' },
  { icon: 'options-outline',       label: '進階設定',    screen: 'SettingsAdvanced' },
] as const;

export default function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, logout } = useAppStore();

  const gender = currentUser.gender === 'female' ? 'female' : currentUser.gender === 'male' ? 'male' : null;
  const avatarKey = gender ? `${currentUser.role}_${gender}` : null;
  const avatarSrc = avatarKey ? avatarMap[avatarKey] : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <View style={styles.profileSection}>
          {avatarSrc ? (
            <Image source={avatarSrc} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={44} color={Colors.primaryDark} />
            </View>
          )}
          <Text style={styles.nickname}>{currentUser.nickname}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{roleLabel[currentUser.role]}</Text>
          </View>
        </View>

        {/* Section label */}
        <Text style={styles.sectionLabel}>帳戶與安全</Text>

        {/* Menu card */}
        <View style={[styles.menuCard, Shadow.card]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, i < menuItems.length - 1 && styles.menuBorder]}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert('登出', '確定要登出嗎？', [
              { text: '取消' },
              { text: '登出', style: 'destructive', onPress: () => { logout(); navigation.replace('Login'); } },
            ])
          }
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>登出帳號</Text>
        </TouchableOpacity>

        <Text style={styles.version}>守護圈 GuardCircle v1.0.0 Demo</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: Colors.text },
  headerRight: { width: 36 },

  container: { paddingHorizontal: 20, paddingBottom: 40 },

  profileSection: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatarImg: {
    width: 112, height: 112, borderRadius: 56,
    borderWidth: 4, borderColor: Colors.white,
    ...Shadow.strong,
  },
  avatarFallback: {
    width: 112, height: 112, borderRadius: 56,
    backgroundColor: Colors.card,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: Colors.white,
    ...Shadow.strong,
  },
  nickname: { fontSize: 24, fontWeight: '700', color: Colors.text, marginTop: 4 },
  rolePill: {
    backgroundColor: Colors.primary + '33',
    borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  roleText: { fontSize: 13, fontWeight: '600', color: Colors.primaryDark },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 1.5,
    marginBottom: 10, marginTop: 4, paddingHorizontal: 4,
  },

  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: 28,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, minHeight: 64, gap: 14,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.bg },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.primary + '1A',
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.text },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.white,
    borderRadius: Radius.lg, paddingVertical: 18,
    borderWidth: 1, borderColor: '#FDDEDE',
    ...Shadow.card,
    marginBottom: 20,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.danger },

  version: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});
