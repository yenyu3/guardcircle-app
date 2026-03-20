import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Card from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';

function genFamilyId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function FamilyCreateScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [familyId, setFamilyId] = useState('');

  const handleConfirm = () => {
    setFamilyId(genFamilyId());
    setConfirmed(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="建立家庭圈" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Text style={styles.label}>家庭圈名稱</Text>
        <TextInput
          style={[styles.input, confirmed && styles.inputLocked]}
          placeholder="例如：林家守護圈"
          value={name}
          onChangeText={setName}
          placeholderTextColor={Colors.textMuted}
          editable={!confirmed}
        />

        {!confirmed && (
          <Button
            title="確認名稱"
            onPress={handleConfirm}
            disabled={!name}
            size="large"
            style={{ marginTop: 4 }}
          />
        )}

        {confirmed && (
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="key-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.infoLabel}>家庭 ID</Text>
              <Text style={styles.infoValue}>{familyId}</Text>
            </View>
            <View style={styles.qrBox}>
              <Ionicons name="qr-code" size={80} color={Colors.textMuted} />
              <Text style={styles.qrLabel}>QR Code（Demo）</Text>
            </View>
          </Card>
        )}

        {confirmed && (
          <Button
            title="建立家庭圈"
            onPress={() => Alert.alert('建立成功！', `家庭圈「${name}」已建立\nID：${familyId}\n快邀請家人加入`)}
            size="large"
            style={{ marginTop: 16 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: {
    backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14,
    fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 16,
  },
  inputLocked: {
    backgroundColor: Colors.bg, color: Colors.textMuted, borderColor: Colors.border,
  },
  infoCard: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 14, color: Colors.textLight, flex: 1 },
  infoValue: { fontSize: 20, fontWeight: '900', color: Colors.primaryDark, letterSpacing: 3 },
  qrBox: { alignItems: 'center', gap: 8, paddingVertical: 12, backgroundColor: Colors.bg, borderRadius: Radius.md },
  qrLabel: { fontSize: 12, color: Colors.textMuted },
});
