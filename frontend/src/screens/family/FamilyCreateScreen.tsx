import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Card from '../../components/Card';
import { Ionicons } from '@expo/vector-icons';

export default function FamilyCreateScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const created = name.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="建立家庭圈" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Text style={styles.label}>家庭圈名稱</Text>
        <TextInput style={styles.input} placeholder="例如：林家守護圈" value={name} onChangeText={setName} placeholderTextColor={Colors.textMuted} />

        {created && (
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="key-outline" size={18} color={Colors.primaryDark} />
              <Text style={styles.infoLabel}>家庭 ID</Text>
              <Text style={styles.infoValue}>GC-482951</Text>
            </View>
            <View style={styles.qrBox}>
              <Ionicons name="qr-code" size={80} color={Colors.textMuted} />
              <Text style={styles.qrLabel}>QR Code（Demo）</Text>
            </View>
          </Card>
        )}

        <Button title="建立家庭圈" onPress={() => Alert.alert('建立成功！', '家庭圈已建立，快邀請家人加入')} disabled={!name} size="large" style={{ marginTop: 16 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  input: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 16 },
  infoCard: { gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontSize: 14, color: Colors.textLight, flex: 1 },
  infoValue: { fontSize: 16, fontWeight: '700', color: Colors.primaryDark },
  qrBox: { alignItems: 'center', gap: 8, paddingVertical: 12, backgroundColor: Colors.bg, borderRadius: Radius.md },
  qrLabel: { fontSize: 12, color: Colors.textMuted },
});
