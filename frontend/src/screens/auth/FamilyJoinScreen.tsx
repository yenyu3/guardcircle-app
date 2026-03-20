import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/Header";
import { RootStackParamList } from "../../navigation";
import { useAppStore } from "../../store";
import { Radius } from "../../theme";

const DS = {
  bg: "#fff8f1",
  surface: "#fcf2e3",
  cardBg: "#f1e7d8",
  white: "#ffffff",
  primary: "#89502e",
  primaryContainer: "#ffb38a",
  secondary: "#6e5b45",
  onSurface: "#1f1b12",
  outline: "#85736b",
  outlineVariant: "#d7c2b9",
};

function genFamilyId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export default function FamilyJoinScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { joinFamily, currentUser, generatePairingCode } = useAppStore();
  const role = currentUser?.role;

  // 守護者：配對碼
  const [pairingCode, setPairingCode] = useState("");

  // 守門人：加入守護圈（6位 Circle ID）
  const [joinDigits, setJoinDigits] = useState(["", "", "", "", "", ""]);
  const joinRefs = useRef<(TextInput | null)[]>([]);

  // 守門人：建立守護圈（兩階段）
  const [familyName, setFamilyName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const familyId = useMemo(() => genFamilyId(), []);

  const handleJoinDigit = (val: string, idx: number) => {
    const ch = val
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-1)
      .toUpperCase();
    const next = [...joinDigits];
    next[idx] = ch;
    setJoinDigits(next);
    if (ch && idx < 5) joinRefs.current[idx + 1]?.focus();
  };

  const handleJoinKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !joinDigits[idx] && idx > 0) {
      joinRefs.current[idx - 1]?.focus();
    }
  };

  const joinComplete = joinDigits.every((d) => d !== "");

  const handleJoin = () => {
    if (!joinComplete) {
      Alert.alert("請輸入完整的 6 位代碼");
      return;
    }
    joinFamily();
    navigation.replace("Main");
  };

  const handleConfirm = () => {
    if (!familyName) {
      Alert.alert("請輸入家庭名稱");
      return;
    }
    setConfirmed(true);
  };

  const handleCreate = () => {
    joinFamily();
    Share.share({ message: `加入我的守護圈！家庭 ID：${familyId}` });
  };

  const handleGeneratePairingCode = () => {
    const code = generatePairingCode();
    setPairingCode(code);
  };

  const handleCopyPairingCode = async () => {
    await Clipboard.setStringAsync(pairingCode);
    Alert.alert("已複製", "配對碼已複製到剪貼簿");
  };

  const handleSharePairingCode = () => {
    Share.share({ message: `我的 GuardCircle 配對碼：${pairingCode}（10 分鐘內有效）` });
  };

  const handleSkip = () => navigation.replace("Main");

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>加入你的守護圈</Text>
          <Text style={styles.sub}>讓家人一起幫你守護安全</Text>

          {/* 守護者：產生配對碼 */}
          {role === "guardian" && (
            <LinearGradient
              colors={[DS.primary, DS.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.highlightBorder}
            >
              <View style={styles.highlightCard}>
                <View style={styles.guardianIconWrap}>
                  <Ionicons name="heart" size={56} color={DS.primary} />
                </View>
                <Text style={styles.guardianTitle}>讓家人幫我設定</Text>
                {!pairingCode && (
                  <Text style={styles.guardianDesc}>
                    產生配對碼後，把號碼告訴你的家人{"\n"}他們會幫你完成設定
                  </Text>
                )}
                {pairingCode ? (
                  <>
                    <Text
                      style={styles.pairingCodeText}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {pairingCode}
                    </Text>
                    <Text style={styles.pairingExpiry}>10 分鐘內有效</Text>
                    <View style={styles.pairingActions}>
                      <Pressable
                        onPress={handleCopyPairingCode}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}
                      >
                        <View style={styles.pairingActionBtn}>
                          <Ionicons name="copy-outline" size={22} color="#fff" />
                          <Text style={styles.pairingActionText}>複製</Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={handleSharePairingCode}
                        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, flex: 1 }]}
                      >
                        <View style={styles.pairingActionBtn}>
                          <Ionicons name="share-outline" size={22} color="#fff" />
                          <Text style={styles.pairingActionText}>分享</Text>
                        </View>
                      </Pressable>
                    </View>
                    <Pressable
                      onPress={handleGeneratePairingCode}
                      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, alignSelf: 'center' }]}
                    >
                      <Text style={styles.regenerateText}>重新產生</Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={handleGeneratePairingCode}
                    style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                  >
                    <View style={styles.guardianBtn}>
                      <Ionicons name="key-outline" size={26} color="#fff" />
                      <Text style={styles.guardianBtnText}>產生配對碼</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            </LinearGradient>
          )}

          {/* 守門人 / solver：加入現有守護圈 */}
          {(role === "gatekeeper" || role === "solver") && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="people-outline" size={26} color={DS.primary} />
                <Text style={styles.cardTitle}>加入家人的守護圈</Text>
              </View>
              <Text style={styles.cardDesc}>
                輸入家人提供的 6 位 Circle ID（數字或英文）
              </Text>
              <View style={styles.digitRow}>
                {joinDigits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(r) => { joinRefs.current[i] = r; }}
                    style={[styles.digitBox, d && styles.digitBoxFilled]}
                    value={d}
                    onChangeText={(v) => handleJoinDigit(v, i)}
                    onKeyPress={(e) => handleJoinKeyPress(e, i)}
                    autoCapitalize="characters"
                    maxLength={1}
                    textAlign="center"
                  />
                ))}
              </View>
              <Pressable
                onPress={handleJoin}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[styles.solidBtn, !joinComplete && styles.solidBtnDisabled]}>
                  <Text style={styles.solidBtnText}>送出加入申請</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* 守門人：建立新守護圈 */}
          {role === "gatekeeper" && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="home-outline" size={26} color={DS.primary} />
                <Text style={styles.cardTitle}>建立新的守護圈</Text>
              </View>
              <Text style={styles.cardDesc}>邀請家人一起加入</Text>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>家庭名稱</Text>
                <TextInput
                  style={[styles.textInput, confirmed && styles.inputLocked]}
                  placeholder="例如：陳家守護圈"
                  placeholderTextColor={DS.outlineVariant}
                  value={familyName}
                  onChangeText={confirmed ? undefined : setFamilyName}
                  editable={!confirmed}
                />
              </View>

              {confirmed && (
                <View style={styles.idWrap}>
                  <View>
                    <Text style={styles.inputLabel}>你的 Circle ID</Text>
                    <Text style={styles.idValue}>{familyId}</Text>
                  </View>
                  <View style={styles.qrBox}>
                    <Ionicons name="qr-code-outline" size={28} color={DS.onSurface} />
                  </View>
                </View>
              )}

              {!confirmed ? (
                <Pressable
                  onPress={handleConfirm}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={[styles.solidBtn, !familyName && styles.solidBtnDisabled]}>
                    <Text style={styles.solidBtnText}>確認建立</Text>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  onPress={handleCreate}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View style={styles.solidBtn}>
                    <Ionicons name="share-outline" size={18} color="#fff" />
                    <Text style={styles.solidBtnText}>分享給家人</Text>
                  </View>
                </Pressable>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>稍後再設定，先進入 App</Text>
            <Ionicons name="chevron-forward" size={14} color={DS.outline} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: DS.onSurface,
    marginTop: 16,
    marginBottom: 6,
  },
  sub: { fontSize: 16, color: DS.secondary, marginBottom: 24, opacity: 0.85 },
  highlightBorder: {
    borderRadius: 22,
    padding: 2,
    marginBottom: 16,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  highlightCard: { backgroundColor: "#e8d5c0", borderRadius: 20, padding: 24 },
  guardianIconWrap: { alignItems: "center", marginBottom: 16 },
  guardianTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: DS.primary,
    textAlign: "center",
    marginBottom: 12,
  },
  guardianDesc: {
    fontSize: 20,
    color: DS.secondary,
    textAlign: "center",
    lineHeight: 32,
    marginBottom: 28,
  },
  pairingCodeText: {
    fontSize: 60,
    fontWeight: "900",
    color: DS.primary,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 4,
  },
  pairingExpiry: {
    fontSize: 13,
    color: DS.secondary,
    textAlign: "center",
    marginBottom: 20,
  },
  pairingActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  pairingActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DS.primary,
    paddingVertical: 14,
    borderRadius: Radius.full,
  },
  pairingActionText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  regenerateText: {
    fontSize: 13,
    color: DS.secondary,
    fontWeight: "600",
    textDecorationLine: "underline",
    paddingVertical: 4,
    marginBottom: 8,
  },
  guardianBtn: {
    backgroundColor: DS.primary,
    borderRadius: Radius.full,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  guardianBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  card: {
    backgroundColor: DS.cardBg,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#1f1b12",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: "800", color: DS.onSurface },
  cardDesc: { fontSize: 14, color: DS.secondary, marginBottom: 18 },
  digitRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  digitBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: DS.white,
    borderRadius: 12,
    fontSize: 22,
    fontWeight: "700",
    color: DS.primary,
    borderWidth: 1,
    borderColor: DS.outlineVariant,
    textAlign: "center",
  },
  digitBoxFilled: { borderColor: DS.primary },
  solidBtn: {
    backgroundColor: DS.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  solidBtnDisabled: { opacity: 0.45 },
  solidBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  inputWrap: {
    backgroundColor: DS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: DS.outlineVariant + "55",
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: DS.secondary,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  textInput: { fontSize: 16, color: DS.onSurface, padding: 0 },
  inputLocked: { color: DS.secondary },
  idWrap: {
    backgroundColor: DS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: DS.outlineVariant,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  idValue: {
    fontSize: 26,
    fontWeight: "900",
    color: DS.primary,
    letterSpacing: 4,
  },
  qrBox: {
    backgroundColor: DS.white,
    padding: 10,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  skipText: { fontSize: 14, color: DS.outline, fontWeight: "600" },
});
