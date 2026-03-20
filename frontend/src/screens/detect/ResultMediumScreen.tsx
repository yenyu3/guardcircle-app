import React, { useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";
import { useAppStore } from "../../store";
import { DetectEvent } from "../../types";

const THEME = {
  bg: "#B89A6A",
  iconBg: "rgba(255,255,255,0.15)",
  primaryBtn: "#fff",
  primaryBtnText: "#B89A6A",
  outlineBtnBorder: "rgba(255,255,255,0.5)",
  outlineBtnText: "#fff",
  text: "#fff",
  textSub: "rgba(255,255,255,0.75)",
};

export default function ResultMediumScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResultMedium">>();
  const { scamType, riskScore, riskFactors, summary } = route.params;
  const { currentUser, addEvent } = useAppStore();
  const eventIdRef = useRef(`e_${Date.now()}`);

  function buildEvent(status: "pending" | "safe"): DetectEvent {
    return {
      id: eventIdRef.current,
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      type: "text",
      input: summary,
      riskLevel: "medium",
      riskScore,
      scamType,
      summary,
      riskFactors,
      createdAt: new Date().toLocaleString("zh-TW", { hour12: false }).slice(0, 16),
      status,
      resolvedAt: status === "safe"
        ? new Date().toLocaleString("zh-TW", { hour12: false }).slice(0, 16)
        : undefined,
    };
  }

  // 選項 A：傳送通知 → 狀態 pending，等待守門人介入
  function handleSendNotification() {
    addEvent(buildEvent("pending"));
    // TODO: 後端接口 — POST /api/events + 推播系統內通知給守門人
    Alert.alert("已傳送通知", "守門人收到通知後會盡快回覆你", [
      { text: "確定", onPress: () => navigation.navigate("Main") },
    ]);
  }

  // 選項 B：撥打 165 → 狀態直接 safe，立即寫入紀錄
  function handleCall165() {
    addEvent(buildEvent("safe"));
    // TODO: 後端接口 — POST /api/events（status: safe，resolvedBy: 'self_call165'）
    Linking.openURL("tel:165");
    navigation.navigate("Main");
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={52} color="#fff" />
          </View>

          <Text style={styles.title}>注意</Text>
          <Text style={styles.desc}>這個內容有可疑特徵，請選擇處理方式</Text>

          {/* 選項 A */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSendNotification} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>📨 傳送通知給守門人</Text>
          </TouchableOpacity>
          <Text style={styles.optionHint}>守門人會收到通知並協助確認</Text>

          {/* 選項 B */}
          <TouchableOpacity style={styles.outlineBtn} onPress={handleCall165} activeOpacity={0.85}>
            <Text style={styles.outlineBtnText}>📞 撥打 165 反詐騙專線</Text>
          </TouchableOpacity>
          <Text style={[styles.optionHint, { color: "rgba(255,255,255,0.5)" }]}>
            自行確認後事件將直接記錄為安全
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  safe: { flex: 1 },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: THEME.iconBg, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", marginBottom: 28,
  },
  title: { fontSize: 40, fontWeight: "900", color: THEME.text, letterSpacing: -0.5, textAlign: "center", marginBottom: 10 },
  desc: { fontSize: 16, fontWeight: "500", color: THEME.textSub, textAlign: "center", lineHeight: 24, marginBottom: 32 },
  primaryBtn: {
    backgroundColor: THEME.primaryBtn, borderRadius: 999, paddingVertical: 18,
    alignItems: "center", alignSelf: "stretch", marginBottom: 6,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  primaryBtnText: { fontSize: 17, fontWeight: "800", color: THEME.primaryBtnText },
  outlineBtn: {
    borderWidth: 2, borderColor: THEME.outlineBtnBorder, borderRadius: 999,
    paddingVertical: 18, alignItems: "center", alignSelf: "stretch", marginTop: 16, marginBottom: 6,
  },
  outlineBtnText: { fontSize: 17, fontWeight: "700", color: THEME.outlineBtnText },
  optionHint: { fontSize: 12, color: "rgba(255,255,255,0.65)", textAlign: "center" },
});
