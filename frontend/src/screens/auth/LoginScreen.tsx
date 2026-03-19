import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Radius } from '../../theme';
import { useAppStore } from '../../store';
import { RootStackParamList } from '../../navigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ShieldHeartIcon from '../../components/ShieldHeartIcon';

// Design-system colours (matching HTML reference)
const DS = {
  bg: '#fff8f1',
  surface: '#fcf2e3',
  inputBg: '#f1e7d8',
  inputFocusBg: '#ffffff',
  primary: '#89502e',
  primaryContainer: '#ffb38a',
  secondary: '#6e5b45',
  onSurface: '#1f1b12',
  outline: '#85736b',
  outlineVariant: '#d7c2b9',
  tertiary: '#146870',
  tertiaryContainer: '#88d0d8',
};

export default function LoginScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthLabel = ['', '弱', '中', '強'][strength];

  const handleSubmit = () => {
    if (!nickname || !email || !password) return;
    login(nickname, email);
    navigation.replace('RoleSelect');
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Branding */}
          <View style={styles.brand}>
            <ShieldHeartIcon size={36} color={DS.primary} bgColor={DS.bg} />
            <Text style={styles.brandName}>GuardCircle</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>歡迎使用守護圈</Text>
            <Text style={styles.cardSub}>保護您和家人免受詐騙侵害</Text>

            {/* Email */}
            <Text style={styles.label}>Email 或手機號碼</Text>
            <TextInput
              style={inputStyle('email')}
              placeholder="hello@example.com"
              placeholderTextColor={DS.outlineVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />

            {/* Nickname */}
            <Text style={styles.label}>暱稱</Text>
            <TextInput
              style={inputStyle('nickname')}
              placeholder="守護者 123"
              placeholderTextColor={DS.outlineVariant}
              value={nickname}
              onChangeText={setNickname}
              onFocus={() => setFocusedField('nickname')}
              onBlur={() => setFocusedField(null)}
            />
            <Text style={styles.hint}>我們不收集您的真實姓名，以保護您的隱私</Text>

            {/* Password */}
            <Text style={styles.label}>密碼</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[inputStyle('password'), { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={DS.outlineVariant}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off' : 'eye'} size={18} color={DS.outline} />
              </TouchableOpacity>
            </View>

            {/* Strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.strengthTitle}>密碼強度</Text>
                  <Text style={[styles.strengthValue, { color: DS.primary }]}>{strengthLabel}</Text>
                </View>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[styles.strengthBar, { backgroundColor: i <= strength ? DS.primary : DS.outlineVariant }]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* CTA */}
            <Pressable onPress={handleSubmit} style={({ pressed }) => [{ marginTop: 28, opacity: pressed ? 0.85 : 1 }]}>
              <LinearGradient
                colors={[DS.primary, DS.primaryContainer]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaText}>繼續</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>已有帳號？</Text>
              <TouchableOpacity onPress={handleSubmit}>
                <Text style={styles.toggleLink}>直接登入</Text>
              </TouchableOpacity>
            </View>
          </View>



        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', justifyContent: 'center' },

  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  brandName: { fontSize: 24, fontWeight: '800', color: DS.primary, letterSpacing: -0.5 },

  card: {
    width: '100%', backgroundColor: DS.surface,
    borderRadius: 28, padding: 28,
    shadowColor: '#1f1b12', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
  },
  cardTitle: { fontSize: 26, fontWeight: '800', color: DS.onSurface, textAlign: 'center', letterSpacing: -0.5, marginBottom: 8 },
  cardSub: { fontSize: 15, color: DS.secondary, textAlign: 'center', marginBottom: 28, lineHeight: 22 },

  label: { fontSize: 13, fontWeight: '700', color: DS.onSurface, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: DS.inputBg, borderRadius: Radius.full,
    paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 15, color: DS.onSurface,
  },
  inputFocused: { backgroundColor: DS.inputFocusBg },
  hint: { fontSize: 11, color: DS.secondary, fontStyle: 'italic', marginTop: 6, paddingHorizontal: 4, opacity: 0.7 },

  pwWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 16, backgroundColor: DS.inputBg, borderRadius: Radius.full },

  strengthWrap: { marginTop: 12, paddingHorizontal: 4 },
  strengthHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  strengthTitle: { fontSize: 10, fontWeight: '700', color: DS.outline },
  strengthValue: { fontSize: 10, fontWeight: '700' },
  strengthBars: { flexDirection: 'row', gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },

  ctaBtn: {
    borderRadius: Radius.full, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  toggleText: { fontSize: 13, color: DS.secondary },
  toggleLink: { fontSize: 13, fontWeight: '700', color: DS.primary },

  footer: { flexDirection: 'row', gap: 24, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center' },
  footerLink: { fontSize: 11, fontWeight: '600', color: DS.outline },
});
