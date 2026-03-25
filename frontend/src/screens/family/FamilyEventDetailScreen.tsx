import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ResizeMode, Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { RootStackParamList } from "../../navigation";
import { useAppStore } from "../../store";
import { Colors, Radius, Shadow } from "../../theme";

const DS = {
  primary: "#89502e",
  onSurface: "#1f1b12",
  onSurfaceVariant: "#52443c",
  card: "#fcf2e3",
  cardLight: "#fffdf9",
  surface: "#ebe1d3",
  outline: "#d7c2b9",
};

const RISK_CONFIG = {
  high: { color: Colors.danger, icon: "warning" as const, label: "高風險威脅" },
  medium: {
    color: Colors.warning,
    icon: "alert-circle" as const,
    label: "中度風險",
  },
  safe: {
    color: Colors.safe,
    icon: "checkmark-circle" as const,
    label: "安全無虞",
  },
};

const RADIUS = 80;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = (RADIUS + STROKE) * 2 + 4;

function RiskGauge({ score, color }: { score: number; color: string }) {
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  return (
    <View
      style={{
        width: SIZE,
        height: SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={SIZE} height={SIZE} style={{ position: "absolute" }}>
        {/* Track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={DS.outline}
          strokeWidth={STROKE}
          fill="transparent"
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
        {/* Progress */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={color}
          strokeWidth={STROKE}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={[styles.gaugeScore, { color }]}>{score}</Text>
        <Text style={styles.gaugeLabel}>RISK SCORE</Text>
      </View>
    </View>
  );
}

export default function FamilyEventDetailScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "FamilyEventDetail">>();
  const { currentUser, events } = useAppStore();
  const event = events.find((e) => e.id === route.params.eventId) || events[0];
  const [blurred, setBlurred] = useState(true);
  const risk = RISK_CONFIG[event.riskLevel];
  const score = event.riskScore ?? 0;

  async function handleCall165() {
    const url = "tel:165";
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("無法撥號", "請手動撥打 165 反詐騙專線");
    }
  }

  async function handleShareEvidence() {
    const riskLabel = risk.label;
    const factorsHtml = event.riskFactors
      .map(
        (f, i) => `
      <div class="factor-row">
        <div class="factor-num">${i + 1}</div>
        <div class="factor-text">${f}</div>
      </div>`,
      )
      .join("");

    let inputContentHtml = `<div class="input-box">${event.input}</div>`;
    if (event.imageUri) {
      try {
        const base64 = await FileSystem.readAsStringAsync(event.imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ext = event.imageUri.split(".").pop()?.toLowerCase() ?? "jpeg";
        const mime =
          ext === "png"
            ? "image/png"
            : ext === "gif"
              ? "image/gif"
              : "image/jpeg";
        inputContentHtml = `<img src="data:${mime};base64,${base64}" style="max-width:100%;border-radius:8px;" />`;
      } catch {
        // 讀取失敗時 fallback 顯示檔名
      }
    }

    // SVG gauge: r=54, circumference≈339.3
    const R = 54,
      SW = 9;
    const CIRC = 2 * Math.PI * R;
    const dashOffset = CIRC - (score / 100) * CIRC;
    const svgSize = (R + SW) * 2 + 4;

    const html = `
      <!DOCTYPE html>
      <html lang="zh-TW">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { margin: 18mm 14mm; size: A4; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
            background: #fff8f1; color: #1f1b12;
            max-width: 560px; margin: 0 auto; padding: 0 4px;
          }

          /* ── top bar ── */
          .top-bar {
            background: #89502e; border-radius: 14px;
            padding: 18px 24px 14px; margin-bottom: 18px;
            display: flex; align-items: center; justify-content: space-between;
          }
          .top-bar-left .badge {
            font-size: 9px; font-weight: 800; letter-spacing: 2px;
            color: #ffcfaa; margin-bottom: 4px;
          }
          .top-bar-left .title { font-size: 20px; font-weight: 900; color: #fff; }
          .top-bar-left .sub   { font-size: 11px; color: #ffcfaa; margin-top: 3px; }
          .top-bar-right svg   { display: block; }

          /* ── hero section ── */
          .hero {
            background: #fcf2e3; border-radius: 14px;
            padding: 24px 20px 20px; margin-bottom: 14px;
            text-align: center; border: 1px solid #d7c2b9;
          }
          .hero svg { display: block; margin: 0 auto 14px; }
          .risk-pill {
            display: inline-block; padding: 5px 18px;
            border-radius: 999px; font-size: 13px; font-weight: 800;
            color: ${risk.color};
            background: ${risk.color}22;
            border: 1.5px solid ${risk.color}44;
            margin-bottom: 10px;
          }
          .scam-type { font-size: 22px; font-weight: 800; color: #1f1b12; margin-bottom: 10px; }
          .meta-row {
            display: flex; justify-content: center; gap: 16px;
            font-size: 12px; color: #52443c; font-weight: 500;
          }
          .meta-row span { display: flex; align-items: center; gap: 4px; }
          .meta-dot { width: 3px; height: 3px; border-radius: 50%; background: #d7c2b9; display: inline-block; }

          /* ── cards ── */
          .card {
            background: #f6edde; border-radius: 14px;
            padding: 18px 20px; margin-bottom: 14px;
            border: 1px solid #d7c2b944;
          }
          .card-title {
            font-size: 14px; font-weight: 700; color: #1f1b12;
            padding-bottom: 10px; margin-bottom: 12px;
            border-bottom: 1px solid #d7c2b9;
            display: flex; align-items: center; gap: 7px;
          }
          .card-body { font-size: 13px; color: #52443c; line-height: 1.85; }

          /* input box */
          .input-box {
            background: #fffdf9; border-radius: 12px;
            padding: 14px 16px;
            border: 2px dashed #89502e33;
            font-size: 13px; color: #52443c;
            line-height: 1.75; font-style: italic;
            word-break: break-all;
          }
          .input-box img { max-width: 100%; border-radius: 8px; display: block; }

          /* tags */
          .tag-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 12px; }
          .tag {
            padding: 4px 12px; background: #ebe1d3;
            border-radius: 999px; font-size: 11px;
            font-weight: 700; color: #52443c;
            border: 1px solid #89502e1a;
          }

          /* factor rows */
          .factor-row {
            display: flex; align-items: center; gap: 10px;
            background: #ebe1d3; border-radius: 8px;
            padding: 9px 12px; margin-bottom: 6px;
          }
          .factor-num {
            min-width: 24px; height: 24px; border-radius: 12px;
            background: ${risk.color}; color: #fff;
            font-size: 11px; font-weight: 800;
            display: flex; align-items: center; justify-content: center;
          }
          .factor-text { font-size: 13px; color: #1f1b12; }

          /* footer */
          .footer {
            text-align: center; font-size: 11px; color: #89502e;
            margin-top: 20px; padding-top: 14px;
            border-top: 1px solid #d7c2b9;
          }
        </style>
      </head>
      <body>

        <!-- top bar -->
        <div class="top-bar">
          <div class="top-bar-left">
            <div class="badge">GUARDCIRCLE &bull; 事件證據包</div>
            <div class="title">${event.scamType}</div>
            <div class="sub">生成時間：${new Date().toLocaleString("zh-TW", { hour12: false })}</div>
          </div>
        </div>

        <!-- hero: gauge + risk pill + scam type + meta -->
        <div class="hero">
          <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
            <circle cx="${svgSize / 2}" cy="${svgSize / 2}" r="${R}"
              stroke="#d7c2b9" stroke-width="${SW}" fill="none"
              stroke-linecap="round"
              transform="rotate(-90 ${svgSize / 2} ${svgSize / 2})" />
            <circle cx="${svgSize / 2}" cy="${svgSize / 2}" r="${R}"
              stroke="${risk.color}" stroke-width="${SW}" fill="none"
              stroke-linecap="round"
              stroke-dasharray="${CIRC.toFixed(2)}"
              stroke-dashoffset="${dashOffset.toFixed(2)}"
              transform="rotate(-90 ${svgSize / 2} ${svgSize / 2})" />
            <text x="${svgSize / 2}" y="${svgSize / 2 - 4}"
              text-anchor="middle" dominant-baseline="middle"
              font-size="36" font-weight="900" fill="${risk.color}">${score}</text>
            <text x="${svgSize / 2}" y="${svgSize / 2 + 22}"
              text-anchor="middle"
              font-size="9" font-weight="700" fill="#52443c" letter-spacing="1.5">RISK SCORE</text>
          </svg>

          <div class="risk-pill">${riskLabel}</div>
          <div class="scam-type">${event.scamType}</div>
          <div class="meta-row">
            <span>👤 ${event.userNickname}</span>
            <span class="meta-dot"></span>
            <span>🕐 ${event.createdAt}</span>
          </div>
        </div>

        <!-- 原始通訊內容 -->
        <div class="card">
          <div class="card-title">💬 原始通訊內容</div>
          <div class="input-box">${inputContentHtml}</div>
        </div>

        <!-- AI 分析結論 -->
        <div class="card">
          <div class="card-title">✨ AI 分析結論</div>
          <div class="card-body">${event.summary}</div>
          ${
            event.riskFactors.length > 0
              ? `
          <div class="tag-row">
            ${event.riskFactors.map((f) => `<span class="tag">#${f}</span>`).join("")}
          </div>`
              : ""
          }
        </div>

        <!-- 風險因子 -->
        ${
          event.riskFactors.length > 0
            ? `
        <div class="card">
          <div class="card-title">🚨 風險因子</div>
          ${factorsHtml}
        </div>`
            : ""
        }

        <div class="footer">如有疑慮請撥打 165 反詐騙專線 &nbsp;&bull;&nbsp; GuardCircle 守護圈</div>
      </body>
      </html>`;

    try {
      const { uri: tmpUri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      const filename = `GuardCircle_${event.scamType}_${Date.now()}.pdf`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.moveAsync({ from: tmpUri, to: destUri });
      const uri = destUri;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `GuardCircle 事件證據包 — ${event.scamType}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("證據包已生成", `PDF 已儲存至：${uri}`);
      }
    } catch {
      Alert.alert("生成失敗", "請稍後再試");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={DS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>事件分析報告</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. 風險視覺化 ── */}
        <View style={styles.heroSection}>
          <RiskGauge score={score} color={risk.color} />

          <View
            style={[
              styles.riskPill,
              {
                backgroundColor: risk.color + "22",
                borderColor: risk.color + "44",
              },
            ]}
          >
            <Ionicons name={risk.icon} size={14} color={risk.color} />
            <Text style={[styles.riskPillText, { color: risk.color }]}>
              {risk.label}
            </Text>
          </View>

          <Text style={styles.scamTypeTitle}>{event.scamType}</Text>

          {/* Meta bar */}
          <View style={styles.metaBar}>
            <Ionicons
              name="person-circle-outline"
              size={14}
              color={DS.onSurfaceVariant}
            />
            <Text style={styles.metaText}>{event.userNickname}</Text>
            <View style={styles.metaDot} />
            <Ionicons
              name="time-outline"
              size={14}
              color={DS.onSurfaceVariant}
            />
            <Text style={styles.metaText}>{event.createdAt}</Text>
          </View>
        </View>

        {/* ── 2. 原始通訊內容 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeader}>
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color={DS.onSurfaceVariant}
              />
              <Text style={styles.cardTitle}>原始通訊內容</Text>
            </View>
            {event.type === "image" && (
              <TouchableOpacity
                onPress={() => setBlurred(!blurred)}
                style={styles.blurBtn}
              >
                <Text style={styles.blurBtnText}>
                  {blurred ? "顯示原圖" : "模糊處理"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View
            style={[
              styles.inputBox,
              blurred && event.type === "image" && styles.blurred,
            ]}
          >
            {event.imageUri ? (
              <Image
                source={{ uri: event.imageUri }}
                style={styles.inputImage}
                resizeMode="contain"
              />
            ) : event.attachmentUri && (event.type as string) === "video" ? (
              <Video
                source={{ uri: event.attachmentUri }}
                style={styles.inputImage}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
              />
            ) : event.attachmentUri && (event.type as string) === "file" ? (
              <View style={styles.filePreview}>
                <Ionicons name="document-text" size={40} color={DS.primary} />
                <Text style={styles.filePreviewName} numberOfLines={2}>
                  {event.input}
                </Text>
              </View>
            ) : (
              <Text style={styles.inputText}>{event.input}</Text>
            )}
          </View>
        </View>

        {/* ── 3. AI 分析結論 ── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="sparkles" size={20} color={DS.primary} />
            <Text style={styles.cardTitle}>AI 分析結論</Text>
          </View>
          <Text style={styles.cardBody}>{event.summary}</Text>
          {event.riskFactors.length > 0 && (
            <View style={styles.tagRow}>
              {event.riskFactors.map((f, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>#{f}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {/* ── 行動按鈕 ── */}
        {currentUser.role === "guardian" && (
          <Pressable
            onPress={() => Alert.alert("已傳送感謝給守門人")}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={[DS.primary, "#ffb38a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientBtn}
            >
              <Ionicons name="heart" size={18} color="#fff" />
              <Text style={styles.gradientBtnText}>感謝家人的即時守護</Text>
            </LinearGradient>
          </Pressable>
        )}
        {currentUser.role === "gatekeeper" && event.riskLevel !== "safe" && (
          <View style={styles.btnRow}>
            <Pressable
              onPress={handleCall165}
              style={({ pressed }) => [
                { opacity: pressed ? 0.85 : 1, flex: 1 },
              ]}
            >
              <LinearGradient
                colors={[DS.primary, "#ffb38a"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtn}
              >
                <Ionicons name="call-outline" size={16} color="#fff" />
                <Text style={styles.gradientBtnText}>回報 165</Text>
              </LinearGradient>
            </Pressable>
            <TouchableOpacity
              style={[styles.outlineBtn, { flex: 1 }]}
              onPress={handleShareEvidence}
              activeOpacity={0.8}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={DS.primary}
              />
              <Text style={styles.outlineBtnText}>生成證據包</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: DS.primary },
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
    gap: 20,
  },

  // Hero
  heroSection: { alignItems: "center", gap: 14, paddingVertical: 8 },
  gaugeCenter: { alignItems: "center", gap: 2 },
  gaugeScore: { fontSize: 48, fontWeight: "900", lineHeight: 54 },
  gaugeLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: DS.onSurfaceVariant,
    letterSpacing: 1.5,
  },

  riskPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  riskPillText: { fontSize: 18, fontWeight: "800" },

  scamTypeTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: DS.onSurface,
    letterSpacing: -0.5,
    textAlign: "center",
  },

  metaBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: { fontSize: 13, fontWeight: "500", color: DS.onSurfaceVariant },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: DS.outline,
  },

  // Cards
  card: {
    backgroundColor: "#f6edde",
    borderRadius: Radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: "#d7c2b926",
    gap: 14,
    ...Shadow.card,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: "700", color: DS.onSurface },
  cardBody: { fontSize: 15, color: DS.onSurfaceVariant, lineHeight: 26 },

  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.white + "99",
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: DS.primary + "1A",
  },
  tagText: { fontSize: 12, fontWeight: "700", color: DS.onSurfaceVariant },

  blurBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: DS.surface,
    borderRadius: Radius.full,
  },
  blurBtnText: { fontSize: 12, fontWeight: "600", color: DS.primary },

  inputBox: {
    backgroundColor: Colors.bg,
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: DS.primary + "33",
  },
  blurred: { opacity: 0.08 },
  inputImage: { width: "100%", height: 220, borderRadius: 12 },
  inputText: {
    fontSize: 14,
    color: DS.onSurfaceVariant,
    lineHeight: 22,
    fontStyle: "italic",
  },
  filePreview: { alignItems: "center", gap: 10, paddingVertical: 16 },
  filePreviewName: {
    fontSize: 13,
    color: DS.onSurfaceVariant,
    textAlign: "center",
    fontWeight: "600",
  },

  btnRow: { flexDirection: "row", gap: 12 },
  gradientBtn: {
    borderRadius: Radius.full,
    paddingVertical: 16,
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
  gradientBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  outlineBtn: {
    borderRadius: Radius.full,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: DS.primary,
  },
  outlineBtnText: { color: DS.primary, fontSize: 15, fontWeight: "700" },
});
