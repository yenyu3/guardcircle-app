import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Radius, Shadow } from '../../theme';
import { useAppStore } from '../../store';
import { RootStackParamList } from '../../navigation';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function FamilyJoinScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { joinFamily, currentUser } = useAppStore();
  const [code, setCode] = useState('');
  const [familyName, setFamilyName] = useState('');
  const isGuardian = currentUser.role === 'guardian';

  const handleJoin = () => {
    if (code.length !== 6) { Alert.alert('請輸入 6 位數邀請碼'); return; }
    joinFamily();
    navigation.replace('Main');
  };
  const handleCreate = () => {
    if (!familyName) { Alert.alert('請輸入家庭圈名稱'); return; }
    joinFamily();
    navigation.replace('Main');
  };
  const handleSkip = () => navigation.replace('Main');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>加入或建立家庭圈</Text>
        <Text style={styles.sub}>和家人一起守護彼此的安全</Text>

        {/* A: Join */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="enter-outline" size={22} color={Colors.primaryDark} />
            <Text style={styles.sectionTitle}>加入現有家庭圈</Text>
          </View>
          <Text style={styles.hint}>請輸入家人給你的 6 位數邀請碼</Text>
          <TextInput
            style={[styles.codeInput, isGuardian && styles.codeInputLarge]}
            placeholder="例如：482951"
            value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad" maxLength={6}
            placeholderTextColor={Colors.textMuted}
          />
          {code.length === 6 && (
            <View style={styles.preview}>
              <Ionicons name="people" size={16} color={Colors.safe} />
              <Text style={styles.previewText}>找到家庭圈：林家守護圈</Text>
            </View>
          )}
          <Button title="送出加入申請" onPress={handleJoin} style={{ marginTop: 12 }} disabled={code.length !== 6} />
        </Card>

        {/* B: Create */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="add-circle-outline" size={22} color={Colors.primaryDark} />
            <Text style={styles.sectionTitle}>建立新家庭圈</Text>
          </View>
          <TextInput
            style={[styles.input, isGuardian && styles.inputLarge]}
            placeholder="家庭圈名稱，例如：林家守護圈"
            value={familyName} onChangeText={setFamilyName}
            placeholderTextColor={Colors.textMuted}
          />
          {familyName.length > 0 && (
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>家庭 ID：</Text>
              <Text style={styles.idValue}>GC-482951</Text>
            </View>
          )}
          <Button title="建立並邀請家人" onPress={handleCreate} style={{ marginTop: 12 }} disabled={!familyName} />
        </Card>

        {/* C: Guardian helper */}
        {isGuardian && (
          <Card style={[styles.section, { backgroundColor: Colors.safeBg }] as any}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart-outline" size={22} color={Colors.safe} />
              <Text style={[styles.sectionTitle, { color: Colors.safe }]}>讓家人幫我加入</Text>
            </View>
            <Text style={styles.hint}>不確定怎麼操作？可以請家人幫你設定</Text>
            <Button title="傳訊息給家人" onPress={() => Alert.alert('已複製邀請訊息', '請貼給家人')} variant="secondary" style={{ marginTop: 12 }} />
          </Card>
        )}

        {/* D: Skip */}
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>稍後再說，先進入 App</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.textLight, marginBottom: 24 },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  hint: { fontSize: 13, color: Colors.textLight, marginBottom: 10 },
  codeInput: { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 14, fontSize: 22, fontWeight: '700', color: Colors.text, borderWidth: 1.5, borderColor: Colors.border, textAlign: 'center', letterSpacing: 8 },
  codeInputLarge: { fontSize: 28, padding: 18 },
  input: { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 14, fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  inputLarge: { fontSize: 18, padding: 18 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  previewText: { fontSize: 14, color: Colors.safe, fontWeight: '600' },
  idRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  idLabel: { fontSize: 13, color: Colors.textLight },
  idValue: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  skipBtn: { alignItems: 'center', padding: 16 },
  skipText: { fontSize: 14, color: Colors.textMuted, textDecorationLine: 'underline' },
});
