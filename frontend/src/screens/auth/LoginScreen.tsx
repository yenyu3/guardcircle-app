import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Radius, Spacing } from '../../theme';
import { useAppStore } from '../../store';
import { RootStackParamList } from '../../navigation';
import Button from '../../components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const login = useAppStore((s) => s.login);
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', '弱', '中', '強'][strength];
  const strengthColor = [Colors.border, Colors.danger, Colors.warning, Colors.safe][strength];

  const handleSubmit = () => {
    if (!nickname || !email || !password) return;
    login(nickname, email);
    navigation.replace('RoleSelect');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={36} color={Colors.primaryDark} />
            </View>
            <Text style={styles.title}>建立帳號</Text>
            <Text style={styles.sub}>加入守護圈，保護你的家人</Text>
          </View>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed" size={14} color={Colors.textLight} />
            <Text style={styles.privacyText}>我們不收集真實姓名，保護您的隱私</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>暱稱</Text>
            <TextInput style={styles.input} placeholder="例如：阿嬤、小明" value={nickname} onChangeText={setNickname} placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>Email 或手機號碼</Text>
            <TextInput style={styles.input} placeholder="example@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={Colors.textMuted} />

            <Text style={styles.label}>密碼</Text>
            <View style={styles.pwRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="至少 8 個字元"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPw}
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[styles.strengthBar, { backgroundColor: i <= strength ? strengthColor : Colors.border }]} />
                ))}
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>密碼強度：{strengthLabel}</Text>
              </View>
            )}

            <Button title="開始使用守護圈" onPress={handleSubmit} size="large" style={{ marginTop: 24 }} disabled={!nickname || !email || password.length < 6} />
            <Button title="我已有帳號，直接登入" onPress={handleSubmit} variant="ghost" style={{ marginTop: 12 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24, gap: 8 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  sub: { fontSize: 15, color: Colors.textLight },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.safeBg, borderRadius: Radius.md, padding: 10, marginBottom: 24 },
  privacyText: { fontSize: 13, color: Colors.textLight, flex: 1 },
  form: { gap: 4 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border, marginBottom: 4 },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 14, backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', minWidth: 70 },
});
