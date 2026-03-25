import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Radius } from "../../theme";
import { useAppStore } from "../../store";
import { RootStackParamList } from "../../navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ShieldHeartIcon from "../../components/ShieldHeartIcon";

const DS = {
  bg: "#fff8f1",
  surface: "#fcf2e3",
  inputBg: "#f1e7d8",
  inputFocusBg: "#ffffff",
  primary: "#89502e",
  primaryContainer: "#ffb38a",
  secondary: "#6e5b45",
  onSurface: "#1f1b12",
  outline: "#85736b",
  outlineVariant: "#d7c2b9",
  error: "#ef4444",
};

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export default function LoginScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const directLogin = useAppStore((s) => s.directLogin);
  const apiLogin = useAppStore((s) => s.apiLogin);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string; password?: string; general?: string }>({});

  const handlePhoneChange = (text: string) => {
    const digits = stripPhone(text);
    setPhone(formatPhone(digits));
  };

  const validate = () => {
    const e: typeof errors = {};
    const digits = stripPhone(phone);
    if (!phone) e.phone = "請輸入手機號碼";
    else if (digits.length !== 10) e.phone = "手機號碼須為 10 位數字";
    if (!password) e.password = "請輸入密碼";
    return e;
  };

  const handleLogin = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    const rawPhone = stripPhone(phone);
    try {
      await apiLogin(rawPhone, password);
      navigation.replace("Main");
    } catch (err: any) {
      // fallback: 嘗試本地帳號（開發用），本地存的 email 可能是格式化或純數字，兩種都試
      const success = directLogin(rawPhone, password) || directLogin(phone, password);
      if (success) { navigation.replace("Main"); return; }
      setErrors({ general: err?.message === 'Invalid credentials' ? "手機號碼或密碼錯誤" : "登入失敗，請稍後再試" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
    errors[field as keyof typeof errors] && styles.inputError,
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <ShieldHeartIcon size={36} color={DS.primary} bgColor={DS.bg} />
            <Text style={styles.brandName}>GuardCircle</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>歡迎回來</Text>
            <Text style={styles.cardSub}>登入你的守護圈帳號</Text>

            {/* Phone */}
            <Text style={styles.label}>手機號碼</Text>
            <TextInput
              style={inputStyle("phone")}
              placeholder="0912-345-678"
              placeholderTextColor={DS.outlineVariant}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              maxLength={12}
              onFocus={() => setFocusedField("phone")}
              onBlur={() => setFocusedField(null)}
            />
            {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}

            {/* Password */}
            <Text style={styles.label}>密碼</Text>
            <View style={[styles.pwWrap, errors.password ? styles.pwWrapError : null]}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }, focusedField === "password" && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor={DS.outlineVariant}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color={DS.outline} />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}

            {errors.general && <Text style={styles.generalError}>{errors.general}</Text>}

            <Pressable
              onPress={handleLogin}
              style={({ pressed }) => [{ marginTop: 24, opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[DS.primary, DS.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaBtn}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <><Text style={styles.ctaText}>登入</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>}
              </LinearGradient>
            </Pressable>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>還沒有帳號？</Text>
              <TouchableOpacity onPress={() => navigation.replace("Register")}>
                <Text style={styles.toggleLink}>立即註冊</Text>
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
  scroll: {
    flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16,
    alignItems: "center", justifyContent: "flex-start", paddingTop: 28,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  brandName: { fontSize: 24, fontWeight: "800", color: DS.primary, letterSpacing: -0.5 },
  card: {
    width: "100%", backgroundColor: DS.surface, borderRadius: 28, padding: 28,
    shadowColor: "#1f1b12", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06, shadowRadius: 24, elevation: 4,
  },
  cardTitle: {
    fontSize: 26, fontWeight: "800", color: DS.onSurface,
    textAlign: "center", letterSpacing: -0.5, marginBottom: 8,
  },
  cardSub: { fontSize: 15, color: DS.secondary, textAlign: "center", marginBottom: 16, lineHeight: 22 },
  label: { fontSize: 15, fontWeight: "700", color: DS.onSurface, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: DS.inputBg, borderRadius: Radius.full,
    paddingHorizontal: 20, paddingVertical: 14, fontSize: 15, color: DS.onSurface,
  },
  inputFocused: { backgroundColor: DS.inputFocusBg },
  inputError: { borderWidth: 1.5, borderColor: DS.error },
  pwWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  pwWrapError: { borderWidth: 1.5, borderColor: DS.error, borderRadius: Radius.full },
  eyeBtn: { padding: 14, backgroundColor: DS.inputBg, borderRadius: Radius.full },
  fieldError: { fontSize: 12, color: DS.error, marginTop: 4, paddingHorizontal: 4 },
  generalError: { fontSize: 13, color: DS.error, marginTop: 12, textAlign: "center" },
  ctaBtn: {
    borderRadius: Radius.full, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  toggleRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  toggleText: { fontSize: 13, color: DS.secondary },
  toggleLink: { fontSize: 13, fontWeight: "700", color: DS.primary },
});
