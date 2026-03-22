import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Radius } from "../../theme";
import { useAppStore } from "../../store";
import { RootStackParamList } from "../../navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AppHeader from "../../components/Header";

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

export default function FamilyJoinScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { joinFamily, currentUser, saveAccount, registeredAccounts } = useAppStore();
  const password = registeredAccounts.find(a => a.email === currentUser.email)?.password ?? '';
  const role = currentUser?.role;
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [familyName, setFamilyName] = useState("");
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleDigit = (val: string, idx: number) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    if (d && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const codeComplete = digits.every((d) => d !== "");

  const handleJoin = () => {
    if (!codeComplete) {
      Alert.alert("請輸入完整的 6 位數代碼");
      return;
    }
    joinFamily();
    saveAccount(password);
    navigation.replace("Main");
  };

  const handleCreate = () => {
    if (!familyName) {
      Alert.alert("請輸入家庭名稱");
      return;
    }
    joinFamily();
    saveAccount(password);
    navigation.replace("Main");
  };

  const showInvite = role === "guardian" || role === "solver";
  const showJoin = role === "gatekeeper" || role === "solver";
  const showCreate = role === "gatekeeper";

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>加入你的守護圈</Text>
        <Text style={styles.sub}>讓家人一起幫你守護安全</Text>

        {/* Card 1: Let family help — Guardian (elder-friendly) */}
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
              <Text style={styles.guardianDesc}>
                把這個邀請傳給你的家人{"\n"}他們會幫你完成設定
              </Text>
              <Pressable
                onPress={() => Alert.alert("已複製邀請連結", "請貼給家人")}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient
                  colors={[DS.primary, DS.primaryContainer]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientBtn}
                >
                  <Ionicons name="share-outline" size={26} color="#fff" />
                  <Text style={styles.guardianBtnText}>傳送給家人</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        )}

        {/* Card 1: Let family help — Solver (standard) */}
        {role === "solver" && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="heart-outline" size={26} color={DS.primary} />
              <Text style={styles.cardTitle}>讓家人幫我設定</Text>
              <View style={styles.recommendBadge}>
                <Text style={styles.recommendText}>最推薦</Text>
              </View>
            </View>
            <Text style={styles.cardDesc}>
              把這個邀請傳給你的家人，他們會幫你完成設定
            </Text>
            <Pressable
              onPress={() => Alert.alert("已複製邀請連結", "請貼給家人")}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <LinearGradient
                colors={[DS.primary, DS.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="share-outline" size={18} color="#fff" />
                <Text style={styles.solidBtnText}>傳送給家人</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Card 2: Join with code */}
        {showJoin && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="people-outline" size={26} color={DS.primary} />
              <Text style={styles.cardTitle}>加入家人的守護圈</Text>
            </View>
            <Text style={styles.cardDesc}>輸入家人提供的 6 位數代碼</Text>
            <View style={styles.digitRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => {
                    inputRefs.current[i] = r;
                  }}
                  style={[styles.digitBox, d && styles.digitBoxFilled]}
                  value={d}
                  onChangeText={(v) => handleDigit(v, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>
            <Pressable
              onPress={handleJoin}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, !codeComplete && styles.solidBtnDisabled]}
            >
              <LinearGradient
                colors={[DS.primary, DS.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.solidBtnText}>送出加入申請</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Card 3: Create new */}
        {showCreate && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="home-outline" size={26} color={DS.primary} />
              <Text style={styles.cardTitle}>建立新的守護圈</Text>
            </View>
            <Text style={styles.cardDesc}>邀請家人一起加入</Text>

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>家庭名稱</Text>
              <TextInput
                style={styles.textInput}
                placeholder="例如：陳家守護圈"
                placeholderTextColor={DS.outlineVariant}
                value={familyName}
                onChangeText={setFamilyName}
              />
            </View>

            <View style={styles.idWrap}>
              <View>
                <Text style={styles.inputLabel}>您的家庭 ID</Text>
                <Text style={styles.idValue}>GC-8899</Text>
              </View>
              <View style={styles.qrBox}>
                <Ionicons
                  name="qr-code-outline"
                  size={28}
                  color={DS.onSurface}
                />
              </View>
            </View>

            <Pressable
              onPress={handleCreate}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, !familyName && styles.solidBtnDisabled]}
            >
              <LinearGradient
                colors={[DS.primary, DS.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                <Text style={styles.solidBtnText}>分享給家人</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
        {/* 稍後再說 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={26} color={DS.primary} />
            <Text style={styles.cardTitle}>稍後再說</Text>
          </View>
          <Text style={styles.cardDesc}>先自己使用，之後再加入家庭</Text>
          <Pressable
            onPress={() => navigation.replace("Main")}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[DS.primary, DS.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBtn}
            >
              <Text style={styles.solidBtnText}>進入 App</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.bg },

  scroll: { paddingHorizontal: 20, paddingBottom: 48 },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: DS.onSurface,
    marginTop: 16,
    marginBottom: 6,
  },
  sub: { fontSize: 16, color: DS.secondary, marginBottom: 24, opacity: 0.85 },

  // Highlight card (gradient border wrapper)
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
  highlightCard: {
    backgroundColor: "#e8d5c0",
    borderRadius: 20,
    padding: 24,
  },

  // Guardian elder-friendly
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
  guardianBtn: {
    borderRadius: Radius.full,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  guardianBtnText: { color: "#fff", fontSize: 20, fontWeight: "700" },

  recommendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: "#e8d5c0",
  },
  recommendText: {
    color: DS.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  // Regular card
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

  // Digit input
  digitRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  digitBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: DS.white,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: "700",
    color: DS.primary,
    borderWidth: 1,
    borderColor: DS.outlineVariant,
    textAlign: "center",
  },
  digitBoxFilled: { borderColor: DS.primary },

  // Gradient button (matches RegisterScreen)
  gradientBtn: {
    borderRadius: Radius.full,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  solidBtnDisabled: { opacity: 0.45 },
  solidBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Input fields
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
    fontSize: 24,
    fontWeight: "900",
    color: DS.primary,
    letterSpacing: 2,
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
});