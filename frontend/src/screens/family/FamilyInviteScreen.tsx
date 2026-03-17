import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import Button from '../../components/Button';
import Header from '../../components/Header';
import Card from '../../components/Card';

export default function FamilyInviteScreen() {
  const navigation = useNavigation();
  const inviteMsg = '我邀請你加入守護圈「林家守護圈」，請下載 GuardCircle App 後輸入邀請碼：482951';

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="邀請家人" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Card style={styles.codeCard}>
          <Text style={styles.codeLabel}>邀請碼</Text>
          <Text style={styles.code}>482951</Text>
          <Text style={styles.codeHint}>請將此邀請碼傳給家人</Text>
        </Card>

        <Card style={styles.msgCard}>
          <Text style={styles.msgLabel}>可分享的邀請訊息</Text>
          <Text style={styles.msgText}>{inviteMsg}</Text>
        </Card>

        <View style={styles.actions}>
          <Button title="複製邀請碼" onPress={() => Alert.alert('已複製', '482951')} variant="secondary" />
          <Button title="分享邀請訊息" onPress={() => Alert.alert('分享（Demo）', inviteMsg)} />
        </View>

        <View style={styles.qrBox}>
          <Ionicons name="qr-code" size={100} color={Colors.textMuted} />
          <Text style={styles.qrLabel}>掃描 QR Code 加入（Demo）</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, gap: 16 },
  codeCard: { alignItems: 'center', gap: 6, paddingVertical: 24 },
  codeLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  code: { fontSize: 40, fontWeight: '900', color: Colors.primaryDark, letterSpacing: 8 },
  codeHint: { fontSize: 13, color: Colors.textLight },
  msgCard: {},
  msgLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, marginBottom: 8 },
  msgText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  actions: { gap: 10 },
  qrBox: { alignItems: 'center', gap: 8, paddingVertical: 20, backgroundColor: Colors.white, borderRadius: Radius.lg },
  qrLabel: { fontSize: 13, color: Colors.textMuted },
});
