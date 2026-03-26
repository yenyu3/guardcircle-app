import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert, Animated, Easing } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { RootStackParamList } from "../../navigation";
import { useAppStore } from "../../store";
import { DetectEvent } from "../../types";
import { useElderStyle } from "../../hooks/useElderStyle";

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

function callPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() =>
    Alert.alert("無法撥打電話", "請確認裝置支援撥話功能")
  );
}

export default function ResultHighScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResultHigh">>();
  const { scamType, riskScore, riskFactors, summary, reason, readonly, originalInput, imageUri, attachmentUri } = route.params;
  const { currentUser, addEvent, setMemberStatus, elderMode } = useAppStore();
  const s = useElderStyle();
  const eventIdRef = useRef(`e_${Date.now()}`);
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1.55, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 1, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: true }),
        ])
      );
    anim(pulse1, 0).start();
    anim(pulse2, 350).start();
  }, []);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 400);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 800);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 1200);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error), 1600);
    if (elderMode && currentUser.role === "guardian") {
      Speech.speak("高風險，建議不要點擊", { language: "zh-TW" });
    }
    if (readonly) return;
    const newEvent: DetectEvent = {
      id: eventIdRef.current,
      userId: currentUser.id,
      userNickname: currentUser.nickname,
      type: "text",
      input: originalInput ?? summary,
      imageUri,
      attachmentUri,
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
          <View style={styles.iconWrapper}>
            <Animated.View style={[styles.halo, { transform: [{ scale: pulse2 }], opacity: pulse2.interpolate({ inputRange: [1, 1.55], outputRange: [0.15, 0] }) }]} />
            <Animated.View style={[styles.halo, { transform: [{ scale: pulse1 }], opacity: pulse1.interpolate({ inputRange: [1, 1.55], outputRange: [0.25, 0] }) }]} />
            <View style={styles.iconCircle}>
              <Ionicons name="warning" size={52} color="#fff" />
            </View>
          </View>

          <Text style={[styles.title, s.active && { fontSize: 50 * s.f }]}>危險</Text>
          <Text style={[styles.desc, s.active && { fontSize: 19 * s.f, lineHeight: 28 * s.f }]}>{reason ?? '已自動通知守門人，請等待家人協助確認'}</Text>

          <TouchableOpacity
            style={[styles.callBtn, s.active && { paddingVertical: 22 }]}
            onPress={() => callPhone("165")}
            activeOpacity={0.85}
          >
            <Ionicons name="call" size={s.active ? 22 : 18} color="#D4806E" style={{ marginRight: 6 }} />
            <Text style={[styles.callBtnText, s.active && { fontSize: 20 * s.f }]}>打165報案</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, s.active && { paddingVertical: 22 }]}
            onPress={() => {
              const phone = currentUser.emergencyPhone;
              if (!phone) {
                Alert.alert("尚未設定緊急聯絡人", "請至設定頁面填寫緊急聯絡人電話");
                return;
              }
              callPhone(phone);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="people" size={s.active ? 22 : 18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={[styles.outlineBtnText, s.active && { fontSize: 20 * s.f }]}>通報家人</Text>
          </TouchableOpacity>
          <View style={{ height: 64 }} />
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
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, marginTop: -40 },
  iconWrapper: { width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 28 },
  halo: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: "#fff" },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: THEME.iconBg, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
  },
  title: { fontSize: 40, fontWeight: "900", color: THEME.text, letterSpacing: -0.5, textAlign: "center", marginBottom: 10 },
  desc: { fontSize: 16, fontWeight: "500", color: THEME.textSub, textAlign: "center", lineHeight: 24, marginBottom: 32 },
  callBtn: {
    backgroundColor: THEME.primaryBtn, borderRadius: 999, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "stretch", marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  callBtnText: { fontSize: 17, fontWeight: "800", color: THEME.primaryBtnText },
  outlineBtn: {
    borderWidth: 2, borderColor: THEME.outlineBtnBorder, borderRadius: 999,
    paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "stretch",
  },
  outlineBtnText: { fontSize: 17, fontWeight: "800", color: THEME.outlineBtnText },
});
