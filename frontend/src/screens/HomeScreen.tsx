import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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
import Button from "../components/Button";
import AppHeader from "../components/Header";
import NpcAvatar from "../components/NpcAvatar";
import { RootStackParamList } from "../navigation";
import { useAppStore } from "../store";
import { Colors, Radius, Shadow } from "../theme";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "早安";
  if (h < 18) return "午安";
  return "晚安";
}

// ── Guardian Home ──────────────────────────────────────────────
function GuardianHome() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, family } = useAppStore();
  const guardians = family.members.filter((m) => m.role !== 'guardian').slice(0, 3);

  const glow = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.gGreeting}>{getGreeting()}，{currentUser.nickname}</Text>
      <Text style={styles.gSubtitle}>今天天氣晴朗，記得多喝水。</Text>

      {/* Large Square CTA */}
      <Pressable
        onPress={() => (navigation as any).navigate('Detect')}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
      >
        <LinearGradient
          colors={['#E25858', '#FF9560']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.gCtaSquare}
        >
          <View style={styles.gCtaIconWrap}>
            <Animated.View style={[styles.gCtaGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            <Animated.View style={{ transform: [{ scale: iconScale }], zIndex: 1 }}>
              <Ionicons name="warning" size={100} color="rgba(255,255,255,0.95)" />
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
              <NpcAvatar avatar={m.avatar} initials={m.nickname[0]} size={56} color={Colors.primaryDark} borderColor="#f9dec1" borderWidth={2} />
            </View>
            <Text style={styles.familyName}>{m.nickname}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Gatekeeper Home ────────────────────────────────────────────
const STATUS_CONFIG = {
  safe: { color: "#22c55e", bg: "#dcfce7", label: "SAFE 安全" },
  pending: { color: Colors.warning, bg: "#fef3c7", label: "PENDING 待確認" },
  high_risk: { color: "#ef4444", bg: "#fee2e2", label: "HIGH RISK 高風險" },
} as const;

function GatekeeperHome() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { events, family } = useAppStore();
  const activeHighRisk = events.filter((e) => e.status === "high_risk");
  const guardianMembers = family.members.filter((m) => m.role === "guardian");
  // 近期事件：已結案（safe）且有 resolvedAt，取最新 3 筆
  const recentResolved = events
    .filter((e) => e.status === "safe" && e.riskLevel !== "safe")
    .slice(0, 3);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* High-Risk Alert Banner */}
      {activeHighRisk.length > 0 ? (
        <TouchableOpacity
          style={styles.gkAlertBanner}
          onPress={() =>
            navigation.navigate("GuardianAlert", {
              eventId: activeHighRisk[0].id,
            })
          }
          activeOpacity={0.85}
        >
          <View style={styles.gkAlertIcon}>
            <Ionicons name="warning" size={20} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gkAlertTitle}>⚠️ 有未處理的高風險事件</Text>
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
          <Text style={styles.gkStatNum}>1.2k</Text>
          <View style={styles.gkStatBar}>
            <View style={[styles.gkStatBarFill, { width: "75%" }]} />
          </View>
        </View>
        <View style={styles.gkStatCard}>
          <Text style={styles.gkStatLabel}>威脅阻斷</Text>
          <Text style={styles.gkStatNum}>89%</Text>
          <View style={styles.gkStatBar}>
            <View style={[styles.gkStatBarFill, { width: "89%" }]} />
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
                ev.riskLevel === "high" ? "#ef4444" : Colors.warning;
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
        <Text style={styles.gkBriefTitle}>
          AI 語音變聲詐騙急升：假冒子女求救，要求匯款至不明帳戶
        </Text>
        <Text style={styles.gkBriefBody}>
          近期詐騙集團利用生成式 AI 技術，模擬親友音色。若接獲要求匯款的電話，請務必先與本人確認。
        </Text>
        <Pressable
          onPress={() => navigation.navigate('ScamBrief')}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={['#89502e', '#ffb38a']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.gkBriefBtn}
          >
            <Text style={styles.gkBriefBtnText}>立即閱讀</Text>
          </LinearGradient>
        </Pressable>
        <Text style={styles.gkBriefDate}>2026-03-20</Text>
      </View>
    </ScrollView>
  );
}

