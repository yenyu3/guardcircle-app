import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Radius } from "../../theme";
import { RootStackParamList } from "../../navigation";
import { useAppStore } from "../../store";
import { DetectEvent } from "../../types";
import { useElderStyle } from "../../hooks/useElderStyle";

const STEPS = [
  { label: "資料庫查詢" },
  { label: "AI 語意分析" },
  { label: "產生風險報告" },
];


export default function AnalyzingScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "Analyzing">>();
  const { type, input, imageUri, attachmentUri } = route.params;
  const { currentUser, addEvent, addContributionPoints, apiAnalyze } = useAppStore();
  const elder = useElderStyle();
  const [step, setStep] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.18,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.2,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const timers = [
      setTimeout(() => setStep(1), 1000),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3200),
      setTimeout(async () => {
        try {
          const apiResult = await apiAnalyze({
            input_type: type as any,
            content: input,
          });
          const { mapRiskLevel } = await import('../../api');
          const riskLevel = mapRiskLevel(apiResult.risk_level);
          const result = {
            riskLevel,
            riskScore: apiResult.risk_score,
            scamType: apiResult.scam_type ?? apiResult.top_signals?.[0] ?? '無詳細資訊',
            summary: apiResult.summary ?? apiResult.reason,
            riskFactors: apiResult.risk_factors ?? apiResult.top_signals ?? [],
            reason: apiResult.reason,
          };
          const now = new Date()
            .toLocaleString("zh-TW", { hour12: false })
            .slice(0, 15);

          if (result.riskLevel === "safe") {
          const event: DetectEvent = {
            id: `e_${Date.now()}`,
            userId: currentUser.id,
            userNickname: currentUser.nickname,
            type: type as any,
            input,
            imageUri,
            attachmentUri,
            ...result,
            createdAt: now,
            status: "safe",
          };
            addEvent(event);
            if (currentUser.role === "solver") addContributionPoints(10);
            navigation.replace("ResultSafe", { reason: result.reason });
          } else if (result.riskLevel === "high") {
            if (currentUser.role === "solver") addContributionPoints(10);
            navigation.replace("ResultHigh", {
              scamType: result.scamType,
              riskScore: result.riskScore,
              riskFactors: result.riskFactors,
              summary: result.summary,
              reason: result.reason,
              originalInput: input,
              imageUri,
              attachmentUri,
            });
          } else {
            if (currentUser.role === "solver") addContributionPoints(10);
            navigation.replace("ResultMedium", {
              scamType: result.scamType,
              riskScore: result.riskScore,
              riskFactors: result.riskFactors,
              summary: result.summary,
              reason: result.reason,
              originalInput: input,
              imageUri,
              attachmentUri,
            });
          }
        } catch (err) {
          Alert.alert('分析失敗', '無法連線至伺服器，請確認網路後再試', [
            { text: '返回', onPress: () => navigation.goBack() },
          ]);
        }
      }, 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.cancel}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={22} color={Colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.center}>
          {/* 光暈動畫 */}
          <View style={styles.iconWrap}>
            <Animated.View
              style={[
                styles.glow,
                { opacity: glowOpacity, transform: [{ scale: pulse }] },
              ]}
            />
            <Animated.View
              style={[styles.spinnerRing, { transform: [{ rotate }] }]}
            />
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={44} color="#ffb38a" />
            </View>
          </View>

          <Text
            style={[styles.title, elder.active && { fontSize: 30 * elder.f }]}
          >
            AI 分析中
          </Text>
          <Text
            style={[
              styles.subtitle,
              elder.active && { fontSize: 17 * elder.f },
            ]}
          >
            正在檢查內容是否包含詐騙特徵…
          </Text>

          {/* 步驟卡片 */}
          <View style={styles.steps}>
            {STEPS.map((s, i) => {
              const done = step > i;
              const active = step === i;
              return (
                <View
                  key={i}
                  style={[
                    styles.stepCard,
                    done && styles.stepCardDone,
                    active && styles.stepCardActive,
                  ]}
                >
                  <View
                    style={[
                      styles.stepDot,
                      done && styles.stepDotDone,
                      active && styles.stepDotActive,
                    ]}
                  >
                    {done ? (
                      <Ionicons
                        name="checkmark"
                        size={elder.active ? 17 : 13}
                        color="#fff"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.stepNum,
                          elder.active && { fontSize: 16 * elder.f },
                        ]}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepLabel,
                      (done || active) && styles.stepLabelActive,
                      elder.active && { fontSize: 17 * elder.f },
                    ]}
                  >
                    {s.label}
                  </Text>
                  {active && (
                    <Animated.View
                      style={[styles.activeDot, { opacity: glowOpacity }]}
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1 },
  cancel: { position: "absolute", top: 56, right: 20, padding: 8, zIndex: 10 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 28,
  },

  iconWrap: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  glow: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    opacity: 0.15,
  },
  spinnerRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: Colors.primary,
    borderRightColor: "rgba(255,179,138,0.4)",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.cardLight,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: Colors.textLight, marginTop: -8 },

  steps: { gap: 10, width: "100%", marginTop: 8 },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepCardActive: {
    backgroundColor: "#fff3e8",
    borderColor: Colors.primary,
  },
  stepCardDone: {
    backgroundColor: Colors.safeBg,
    borderColor: "rgba(123,191,142,0.4)",
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.safe },
  stepNum: { fontSize: 13, fontWeight: "700", color: Colors.textMuted },
  stepLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  stepLabelActive: { color: Colors.text },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
