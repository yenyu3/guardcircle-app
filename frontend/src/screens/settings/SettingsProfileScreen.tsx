import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import { useAppStore } from '../../store';
import Header from '../../components/Header';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Avatar from '../../components/Avatar';

export default function SettingsProfileScreen() {
  const navigation = useNavigation();
  const { currentUser, setUser, setRole } = useAppStore();
  const [nickname, setNickname] = useState(currentUser.nickname);

  const roleLabel = { guardian: '守護者', gatekeeper: '守門人', solver: '識破者' };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="個人資料" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <View style={styles.avatarRow}>
          <Avatar initials={nickname[0] || '?'} size={72} color={Colors.primaryDark} />
          <Button title="更換頭像（Demo）" onPress={() => Alert.alert('更換頭像', '此為 Demo')} variant="ghost" style={{ marginTop: 8 }} />
        </View>

        <Card style={styles.form}>
          <Text style={styles.label}>暱稱</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.label}>目前角色</Text>
          <View style={styles.roleRow}>
            <Text style={styles.roleValue}>{roleLabel[currentUser.role]}</Text>
            <Button
              title="切換角色"
              onPress={() => Alert.alert('切換角色', '請選擇新角色', [
                { text: '守護者', onPress: () => setRole('guardian') },
                { text: '守門人', onPress: () => setRole('gatekeeper') },
                { text: '識破者', onPress: () => setRole('solver') },
                { text: '取消', style: 'cancel' },
              ])}
              variant="secondary"
              style={{ paddingHorizontal: 14 }}
            />
          </View>
        </Card>

        <Button
          title="儲存變更"
          onPress={() => { setUser({ nickname }); Alert.alert('已儲存'); navigation.goBack(); }}
          size="large"
          style={{ marginTop: 16 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20 },
  avatarRow: { alignItems: 'center', marginBottom: 20 },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 12, fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  roleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
});