// ── Solver Home ────────────────────────────────────────────────
function SolverHome() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, dailyChallengeResults } = useAppStore();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlySolvedChallenges = dailyChallengeResults.filter((record) => {
    if (record.userId !== currentUser.id || !record.isCorrect) {
      return false;
    }
    const recordDate = new Date(record.dateKey);
    if (Number.isNaN(recordDate.getTime())) {
      return false;
    }
    return (
      recordDate.getMonth() === currentMonth &&
      recordDate.getFullYear() === currentYear
    );
  }).length;

  const knowledgePoints = [
    {
      bold: "高收益零風險：",
      text: "任何承諾超過市場常規（如月入20%）且無風險的項目均為詐騙。",
    },
    {
      bold: "封閉式群組引導：",
      text: "強迫加入 LINE 或 Telegram 私密群組，並有眾多「老師」與「暗樁」吹捧。",
    },
    {
      bold: "不明轉帳管道：",
      text: "要求將資金轉入個人銀行帳戶或使用不明加密貨幣錢包，而非合法交易所。",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero: Greeting + Quick Stat */}
      <Text style={styles.slGreeting}>Hi {currentUser.nickname}</Text>
      <Button
        title="今日挑戰"
        onPress={() => navigation.navigate("DailyChallenge")}
        style={styles.slChallengeBtn}
      />

      <View style={styles.slStatCard}>
        <View style={styles.slStatIcon}>
          <Ionicons
            name="shield-checkmark"
            size={26}
            color={Colors.primaryDark}
          />
        </View>
        <View>
          <Text style={styles.slStatLabel}>本月識破</Text>
          <Text style={styles.slStatNum}>
            {monthlySolvedChallenges} <Text style={styles.slStatUnit}>次</Text>
          </Text>
        </View>
      </View>

      {/* Scam Trend Card */}
      <View style={styles.slTrendCard}>
        <View style={styles.slTrendHeader}>
          <View style={styles.slTrendDot} />
          <Text style={styles.slTrendTitle}>本週詐騙趨勢</Text>
        </View>
        <View style={styles.slTrendBody}>
          <View>
            <Text style={styles.slTrendTypeLabel}>主要類型</Text>
            <Text style={styles.slTrendType}>投資詐騙</Text>
          </View>
          <View style={styles.slTrendBadge}>
            <Text style={styles.slTrendBadgeNum}>+180%</Text>
            <Text style={styles.slTrendBadgeSub}>TREND SURGE</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.slTrendLink}
          onPress={() => navigation.navigate("WeeklyReport")}
          activeOpacity={0.7}
        >
          <Text style={styles.slTrendLinkText}>查看詳細分析報告</Text>
          <Ionicons name="arrow-forward" size={16} color={Colors.primaryDark} />
        </TouchableOpacity>
      </View>

      {/* Contribution Card */}
      <LinearGradient
        colors={["#89502e", "#ffb38a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.slContribCard}
      >
        <Text style={styles.slContribTitle}>My Contribution</Text>
        <View style={styles.slContribRow}>
          <View>
            <Text style={styles.slContribItemLabel}>累積積分</Text>
            <Text style={styles.slContribNum}>
              {currentUser.contributionPoints}{" "}
              <Text style={styles.slContribUnit}>分</Text>
            </Text>
          </View>
        </View>
        <View style={styles.slContribRow}>
          <View>
            <Text style={styles.slContribItemLabel}>舉報次數</Text>
            <Text style={styles.slContribNum}>
              12 <Text style={styles.slContribUnit}>次</Text>
            </Text>
          </View>
        </View>
        <View style={styles.slLevelRow}>
          <Text style={styles.slLevelLabel}>LEVEL 4 EXPLORER</Text>
          <Text style={styles.slLevelPct}>80%</Text>
        </View>
        <View style={styles.slProgressBg}>
          <View style={[styles.slProgressFill, { width: "80%" }]} />
        </View>
      </LinearGradient>

      {/* Knowledge Card */}
      <TouchableOpacity
        style={styles.slKnowledgeCard}
        onPress={() => navigation.navigate("KnowledgeCard", { cardId: "k2" })}
        activeOpacity={0.9}
      >
        <View style={styles.slKnowledgeImgPlaceholder}>
          <Ionicons
            name="bar-chart"
            size={48}
            color={Colors.primaryDark + "44"}
          />
        </View>
        <View style={styles.slInsightBadge}>
          <Text style={styles.slInsightBadgeText}>TODAY'S INSIGHT</Text>
        </View>
        <Text style={styles.slKnowledgeTitle}>今日知識卡：如何辨識假投資</Text>
        {knowledgePoints.map((p) => (
          <View key={p.bold} style={styles.slKnowledgePoint}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.primaryDark}
              style={{ marginTop: 1 }}
            />
            <Text style={styles.slKnowledgeText}>
              <Text style={styles.slKnowledgeBold}>{p.bold}</Text>
              {p.text}
            </Text>
          </View>
        ))}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Main Export ────────────────────────────────────────────────
export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, hasFamilyCircle } = useAppStore();

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
      {currentUser.role === "guardian" && <GuardianHome />}
      {currentUser.role === "gatekeeper" && <GatekeeperHome />}
      {currentUser.role === "solver" && <SolverHome />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 32 },
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
    width: '100%', aspectRatio: 1, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', gap: 24, overflow: 'hidden',
    shadowColor: '#E97A7A', shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35, shadowRadius: 32, elevation: 10,
  },
  gCtaIconWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  gCtaGlow: {
    position: 'absolute', top: 10, left: 10,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  gCtaTextWrap: { alignItems: 'center', gap: 6, zIndex: 1 },
  gCtaTitle: { fontSize: 28, fontWeight: '800', color: Colors.white, letterSpacing: -0.5 },
  gCtaSub: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
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
    backgroundColor: "#ffdad6",
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    ...Shadow.card,
  },
  gkSafeBanner: {
    backgroundColor: "#dcfce7",
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 24,
  },
  gkSafeBannerText: { fontSize: 14, fontWeight: "600", color: "#16a34a" },
  gkAlertIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  gkAlertTitle: { fontSize: 15, fontWeight: "700", color: "#7f1d1d" },
  gkAlertSub: { fontSize: 12, color: "#b91c1c", marginTop: 2 },
  gkSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gkSectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
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
    backgroundColor: '#fcf2e3', borderRadius: Radius.lg, padding: 24, marginBottom: 8,
    borderWidth: 1, borderColor: '#d7c2b926', gap: 16, ...Shadow.card,
  },
  gkBriefPill: {
    alignSelf: 'flex-start', backgroundColor: '#ffb38a4d',
    borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 6,
  },
  gkBriefPillText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark, letterSpacing: 0.5 },
  gkBriefTitle: { fontSize: 22, fontWeight: '800', color: '#4E3B31', lineHeight: 30 },
  gkBriefBody: { fontSize: 15, fontWeight: '500', color: '#52443c', lineHeight: 24 },
  gkBriefBtn: {
    borderRadius: Radius.md, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#89502e', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  gkBriefBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  gkBriefDate: { fontSize: 11, fontWeight: '700', color: '#1f1b1266', letterSpacing: 1.5, textTransform: 'uppercase' },
  // Solver
  slGreeting: {
    fontSize: 42,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -1,
    marginBottom: 12,
  },
  slChallengeBtn: { alignSelf: "flex-start", marginBottom: 16 },
  slStatCard: {
    backgroundColor: "#ebe1d3",
    borderRadius: Radius.lg,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    ...Shadow.card,
  },
  slStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryDark + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  slStatLabel: { fontSize: 13, color: Colors.textLight, fontWeight: "500" },
  slStatNum: { fontSize: 30, fontWeight: "900", color: Colors.text },
  slStatUnit: { fontSize: 16, fontWeight: "600" },
  slTrendCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 22,
    marginBottom: 16,
    ...Shadow.card,
  },
  slTrendHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  slTrendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  slTrendTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  slTrendBody: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  slTrendTypeLabel: { fontSize: 12, color: Colors.textLight, marginBottom: 4 },
  slTrendType: { fontSize: 28, fontWeight: "800", color: Colors.text },
  slTrendBadge: {
    backgroundColor: "#ffdad6",
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  slTrendBadgeNum: { fontSize: 22, fontWeight: "900", color: Colors.danger },
  slTrendBadgeSub: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.danger,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  slTrendLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  slTrendLinkText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primaryDark,
  },
  slContribCard: {
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 16,
    ...Shadow.strong,
  },
  slContribTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 20,
  },
  slContribRow: { marginBottom: 16 },
  slContribItemLabel: {
    fontSize: 12,
    color: Colors.white + "AA",
    marginBottom: 4,
  },
  slContribNum: { fontSize: 36, fontWeight: "900", color: Colors.white },
  slContribUnit: { fontSize: 18, fontWeight: "400" },
  slLevelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 6,
  },
  slLevelLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.white + "BB",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  slLevelPct: { fontSize: 10, fontWeight: "800", color: Colors.white + "BB" },
  slProgressBg: {
    height: 10,
    backgroundColor: Colors.white + "33",
    borderRadius: 5,
    overflow: "hidden",
  },
  slProgressFill: {
    height: "100%",
    backgroundColor: Colors.white,
    borderRadius: 5,
  },
  slKnowledgeCard: {
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: 8,
    ...Shadow.card,
  },
  slKnowledgeImgPlaceholder: {
    height: 180,
    backgroundColor: "#e2d9ca",
    alignItems: "center",
    justifyContent: "center",
  },
  slInsightBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#88d0d833",
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    margin: 20,
    marginBottom: 8,
  },
  slInsightBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#005a61",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  slKnowledgeTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    lineHeight: 34,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  slKnowledgePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  slKnowledgeText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 22,
  },
  slKnowledgeBold: { fontWeight: "700", color: Colors.text },
});
