import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Banner from "../components/Banner";
import AppHeader from "../components/Header";
import NpcAvatar from "../components/NpcAvatar";
import { RootStackParamList } from "../navigation";
import { useScrollRef } from "../navigation/ScrollRefContext";
import { useAppStore } from "../store";
import { Colors, Radius, Shadow } from "../theme";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "早安";
  if (h < 18) return "午安";
  return "晚安";
}

// ── Guardian Home ──────────────────────────────────────────────
function GuardianHome({
  scrollRef,
}: {
  scrollRef: React.RefObject<ScrollView | null>;
}) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, family } = useAppStore();
  const guardians = family.members
    .filter((m) => m.role !== "guardian")
    .slice(0, 3);

  const glow = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, {
          toValue: 1.08,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(iconScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });
  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.45],
  });

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.gGreeting}>
        {getGreeting()}，{currentUser.nickname}
      </Text>
      <Text style={styles.gSubtitle}>今天天氣晴朗，記得多喝水。</Text>

      {/* Large Square CTA */}
      <Pressable
        onPress={() => (navigation as any).navigate("Detect")}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <LinearGradient
          colors={["#E25858", "#FF9560"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gCtaSquare}
        >
          <View style={styles.gCtaIconWrap}>
            <Animated.View
              style={[
                styles.gCtaGlow,
                { opacity: glowOpacity, transform: [{ scale: glowScale }] },
              ]}
            />
            <Animated.View
              style={{ transform: [{ scale: iconScale }], zIndex: 1 }}
            >
              <Ionicons
                name="warning"
                size={100}
                color="rgba(255,255,255,0.95)"
              />
            </Animated.View>
          </View>
          <View style={styles.gCtaTextWrap}>
            <Text style={styles.gCtaTitle}>我收到可疑訊息</Text>
            <Text style={styles.gCtaSub}>讓我們幫您檢查，確保安全</Text>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={[styles.familyHeader, { marginTop: 32 }]}>
        <Text style={styles.familyTitle}>守護你的人</Text>
        <Text style={styles.familyAll}>全部 ({guardians.length})</Text>
      </View>
      <View style={styles.familyRow}>
        {guardians.map((m) => (
          <View key={m.id} style={styles.familyMember}>
            <View style={styles.familyAvatarWrap}>
              <NpcAvatar
                avatar={m.avatar}
                initials={m.nickname[0]}
                size={56}
                color={Colors.primaryDark}
                borderColor="#f9dec1"
                borderWidth={2}
              />
            </View>
            <Text style={styles.familyName}>{m.nickname}</Text>
          </View>
        ))}
      </View>

      {/* 今日詐騙快報 */}
      <View style={styles.gkBriefCard}>
        <View style={styles.gkBriefPill}>
          <Text style={styles.gkBriefPillText}>今日詐騙快報</Text>
        </View>
        <Text style={styles.gkBriefDate}>
          {new Date().toLocaleDateString("sv")}
        </Text>
        <Text style={styles.gkBriefTitle}>
          AI 語音變聲詐騙急升：假冒子女求救，要求匯款至不明帳戶
        </Text>
        <Text style={styles.gkBriefBody}>
          近期詐騙集團利用生成式 AI
          技術，模擬親友音色。若接獲要求匯款的電話，請務必先與本人確認。
        </Text>
        <Pressable
          onPress={() => navigation.navigate("ScamBrief")}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={["#89502e", "#ffb38a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gkBriefBtn}
          >
            <Text style={styles.gkBriefBtnText}>立即閱讀</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Gatekeeper Home ────────────────────────────────────────────
const STATUS_CONFIG = {
  safe: { color: Colors.safe, bg: Colors.safeBg, label: "SAFE 安全" },
  pending: {
    color: Colors.warning,
    bg: Colors.warningBg,
    label: "PENDING 待確認",
  },
  high_risk: {
    color: Colors.danger,
    bg: Colors.dangerBg,
    label: "HIGH RISK 高風險",
  },
} as const;

function GatekeeperHome({
  scrollRef,
}: {
  scrollRef: React.RefObject<ScrollView | null>;
}) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { events, family } = useAppStore();
  const totalScans = events.length;
  const safeCount = events.filter((e) => e.status === "safe").length;
  const threatBlockPct = totalScans > 0 ? Math.round((safeCount / totalScans) * 100) : 0;
  const activeHighRisk = events.filter((e) => e.status === "high_risk");
  const guardianMembers = family.members.filter((m) => m.role === "guardian");
  const recentResolved = events
    .filter((e) => e.status === "safe" && e.riskLevel !== "safe")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* High-Risk Alert Banner */}
      {activeHighRisk.length > 0 ? (
        <TouchableOpacity
          style={styles.gkAlertBanner}
          onPress={() => navigation.navigate("HighRiskEvents")}
          activeOpacity={0.85}
        >
          <View style={styles.gkAlertIcon}>
            <Ionicons name="warning" size={20} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gkAlertTitle}>有未處理的高風險事件</Text>
            <Text style={styles.gkAlertSub}>
              在 15 分鐘前偵測到異常活動，請立即查看。
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.danger} />
        </TouchableOpacity>
      ) : (
        <View style={styles.gkSafeBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
          <Text style={styles.gkSafeBannerText}>
            目前無高風險事件，家人安全中
          </Text>
        </View>
      )}

      {/* Member Status Section */}
      <View style={styles.gkSectionHeader}>
        <Text style={styles.gkSectionTitle}>家庭成員狀態</Text>
      </View>

      <View style={styles.gkMembersCard}>
        {guardianMembers.map((m, i) => {
          const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.pending;
          const isLast = i === guardianMembers.length - 1;
          const isHighRisk = m.status === "high_risk";
          return (
            <View
              key={m.id}
              style={[
                styles.gkMemberRow,
                isHighRisk && styles.gkMemberRowDanger,
                !isLast && styles.gkMemberRowBorder,
              ]}
            >
              <View style={styles.gkAvatarWrap}>
                <NpcAvatar
                  avatar={m.avatar}
                  initials={m.nickname[0]}
                  size={52}
                  color={cfg.color}
                  borderColor={cfg.bg}
                  borderWidth={2}
                />
                <View
                  style={[styles.gkStatusDot, { backgroundColor: cfg.color }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gkMemberName}>{m.nickname}</Text>
                <Text style={styles.gkMemberTime}>
                  最後活動：{m.lastActive}
                </Text>
              </View>
              <View style={[styles.gkStatusPill, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.gkStatusPillText, { color: cfg.color }]}>
                  {cfg.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Stats Row */}
      <View style={styles.gkStatsRow}>
        <View style={styles.gkStatCard}>
          <Text style={styles.gkStatLabel}>總查詢數</Text>
          <Text style={styles.gkStatNum}>{totalScans}</Text>
          <View style={styles.gkStatBar}>
            <View style={[styles.gkStatBarFill, { width: "100%" }]} />
          </View>
        </View>
        <View style={styles.gkStatCard}>
          <Text style={styles.gkStatLabel}>威脅阻斷</Text>
          <Text style={styles.gkStatNum}>{threatBlockPct}%</Text>
          <View style={styles.gkStatBar}>
            <View style={[styles.gkStatBarFill, { width: `${threatBlockPct}%` as any }]} />
          </View>
        </View>
      </View>

      {/* Recent Events Timeline */}
      <View style={styles.gkEventsCard}>
        <Text style={styles.gkSectionTitle}>近期事件</Text>
        <View style={styles.gkTimeline}>
          <View style={styles.gkTimelineLine} />
          {recentResolved.length === 0 ? (
            <Text style={styles.gkNoEvents}>目前尚無已處理事件</Text>
          ) : (
            recentResolved.map((ev) => {
              const dotColor =
                ev.riskLevel === "high" ? Colors.danger : Colors.warning;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={styles.gkTimelineItem}
                  onPress={() =>
                    navigation.navigate("FamilyEventDetail", { eventId: ev.id })
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.gkTimelineDot,
                      { backgroundColor: dotColor },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gkEventTitle}>
                      {ev.userNickname} · {ev.scamType}
                    </Text>
                    <Text style={styles.gkEventSub}>
                      {ev.summary.slice(0, 30)}…
                    </Text>
                  </View>
                  <Text style={styles.gkEventTime}>{ev.createdAt}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
        <TouchableOpacity
          style={styles.gkViewAllBtn}
          onPress={() => navigation.navigate("FamilyRecord")}
          activeOpacity={0.8}
        >
          <Text style={styles.gkViewAllText}>查看完整日誌</Text>
        </TouchableOpacity>
      </View>

      {/* Daily Scam Brief */}
      <View style={styles.gkBriefCard}>
        <View style={styles.gkBriefPill}>
          <Text style={styles.gkBriefPillText}>今日詐騙快報</Text>
        </View>
        <Text style={styles.gkBriefDate}>
          {new Date().toLocaleDateString("sv")}
        </Text>
        <Text style={styles.gkBriefTitle}>
          AI 語音變聲詐騙急升：假冒子女求救，要求匯款至不明帳戶
        </Text>
        <Text style={styles.gkBriefBody}>
          近期詐騙集團利用生成式 AI
          技術，模擬親友音色。若接獲要求匯款的電話，請務必先與本人確認。
        </Text>
        <Pressable
          onPress={() => navigation.navigate("ScamBrief")}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={["#89502e", "#ffb38a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gkBriefBtn}
          >
            <Text style={styles.gkBriefBtnText}>立即閱讀</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </ScrollView>
  );
}

// ── Solver Home ────────────────────────────────────────────────
function SolverHome({
  scrollRef,
}: {
  scrollRef: React.RefObject<ScrollView | null>;
}) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, dailyChallengeResults } = useAppStore();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlySolved = dailyChallengeResults.filter((r) => {
    if (r.userId !== currentUser.id || !r.isCorrect) return false;
    const d = new Date(r.dateKey);
    return (
      !Number.isNaN(d.getTime()) &&
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear
    );
  }).length;

  const monthlyTotal = 30;
  const solvedPct = Math.min(monthlySolved / monthlyTotal, 1);

  const points = currentUser.contributionPoints ?? 0;
  const reports = currentUser.reportCount ?? 0;
  const pointsPerLevel = 100;
  const level = Math.floor(points / pointsPerLevel) + 1;
  const levelPct = (points % pointsPerLevel) / pointsPerLevel;

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <Text style={styles.slGreeting}>Hi {currentUser.nickname},</Text>
      <Text style={styles.slGreetingSub}>準備好今天的挑戰了嗎？</Text>

      {/* 今日挑戰 Card */}
      <View style={styles.slChallengeCard}>
        <View style={styles.slChallengeCardTop}>
          <Text style={styles.slChallengeCardTitle}>今日挑戰</Text>
          <View style={styles.slDailyBadge}>
            <Text style={styles.slDailyBadgeText}>DAILY</Text>
          </View>
        </View>
        <Text style={styles.slChallengeStatusLabel}>Challenge Status</Text>
        <Text style={styles.slChallengeStatusNum}>
          本月識破 {monthlySolved} / {monthlyTotal} 題
        </Text>
        <View style={styles.slProgressBgWhite}>
          <LinearGradient
            colors={["#c47a4e", "#ffb38a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.slProgressFillWhite,
              { width: `${solvedPct * 100}%` as any },
            ]}
          />
        </View>
        <Pressable
          onPress={() => navigation.navigate("DailyChallenge")}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={["#89502e", "#ffb38a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.slStartBtn}
          >
            <Text style={styles.slStartBtnText}>開始挑戰</Text>
            <Ionicons name="arrow-forward" size={18} color={Colors.white} />
          </LinearGradient>
        </Pressable>
      </View>
      <View style={styles.slLevelCard}>
        <View style={styles.slLevelCardTop}>
          <Text style={styles.slLevelCardTitle}>我獨自升級</Text>
          <View style={styles.slLevelBadge}>
            <Ionicons name="medal" size={13} color={"#89502e"} />
            <Text style={styles.slLevelBadgeText}>LEVEL {level}</Text>
          </View>
        </View>
        <Text style={styles.slMotivationText}>
          多多偵測、協助家人確認，獲得更多守護積分！
        </Text>
        <View style={[styles.slStatsRow, { marginTop: 16 }]}>
          <View style={styles.slStatBox}>
            <Text style={styles.slStatBoxLabel}>累積積分</Text>
            <Text style={styles.slStatBoxNum}>{points.toLocaleString()}</Text>
          </View>
          <View style={styles.slStatBox}>
            <Text style={styles.slStatBoxLabel}>舉報次數</Text>
            <Text style={styles.slStatBoxNum}>
              {reports} <Text style={styles.slStatBoxUnit}>次</Text>
            </Text>
          </View>
        </View>
        <View style={styles.slLevelProgressRow}>
          <Text style={styles.slLevelProgressLabel}>進階：防詐大師</Text>
          <Text style={styles.slLevelProgressPct}>
            {Math.round(levelPct * 100)}%
          </Text>
        </View>
        <View style={styles.slProgressBgBrown}>
          <LinearGradient
            colors={["#c47a4e", "#ffb38a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.slProgressFillBrown,
              { width: `${levelPct * 100}%` as any },
            ]}
          />
        </View>
      </View>

      {/* 今日知識卡 */}
      <View style={styles.slKnowledgeCard}>
        {/* 標題列 */}
        <View style={styles.slKnHeader}>
          <Text style={styles.slKnowledgeCardTitle}>今日知識卡</Text>
          <View style={styles.slDailyBadge}>
            <Text style={styles.slDailyBadgeText}>TODAY</Text>
          </View>
        </View>

        {/* 詐騙主題 */}
        <View style={styles.slKnTopicRow}>
          <View style={styles.slKnIconBox}>
            <Ionicons name="ticket-outline" size={22} color="#89502e" />
          </View>
          <Text style={styles.slKnTitle}>網購票券詐騙</Text>
        </View>

        {/* 故事摘要 */}
        <Text style={styles.slKnSubtitle}>
          網購票券沒保障，不是黃牛就是騙！
        </Text>
        <Text style={styles.slKnStory}>
          一位 TWICE 粉絲在 Threads 上找到「轉售票券」的賣家，對方引導加 LINE
          好友，並提供下單連結要求透過7-11賣貨便完成。再透過假客服要求網路銀行轉帳「驗證」。最終轉出
          29,123 元，票沒拿到，對方也消失了。
        </Text>

        <View style={styles.slKnDivider} />

        {/* 警訊 + 提醒 並排 */}
        <View style={styles.slKnTwoCol}>
          <View style={styles.slKnCol}>
            <Text style={styles.slKnColTitle}>詐騙警訊</Text>
            {["加LINE私下交易", "提供不明連結", "假客服轉帳驗證"].map((t) => (
              <View key={t} style={styles.slKnBulletRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color="#89502e"
                />
                <Text style={styles.slKnBulletText}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={styles.slKnColDivider} />
          <View style={styles.slKnCol}>
            <Text style={styles.slKnColTitle}>防詐提醒</Text>
            {["勿私訊購票", "勿點不明連結", "有疑問先詢家人"].map((t) => (
              <View key={t} style={styles.slKnBulletRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={13}
                  color="#89502e"
                />
                <Text style={styles.slKnBulletText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Main Export ────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, hasFamilyCircle } = useAppStore();
  const scrollRef = useRef<ScrollView>(null);
  const { register } = useScrollRef();

  useFocusEffect(
    React.useCallback(() => {
      register("Home", scrollRef);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader />
      {!hasFamilyCircle && (
        <Banner
          message="你還沒加入家庭圈，前往設定加入"
          variant="info"
          onPress={() =>
            (navigation as any).navigate("Main", { screen: "Settings" })
          }
          style={{ marginHorizontal: 20, marginTop: 12 }}
        />
      )}
      {currentUser.role === "guardian" && (
        <GuardianHome scrollRef={scrollRef} />
      )}
      {currentUser.role === "gatekeeper" && (
        <GatekeeperHome scrollRef={scrollRef} />
      )}
      {currentUser.role === "solver" && <SolverHome scrollRef={scrollRef} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingTop: 8, paddingBottom: 32 },
  // Guardian
  gGreeting: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  gSubtitle: { fontSize: 16, color: Colors.textLight, marginBottom: 28 },
  // Guardian CTA Square
  gCtaSquare: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    overflow: "hidden",
    shadowColor: "#E97A7A",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 10,
  },
  gCtaIconWrap: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  gCtaGlow: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  gCtaTextWrap: { alignItems: "center", gap: 6, zIndex: 1 },
  gCtaTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: -0.5,
  },
  gCtaSub: { fontSize: 16, fontWeight: "600", color: "rgba(255,255,255,0.9)" },
  // Family
  familyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  familyTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  familyAll: { fontSize: 14, fontWeight: "700", color: Colors.primaryDark },
  familyRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 28,
  },
  familyMember: { alignItems: "center", gap: 8 },
  familyAvatarWrap: {
    borderRadius: 999,
    backgroundColor: Colors.white,
    ...Shadow.card,
  },
  familyName: { fontSize: 15, fontWeight: "700", color: Colors.text },
  // Bento
  bentoGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  bentoItem: {
    flex: 1,
    backgroundColor: "#ebe1d3",
    borderRadius: Radius.lg,
    paddingVertical: 24,
    alignItems: "center",
    gap: 10,
  },
  bentoLabel: { fontSize: 15, fontWeight: "700", color: Colors.text },
  // Gatekeeper
  gkAlertBanner: {
    backgroundColor: Colors.dangerBg,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    ...Shadow.card,
  },
  gkSafeBanner: {
    backgroundColor: Colors.safeBg,
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  gkSafeBannerText: { fontSize: 14, fontWeight: "700", color: Colors.safe },
  gkAlertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  gkAlertTitle: { fontSize: 15, fontWeight: "700", color: Colors.dangerDark },
  gkAlertSub: { fontSize: 12, color: Colors.dangerDark, marginTop: 2 },
  gkSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  gkSectionTitle: { fontSize: 20, fontWeight: "800", color: Colors.text },
  gkMembersCard: {
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.lg,
    marginBottom: 16,
    overflow: "hidden",
    ...Shadow.card,
  },
  gkMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  gkMemberRowDanger: { borderWidth: 1.5, borderColor: "#fca5a5" },
  gkMemberRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f6edde" },
  gkAvatarWrap: { position: "relative" },
  gkStatusDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  gkMemberName: { fontSize: 16, fontWeight: "700", color: Colors.text },
  gkMemberTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  gkStatusPill: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  gkStatusPillText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  gkStatsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  gkStatCard: {
    flex: 1,
    backgroundColor: "#ebe1d3",
    borderRadius: Radius.lg,
    padding: 18,
    alignItems: "center",
    gap: 4,
  },
  gkStatLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  gkStatNum: { fontSize: 30, fontWeight: "900", color: Colors.text },
  gkStatBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#d7c2b9",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  gkStatBarFill: {
    height: "100%",
    backgroundColor: Colors.primaryDark,
    borderRadius: 2,
  },
  gkEventsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 16,
    ...Shadow.card,
  },
  gkTimeline: { marginTop: 16, paddingLeft: 8, position: "relative" },
  gkTimelineLine: {
    position: "absolute",
    left: 13,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: "#f6edde",
  },
  gkTimelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
  },
  gkTimelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  gkEventTitle: { fontSize: 13, fontWeight: "700", color: Colors.text },
  gkEventSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  gkEventTime: { fontSize: 10, fontWeight: "700", color: Colors.textMuted },
  gkNoEvents: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 12,
  },
  gkViewAllBtn: {
    marginTop: 4,
    paddingVertical: 12,
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.md,
    alignItems: "center",
  },
  gkViewAllText: { fontSize: 13, fontWeight: "700", color: Colors.textLight },
  gkBriefCard: {
    backgroundColor: "#f6edde",
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#d7c2b926",
    gap: 16,
    ...Shadow.card,
  },
  gkBriefPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(137,80,46,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(137,80,46,0.25)",
  },
  gkBriefPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#89502e",
    letterSpacing: 1,
  },
  gkBriefTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#4E3B31",
    lineHeight: 30,
  },
  gkBriefBody: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.textMuted,
    lineHeight: 24,
  },
  gkBriefBtn: {
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: 24,
    overflow: "hidden",
    shadowColor: "#89502e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  gkBriefBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
  gkBriefDate: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f1b1266",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  // Solver
  slGreeting: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  slGreetingSub: {
    color: "#89502e",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
  },
  // 今日挑戰
  slChallengeCard: {
    backgroundColor: "#f6edde",
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d7c2b926",
    ...Shadow.card,
  },
  slChallengeCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  slChallengeCardTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  slDailyBadge: {
    backgroundColor: "rgba(137,80,46,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(137,80,46,0.25)",
  },
  slDailyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#89502e",
    letterSpacing: 1,
  },
  slChallengeStatusLabel: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: "500",
    marginBottom: 4,
  },
  slChallengeStatusNum: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
  },
  slProgressBgWhite: {
    height: 10,
    backgroundColor: "#d7c2b940",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 20,
  },
  slProgressFillWhite: { height: "100%", borderRadius: 5 },
  slStartBtn: {
    borderRadius: Radius.full,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
    shadowColor: "#89502e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  slStartBtnText: { fontSize: 16, fontWeight: "700", color: Colors.white },
  // 我獨自升級
  slLevelCard: {
    backgroundColor: "#f6edde",
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d7c2b926",
    ...Shadow.card,
  },
  slLevelCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  slLevelCardTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  slLevelBadge: {
    backgroundColor: "rgba(137,80,46,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(137,80,46,0.25)",
  },
  slLevelBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#89502e",
    letterSpacing: 0.5,
  },
  slStatsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  slStatBox: {
    flex: 1,
    backgroundColor: "#fcf2e3",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d7c2b930",
  },
  slStatBoxLabel: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: "600",
    marginBottom: 4,
  },
  slStatBoxNum: { fontSize: 30, fontWeight: "900", color: "#89502e" },
  slStatBoxUnit: { fontSize: 14, fontWeight: "400", color: Colors.textLight },
  slLevelProgressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  slLevelProgressLabel: { fontSize: 14, fontWeight: "700", color: Colors.text },
  slLevelProgressPct: { fontSize: 13, fontWeight: "700", color: "#89502e" },
  slProgressBgBrown: {
    height: 8,
    backgroundColor: "#d7c2b940",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  slProgressFillBrown: { height: "100%", borderRadius: 4 },
  slLevelHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
  },
  slMotivationBox: {
    backgroundColor: "rgba(137,80,46,0.08)",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#89502e",
  },
  slMotivationText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 16,
  },
  // 今日知識卡
  slKnowledgeCard: {
    backgroundColor: "#f6edde",
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#d7c2b926",
    ...Shadow.card,
  },
  slKnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  slKnowledgeCardTitle: { fontSize: 22, fontWeight: "800", color: Colors.text },
  slKnTopicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  slKnIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fcf2e3",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#d7c2b930",
  },
  slKnTitle: { fontSize: 20, fontWeight: "800", color: Colors.text, flex: 1 },
  slKnSubtitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#89502e",
    lineHeight: 24,
    marginBottom: 10,
  },
  slKnStory: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 22,
    marginBottom: 4,
  },
  slKnDivider: { height: 1, backgroundColor: "#d7c2b940", marginVertical: 16 },
  slKnTwoCol: { flexDirection: "row", gap: 0 },
  slKnCol: { flex: 1 },
  slKnColDivider: {
    width: 1,
    backgroundColor: "#d7c2b940",
    marginHorizontal: 14,
  },
  slKnColTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 10,
  },
  slKnBulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 8,
  },
  slKnBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#89502e",
  },
  slKnBulletText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
  slKnSource: { fontSize: 11, color: Colors.textMuted, marginTop: 8 },
});
