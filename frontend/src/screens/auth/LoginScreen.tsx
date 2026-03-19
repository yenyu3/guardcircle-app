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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Colors, Radius } from "../../theme";
import { useAppStore } from "../../store";
import { RootStackParamList } from "../../navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ShieldHeartIcon from "../../components/ShieldHeartIcon";

// Design-system colours (matching HTML reference)
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
  tertiary: "#146870",
  tertiaryContainer: "#88d0d8",
};

// ── BirthPicker ──────────────────────────────────────────────
function BirthPicker({
  placeholder,
  value,
  options,
  onSelect,
  flex,
}: {
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
  flex: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[styles.birthPicker, { flex }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.birthValue : styles.birthPlaceholder}>
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
                  style={[
                    styles.modalItem,
                    item === value && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      item === value && {
                        color: DS.primary,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {item}
                  </Text>
                  {item === value && (
                    <Ionicons name="checkmark" size={16} color={DS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export default function LoginScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const login = useAppStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [gender, setGender] = useState("");

  const strength =
    password.length === 0
      ? 0
      : password.length < 6
        ? 1
        : password.length < 10
          ? 2
          : 3;
  const strengthLabel = ["", "弱", "中", "強"][strength];

  const handleSubmit = () => {
    if (!nickname || !email || !password) return;
    const yr = birthYear ? parseInt(birthYear, 10) : undefined;
    login(nickname, email, yr, gender);
    navigation.replace("RoleSelect");
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );
  const daysInMonth =
    birthYear && birthMonth
      ? new Date(parseInt(birthYear), parseInt(birthMonth), 0).getDate()
      : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) =>
    String(i + 1).padStart(2, "0"),
  );

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
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

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>歡迎使用守護圈</Text>
            <Text style={styles.cardSub}>保護您和家人免受詐騙侵害</Text>

            {/* Phone */}
            <Text style={styles.label}>手機號碼</Text>
            <TextInput
              style={inputStyle("email")}
              placeholder="0912-345-678"
              placeholderTextColor={DS.outlineVariant}
              value={email}
              onChangeText={setEmail}
              keyboardType="phone-pad"
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />

            {/* Nickname */}
            <Text style={styles.label}>暱稱</Text>
            <TextInput
              style={inputStyle("nickname")}
              placeholder="防詐超人"
              placeholderTextColor={DS.outlineVariant}
              value={nickname}
              onChangeText={setNickname}
              onFocus={() => setFocusedField("nickname")}
              onBlur={() => setFocusedField(null)}
            />

            {/* Birth date */}
            <Text style={styles.label}>生日</Text>
            <View style={styles.birthRow}>
              <BirthPicker
                placeholder="年"
                value={birthYear}
                options={years}
                onSelect={setBirthYear}
                flex={2}
              />
              <BirthPicker
                placeholder="月"
                value={birthMonth}
                options={months}
                onSelect={setBirthMonth}
                flex={1}
              />
              <BirthPicker
                placeholder="日"
                value={birthDay}
                options={days}
                onSelect={setBirthDay}
                flex={1}
              />
            </View>

            {/* Gender */}
            <Text style={styles.label}>性別</Text>
            <View style={styles.birthRow}>
              {["男", "女", "其他"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.genderBtn,
                    gender === g && styles.genderBtnActive,
                  ]}
                  onPress={() => setGender(g)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.genderText,
                      gender === g && styles.genderTextActive,
                    ]}
                  >
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Password */}
            <Text style={styles.label}>密碼</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[inputStyle("password"), { flex: 1 }]}
                placeholder="••••••••"
                placeholderTextColor={DS.outlineVariant}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPw ? "eye-off" : "eye"}
                  size={18}
                  color={DS.outline}
                />
              </TouchableOpacity>
            </View>

            {/* Strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthHeader}>
                  <Text style={styles.strengthTitle}>密碼強度</Text>
                  <Text style={[styles.strengthValue, { color: DS.primary }]}>
                    {strengthLabel}
                  </Text>
                </View>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        {
                          backgroundColor:
                            i <= strength ? DS.primary : DS.outlineVariant,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* CTA */}
            <Pressable
              onPress={handleSubmit}
              style={({ pressed }) => [
                { marginTop: 24, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <LinearGradient
                colors={[DS.primary, DS.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaBtn}
              >
                <Text style={styles.ctaText}>繼續</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </LinearGradient>
            </Pressable>

            {/* Toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>已有帳號？</Text>
              <TouchableOpacity
                onPress={() => navigation.replace("RoleSelect")}
              >
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 28,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  brandName: {
    fontSize: 24,
    fontWeight: "800",
    color: DS.primary,
    letterSpacing: -0.5,
  },

  card: {
    width: "100%",
    backgroundColor: DS.surface,
    borderRadius: 28,
    padding: 28,
    shadowColor: "#1f1b12",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: DS.onSurface,
    textAlign: "center",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  cardSub: {
    fontSize: 15,
    color: DS.secondary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: DS.onSurface,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: DS.inputBg,
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 15,
    color: DS.onSurface,
  },
  inputFocused: { backgroundColor: DS.inputFocusBg },
  hint: {
    fontSize: 11,
    color: DS.secondary,
    fontStyle: "italic",
    marginTop: 6,
    paddingHorizontal: 4,
    opacity: 0.7,
  },

  pwWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  eyeBtn: {
    padding: 14,
    backgroundColor: DS.inputBg,
    borderRadius: Radius.full,
  },

  strengthWrap: { marginTop: 12, paddingHorizontal: 4 },
  strengthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  strengthTitle: { fontSize: 10, fontWeight: "700", color: DS.outline },
  strengthValue: { fontSize: 10, fontWeight: "700" },
  strengthBars: { flexDirection: "row", gap: 6 },
  strengthBar: { flex: 1, height: 6, borderRadius: 3 },

  ctaBtn: {
    borderRadius: Radius.full,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  toggleRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  toggleText: { fontSize: 13, color: DS.secondary },
  toggleLink: { fontSize: 13, fontWeight: "700", color: DS.primary },

  optional: { fontSize: 11, fontWeight: "400", color: DS.outline },
  birthRow: { flexDirection: "row", gap: 8 },
  genderBtn: {
    flex: 1,
    backgroundColor: DS.inputBg,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: "center",
  },
  genderBtnActive: { backgroundColor: DS.primary },
  genderText: { fontSize: 15, color: DS.outline, fontWeight: "600" },
  genderTextActive: { color: "#fff" },
  birthPicker: {
    backgroundColor: DS.inputBg,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  birthValue: { fontSize: 15, color: DS.onSurface },
  birthPlaceholder: { fontSize: 15, color: DS.outlineVariant },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalSheet: {
    width: "75%",
    backgroundColor: DS.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: DS.onSurface,
    marginBottom: 12,
    textAlign: "center",
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 10,
  },
  modalItemActive: { backgroundColor: DS.inputBg },
  modalItemText: { fontSize: 15, color: DS.secondary },

  footer: {
    flexDirection: "row",
    gap: 24,
    marginTop: 32,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerLink: { fontSize: 11, fontWeight: "600", color: DS.outline },
});
