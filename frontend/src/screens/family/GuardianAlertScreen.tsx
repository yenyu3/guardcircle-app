import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Radius } from "../../theme";
import { RootStackParamList } from "../../navigation";
import { useAppStore } from "../../store";
import NpcAvatar from "../../components/NpcAvatar";

const C = {
  bg: "#fff8f1",
  surface: "#ebe1d3",
  surfaceLow: "#fcf2e3",
  surfaceHigh: "#f1e7d8",
  card: "#ebe1d3",
  primary: "#89502e",
  onSurface: "#1f1b12",
  onSurfaceVariant: "#52443c",
  outline: "#d7c2b9",
  error: "#E25858",
  errorBg: "#FCEEE9",
  errorLight: "rgba(226,88,88,0.12)",
  safe: "#2E7D32",
  safeBg: "#E8F5E9",
  callBtn: "#FFB38A",
  callBtnText: "#4E3B31",
  white: "#ffffff",
};

export default function GuardianAlertScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "GuardianAlert">>();
  const { events, resolveEvent, family } = useAppStore();
  const event = events.find((e) => e.id === route.params.eventId) || events[0];
  const member = family.members.find((m) => m.id === event.userId);

  const glowAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.7, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function handleResolved() {
    resolveEvent(
      event.id,
      `${useAppStore.getState().currentUser.nickname} 已確認：這是詐騙，請勿理會`,
    );
    Alert.alert("已協助阻止", `${event.userNickname} 的狀態已恢復安全。`, [
      { text: "確定", onPress: () => navigation.goBack() },
    ]);
  }

  function handleCall() {
    Alert.alert("撥打電話", `撥打給 ${event.userNickname}`);
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={C.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>需要你的協助</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={s.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Alert Card ── */}
        <LinearGradient
          colors={["#E25858", "#FF9560"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          {/* Warning Icon */}
          <Animated.View style={[s.warningCircle, { opacity: glowAnim }]}>
            <View style={s.warningInner}>
              <Ionicons name="warning" size={32} color={C.error} />
            </View>
          </Animated.View>

          {/* Title */}
          <Text style={s.heroTitle}>高風險詐騙警報</Text>
          <Text style={s.heroSub}>你的家人正面臨詐騙威脅，請立即採取行動</Text>

          {/* Member Row */}
          <View style={s.memberRow}>
            <View style={s.avatarWrap}>
              <NpcAvatar
                avatar={member?.avatar}
                initials={event.userNickname[0]}
                size={52}
                color={C.error}
                borderColor={C.white}
                borderWidth={2}
              />
              <View style={s.dangerDot} />
            </View>
            <View style={s.memberInfo}>
              <Text style={s.memberName}>{event.userNickname}</Text>
              <View style={s.memberMeta}>
                <View style={s.highRiskPill}>
                  <Text style={s.highRiskText}>HIGH RISK</Text>
                </View>
                <Text style={s.timeText}>{event.createdAt}</Text>
              </View>
            </View>
          </View>

          {/* Score Row */}
          <View style={s.scoreCard}>
            <View style={s.scoreBox}>
              <Text style={s.scoreNum}>{event.riskScore}</Text>
              <Text style={s.scoreLabel}>RISK SCORE</Text>
            </View>
            <View style={s.scoreDivider} />
            <View style={s.scoreBox}>
              <Text style={s.scamTypeText}>{event.scamType}</Text>
              <Text style={s.scoreLabel}>詐 騙 類 型</Text>
            </View>
          </View>

          {/* 可疑訊息 */}
          <View style={s.msgCard}>
            <View style={s.msgHeader}>
              <Ionicons
                name="chatbubble"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={s.msgTitle}>可疑訊息內容</Text>
            </View>
            <View style={s.msgBox}>
              {event.imageUri ? (
                <Image source={{ uri: event.imageUri }} style={s.msgImage} resizeMode="contain" />
              ) : (
                <Text style={s.msgText}>{event.input}</Text>
              )}
            </View>
          </View>

          {/* 分隔線 */}
          <View style={s.divider} />

          {/* 行動按鈕 */}
          <View style={s.btnGroup}>
            <View style={s.btnRow}>
              <TouchableOpacity
                style={[s.btn, s.btnOutline, { flex: 1 }]}
                onPress={handleCall}
                activeOpacity={0.85}
              >
                <Ionicons name="call" size={18} color="rgba(255,255,255,0.8)" />
                <Text style={s.btnOutlineText}>聯繫 {event.userNickname}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, s.btnOutline, { flex: 1 }]}
                onPress={() =>
                  navigation.navigate("FamilyEventDetail", {
                    eventId: event.id,
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={s.btnOutlineText}>查看報告</Text>
                <Ionicons
                  name="arrow-forward"
                  size={15}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={s.btn}
              onPress={handleResolved}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle" size={20} color={C.white} />
              <Text style={s.btnText}>已協助阻止</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.bg,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.primary,
    flex: 1,
    textAlign: "center",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
    gap: 16,
  },

  // Hero Card
  heroCard: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    shadowColor: "#E25858",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  warningCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  warningInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: C.white,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  heroSub: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 14,
  },

  // Score Row (舊版風格)
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 20,
    width: "100%",
    marginTop: 4,
  },
  scoreBox: { flex: 1, alignItems: "center", gap: 4 },
  scoreNum: { fontSize: 36, fontWeight: "900", color: C.white },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 2,
  },
  scoreDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  scamTypeText: {
    fontSize: 22,
    fontWeight: "900",
    color: C.white,
    textAlign: "center",
  },

  // Member
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    width: "100%",
    marginTop: 4,
  },
  avatarWrap: { position: "relative" },
  dangerDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.error,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: "700", color: C.white },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  highRiskPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  highRiskText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.white,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  timeText: { fontSize: 12, color: "rgba(255,255,255,0.75)" },

  // Message Card
  msgCard: {
    width: "100%",
    gap: 10,
    marginTop: 4,
  },
  msgHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  msgTitle: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  msgBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.4)",
  },
  msgImage: { width: '100%', height: 180, borderRadius: 10 },
  msgText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 21,
    fontStyle: "italic",
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginTop: 12,
  },
  btnGroup: { width: "100%", gap: 10, marginTop: 4 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: {
    borderRadius: Radius.full,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  btnText: { fontSize: 16, fontWeight: "700", color: C.white },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
});
