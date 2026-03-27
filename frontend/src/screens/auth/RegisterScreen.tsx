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
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Colors, Radius } from "../../theme";
import { useAppStore } from '../../store';
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
};

// ── 通用下拉選單 ──────────────────────────────────────────────
function DropdownPicker({
  placeholder,
  value,
  options,
  onSelect,
  hasError,
}: {
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[styles.picker, hasError && styles.inputError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={DS.outline} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, item === value && styles.modalItemActive]}
                  onPress={() => { onSelect(item); setOpen(false); }}
                >
                  <Text style={[styles.modalItemText, item === value && { color: DS.primary, fontWeight: "700" }]}>
                    {item}
                  </Text>
                  {item === value && <Ionicons name="checkmark" size={16} color={DS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}

function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export default function RegisterScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const login = useAppStore((s) => s.login);
  const saveAccount = useAppStore((s) => s.saveAccount);
  const apiRegister = useAppStore((s) => s.apiRegister);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePhoneChange = (text: string) => setPhone(formatPhone(stripPhone(text)));
  const handleEmergencyPhoneChange = (text: string) => setEmergencyPhone(formatPhone(stripPhone(text)));

  const strength =
    password.length === 0 ? 0
    : password.length < 8 ? 1
    : !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password) ? 2
    : password.length < 12 ? 3 : 4;
  const strengthLabel = ["", "太短", "需含英數", "普通", "強"][strength];

  const validate = () => {
    const e: Record<string, string> = {};
    const digits = stripPhone(phone);
    if (!phone) e.phone = "請輸入手機號碼";
    else if (digits.length !== 10) e.phone = "手機號碼須為 10 位數字";
    if (!password) e.password = "請設定密碼";
    else if (password.length < 8) e.password = "密碼至少 8 個字元";
    else if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) e.password = "密碼須包含英文字母與數字";
    const emergencyDigits = stripPhone(emergencyPhone);
    if (!emergencyPhone) e.emergencyPhone = "請輸入緊急連絡人手機號碼";
    else if (emergencyDigits.length !== 10) e.emergencyPhone = "緊急連絡人手機號碼須為 10 位數字";
    if (!nickname) e.nickname = "請輸入暱稱";
    else if (nickname.length < 2) e.nickname = "暱稱至少 2 個字";
    else if (nickname.length > 12) e.nickname = "暱稱最多 12 個字";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    const yr = birthYear ? parseInt(birthYear, 10) : undefined;
    const genderMapped = gender === '男' ? 'male' : gender === '女' ? 'female' : gender === '其他' ? 'other' : undefined;
    const birthday = yr && birthMonth && birthDay ? `${yr}-${birthMonth.padStart(2,'0')}-${birthDay.padStart(2,'0')}` : undefined;
    // 對映前端 role 到後端 role
    const suggestedRole = yr ? (new Date().getFullYear() - yr <= 18 ? 'youth' : new Date().getFullYear() - yr <= 59 ? 'gatekeeper' : 'guardian') : 'gatekeeper';
    setLoading(true);
    try {
      await apiRegister({
        phone: stripPhone(phone),
        password,
        nickname,
        gender: genderMapped,
        birthday,
        role: suggestedRole as any,
        contact_phone: stripPhone(emergencyPhone),
      });
      login(nickname, stripPhone(phone), yr, gender, emergencyPhone, birthMonth, birthDay);
      saveAccount(password);
      navigation.replace("RoleSelect");
    } catch (err: any) {
      if (err?.message === 'phone already exists') {
        setErrors({ phone: '此手機號碼已被註冊' });
      } else {
        login(nickname, stripPhone(phone), yr, gender, emergencyPhone, birthMonth, birthDay);
        // API 失敗時用 phone 當 userId，讓後續 FamilyJoin 流程可繼續
        useAppStore.setState({ userId: stripPhone(phone) });
        saveAccount(password);
        navigation.replace("RoleSelect");
      }
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const daysInMonth = birthYear && birthMonth
    ? new Date(parseInt(birthYear), parseInt(birthMonth), 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0"));

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
    errors[field] && styles.inputError,
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
          {/* Branding */}
          <View style={styles.brand}>
            <ShieldHeartIcon size={36} color={DS.primary} bgColor={DS.bg} />
            <Text style={styles.brandName}>GuardCircle</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>歡迎使用守護圈</Text>
            <Text style={styles.cardSub}>保護您和家人免受詐騙侵害</Text>

            {/* 1. 手機號碼 */}
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

            {/* 2. 密碼 */}
            <Text style={styles.label}>密碼</Text>
            <View style={[styles.pwWrap, !!errors.password && styles.pwWrapError]}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }, focusedField === "password" && styles.inputFocused]}
                placeholder="至少 8 碼，包含英文與數字"
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

            {/* Strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.strengthTitle}>密碼強度</Text>
                  <Text style={[styles.strengthValue, { color: DS.primary }]}>{strengthLabel}</Text>
                </View>
                <View style={styles.strengthBars}>
                  {([
                    ["#fde8d8", "#f9c9a8"],
                    ["#f9c9a8", "#d4845a"],
                    ["#d4845a", "#a85f38"],
                    ["#a85f38", "#89502e"],
                  ] as [string, string][]).map((colors, i) =>
                    i < strength ? (
                      <LinearGradient key={i} colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.strengthBar} />
                    ) : (
                      <View key={i} style={[styles.strengthBar, { backgroundColor: DS.outlineVariant }]} />
                    )
                  )}
                </View>
              </View>
            )}

            {/* 3. 緊急連絡人手機號碼 */}
            <Text style={styles.label}>緊急連絡人手機號碼</Text>
            <TextInput
              style={inputStyle("emergencyPhone")}
              placeholder="0912-345-678"
              placeholderTextColor={DS.outlineVariant}
              value={emergencyPhone}
              onChangeText={handleEmergencyPhoneChange}
              keyboardType="phone-pad"
              maxLength={12}
              onFocus={() => setFocusedField("emergencyPhone")}
              onBlur={() => setFocusedField(null)}
            />
            {errors.emergencyPhone && <Text style={styles.fieldError}>{errors.emergencyPhone}</Text>}

            {/* 4. 暱稱 / 性別 並排 */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.label}>暱稱</Text>
                <TextInput
                  style={inputStyle("nickname")}
                  placeholder="防詐超人"
                  placeholderTextColor={DS.outlineVariant}
                  value={nickname}
                  onChangeText={setNickname}
                  maxLength={12}
                  onFocus={() => setFocusedField("nickname")}
                  onBlur={() => setFocusedField(null)}
                />
                {errors.nickname && <Text style={styles.fieldError}>{errors.nickname}</Text>}
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.label}>性別</Text>
                <DropdownPicker
                  placeholder="請選擇"
                  value={gender}
                  options={["男", "女", "其他"]}
                  onSelect={setGender}
                />
              </View>
            </View>

            {/* 5. 生日 */}
            <Text style={styles.label}>生日</Text>
            <View style={styles.birthRow}>
              <View style={{ flex: 2.5 }}>
                <DropdownPicker placeholder="年" value={birthYear} options={years} onSelect={setBirthYear} />
              </View>
              <View style={{ flex: 1.5 }}>
                <DropdownPicker placeholder="月" value={birthMonth} options={months} onSelect={setBirthMonth} />
              </View>
              <View style={{ flex: 1.5 }}>
                <DropdownPicker placeholder="日" value={birthDay} options={days} onSelect={setBirthDay} />
              </View>
            </View>

            {/* CTA */}
            <Pressable
              onPress={handleSubmit}
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
                  : <><Text style={styles.ctaText}>繼續</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>}
              </LinearGradient>
            </Pressable>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>已有帳號？</Text>
              <TouchableOpacity onPress={() => navigation.replace("Login")}>
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
  scroll: {
    flexGrow: 1, paddingHorizontal: 24, paddingVertical: 16,
    alignItems: "center", justifyContent: "flex-start", paddingTop: 28,
    paddingBottom: Platform.OS === 'web' ? 60 : 24,
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

  row: { flexDirection: "row", gap: 12 },
  rowItem: { flex: 1 },

  label: { fontSize: 15, fontWeight: "700", color: DS.onSurface, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: DS.inputBg, borderRadius: Radius.full,
    paddingHorizontal: 20, paddingVertical: 14, fontSize: 15, color: DS.onSurface,
  },
  inputFocused: { backgroundColor: DS.inputFocusBg },
  inputError: { borderWidth: 1.5, borderColor: "#ef4444" },

  pwWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  pwWrapError: { borderWidth: 1.5, borderColor: "#ef4444", borderRadius: Radius.full },
  eyeBtn: { padding: 14, backgroundColor: DS.inputBg, borderRadius: Radius.full },

  strengthWrap: { marginTop: 12, paddingHorizontal: 4 },
  strengthHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  strengthTitle: { fontSize: 10, fontWeight: "700", color: DS.outline },
  strengthValue: { fontSize: 10, fontWeight: "700" },
  strengthBars: { flexDirection: "row", gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },

  // Dropdown picker
  picker: {
    backgroundColor: DS.inputBg, borderRadius: Radius.full,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  pickerValue: { fontSize: 15, color: DS.onSurface },
  pickerPlaceholder: { fontSize: 15, color: DS.outlineVariant },

  birthRow: { flexDirection: "row", gap: 8 },

  ctaBtn: {
    borderRadius: Radius.full, paddingVertical: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    shadowColor: DS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  fieldError: { fontSize: 12, color: "#ef4444", marginTop: 4, paddingHorizontal: 4 },
  toggleRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  toggleText: { fontSize: 13, color: DS.secondary },
  toggleLink: { fontSize: 13, fontWeight: "700", color: DS.primary },

  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center", alignItems: "center",
  },
  modalSheet: {
    width: "75%", backgroundColor: DS.surface, borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: DS.onSurface, marginBottom: 12, textAlign: "center" },
  modalItem: {
    paddingVertical: 12, paddingHorizontal: 8,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 10,
  },
  modalItemActive: { backgroundColor: DS.inputBg },
  modalItemText: { fontSize: 15, color: DS.secondary },
});
