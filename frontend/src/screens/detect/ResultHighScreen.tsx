import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";
import { useAppStore } from "../../store";
import { DetectEvent } from "../../types";

const THEME = {
  bg: "#D4806E",
  iconBg: "rgba(255,255,255,0.15)",
  primaryBtn: "#fff",
  primaryBtnText: "#D4806E",
  outlineBtnBorder: "rgba(255,255,255,0.5)",
  outlineBtnText: "#fff",
  text: "#fff",
  textSub: "rgba(255,255,255,0.75)",
};

export default function ResultHighScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResultHigh">>();
  const { scamType, riskScore, riskFactors, summary, readonly, originalInput, imageUri } = route.params;
  const { currentUser, addEvent, setMemberStatus } = useAppStore();
  const eventIdRef = useRef(`e_${Date.now()}`);

  useEffect(() => {
    if (readonly) return;
    const newEvent: DetectEvent = {
      id: eventIdRef.current,
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      type: "text",
      input: originalInput ?? summary,
      imageUri,
      riskLevel: "high",
      riskScore,
      scamType,
      summary,
      riskFactors,
      createdAt: new Date().toLocaleString("zh-TW", { hour12: false }).slice(0, 15),
      status: "high_risk",
    };
    addEvent(newEvent);
    // 同步更新家庭圈成員狀態 → high_risk
    setMemberStatus(currentUser.id, "high_risk");
    // TODO: 後端接口 — POST /api/events + 推播高優先級通知給守門人
  }, []);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning" size={52} color="#fff" />
          </View>

          <Text style={styles.title}>危險</Text>
          <Text style={styles.desc}>已自動通知守門人，請等待家人協助確認</Text>

          <View style={styles.statusBadge}>
            <Ionicons name="notifications" size={14} color={THEME.bg} />
            <Text style={styles.statusText}>守門人已收到通知</Text>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Main")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>請勿依指示操作，返回首頁</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate("GuardianAlert", { eventId: eventIdRef.current })}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>查看守門人通知（Demo）</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: THEME.iconBg, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", marginBottom: 28,
  },
  title: { fontSize: 40, fontWeight: "900", color: THEME.text, letterSpacing: -0.5, textAlign: "center", marginBottom: 10 },
  desc: { fontSize: 16, fontWeight: "500", color: THEME.textSub, textAlign: "center", lineHeight: 24, marginBottom: 20 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 32,
  },
  statusText: { fontSize: 13, fontWeight: "700", color: THEME.bg },
  primaryBtn: {
    backgroundColor: THEME.primaryBtn, borderRadius: 999, paddingVertical: 18,
    alignItems: "center", alignSelf: "stretch", marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  primaryBtnText: { fontSize: 17, fontWeight: "800", color: THEME.primaryBtnText },
  outlineBtn: {
    borderWidth: 2, borderColor: THEME.outlineBtnBorder, borderRadius: 999,
    paddingVertical: 18, alignItems: "center", alignSelf: "stretch",
  },
  outlineBtnText: { fontSize: 17, fontWeight: "700", color: THEME.outlineBtnText },
});
