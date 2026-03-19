import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';
import Avatar from '../components/Avatar';
import Card from '../components/Card';

const roleLabel = { guardian: '守護者', gatekeeper: '守門人', solver: '識破者' };

const menuItems = [
  { icon: 'person-outline', label: '個人資料', screen: 'SettingsProfile' },
  { icon: 'people-outline', label: '家庭圈設定', screen: 'SettingsFamily' },
  { icon: 'notifications-outline', label: '通知設定', screen: 'SettingsAndroid' },
  { icon: 'phone-portrait-outline', label: 'Android 通知授權', screen: 'SettingsAndroid' },
  { icon: 'lock-closed-outline', label: '隱私設定', screen: 'SettingsPrivacy' },
] as const;

export default function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, logout } = useAppStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.primaryDark} />
          <Text style={styles.backText}>設定</Text>
        </TouchableOpacity>

        {/* Profile card */}
        <TouchableOpacity onPress={() => navigation.navigate('SettingsProfile')}>
          <Card style={styles.profileCard}>
            <Avatar initials={currentUser.nickname[0]} size={56} color={Colors.primaryDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.nickname}>{currentUser.nickname}</Text>
              <Text style={styles.email}>{currentUser.email}</Text>
              <View style={styles.rolePill}>
                <Text style={styles.roleText}>{roleLabel[currentUser.role]}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Card>
        </TouchableOpacity>

        {/* Menu */}
        <Card style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuRow, i < menuItems.length - 1 && styles.menuBorder]}
              onPress={() => navigation.navigate(item.screen as any)}
            >
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert('登出', '確定要登出嗎？', [
            { text: '取消' },
            { text: '登出', style: 'destructive', onPress: () => { logout(); navigation.replace('Login'); } },
          ])}
        >
          <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
          <Text style={styles.logoutText}>登出</Text>
        </TouchableOpacity>

        <Text style={styles.version}>守護圈 GuardCircle v1.0.0 Demo</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText: { fontSize: 20, fontWeight: '800', color: Colors.text },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  nickname: { fontSize: 18, fontWeight: '700', color: Colors.text },
  email: { fontSize: 13, color: Colors.textLight, marginBottom: 6 },
  rolePill: { backgroundColor: Colors.card, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  roleText: { fontSize: 12, fontWeight: '700', color: Colors.primaryDark },
  menuCard: { padding: 0, overflow: 'hidden', marginBottom: 16 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, backgroundColor: Colors.dangerBg, borderRadius: Radius.lg, marginBottom: 20 },
  logoutText: { fontSize: 15, fontWeight: '700', color: Colors.danger },
  version: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});
