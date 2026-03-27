import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Radius, Shadow } from "../theme";

const DS = {
  primary: "#89502e",
  primaryContainer: "#ffb38a",
  secondary: "#6e5b45",
  onSurface: "#1f1b12",
  onSurfaceVariant: "#52443c",
  surfaceContainerLow: "#fcf2e3",
  surfaceContainerHighest: "#ebe1d3",
  outlineVariant: "#d7c2b9",
};

const BRIEF = {
  tag: "緊急快報",
  date: new Date().toLocaleDateString("sv"),
  source: "新聞來源：ETtoday新聞雲",
  title: "日本爆發新型銀行詐騙！假客服結合AI語音釣魚　兩天逾百人受害",
  summary:
    "日本近期出現結合 AI 技術的新型銀行詐騙，透過語音釣魚（voice phishing）快速擴散，短時間內即造成大量通報案例。詐騙集團主要鎖定中小企業的總機或第一線接聽人員，利用其負責轉接電話的特性作為突破口。整體手法為高度擬真的複合式詐騙流程：先以假冒銀行的自動語音通知網銀需更新資料，再轉接至真人或 AI 模擬的客服人員建立信任，接著誘導提供電子郵件並寄送含惡意連結的釣魚信件，引導受害者登入仿冒網銀網站，最終竊取帳號密碼並進行資金轉移。與過去單一釣魚郵件不同，此類詐騙加入即時互動，使受害者在對話過程中逐步降低警戒。另一方面，AI 技術大幅提升語音與文字的自然度與真實性，使傳統透過語氣、用詞錯誤辨識詐騙的方式逐漸失效，進一步提高詐騙成功率與危害性。",
  keywords: ["AI 語音", "語音釣魚", "銀行客服"],
};

export default function ScamBriefScreen() {
  const navigation = useNavigation();

  const handleShare = async () => {
    await Share.share({
      title: BRIEF.title,
      message: `【今日詐騙快報】${BRIEF.date}\n\n${BRIEF.title}\n\n${BRIEF.source}\n\n${BRIEF.summary}\n\n⚠️ 三大注意關鍵字：\n${BRIEF.keywords.map((kw, i) => `${i + 1}. ${kw}`).join("\n")}`,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={DS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>今日詐騙快報</Text>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={22} color={DS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text style={styles.title}>{BRIEF.title}</Text>

        {/* Meta */}
        <View style={styles.metaRow}>
          <View style={styles.tagPill}>
            <Text style={styles.tagText}>{BRIEF.tag}</Text>
          </View>
          <Text style={styles.metaDate}>{BRIEF.date}</Text>
        </View>
        <Text style={styles.metaSource}>{BRIEF.source}</Text>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="flash" size={20} color={DS.primary} />
            <Text style={styles.summaryTitle}>快報摘要</Text>
          </View>
          <Text style={styles.summaryBody}>{BRIEF.summary}</Text>
        </View>

        {/* Keywords */}
        <View style={styles.kwSection}>
          <View style={styles.pointsSectionHeader}>
            <View style={styles.pointsAccent} />
            <Text style={styles.pointsSectionTitle}>關鍵字注意</Text>
          </View>
          <View style={styles.kwRow}>
            {BRIEF.keywords.map((kw, i) => (
              <View key={i} style={styles.kwChip}>
                <Text style={styles.kwNum}>{i + 1}</Text>
                <Text style={styles.kwText}>{kw}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <Pressable
          onPress={handleShare}
          style={({ pressed }) => [
            { opacity: pressed ? 0.85 : 1, marginTop: 32 },
          ]}
        >
          <LinearGradient
            colors={[DS.primary, DS.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareBtn}
          >
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>分享給家人</Text>
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bg,
    borderBottomWidth: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: DS.primary },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  container: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 100 : 48 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
    flexWrap: "wrap",
  },
  tagPill: {
    backgroundColor: "rgba(137,80,46,0.15)",
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(137,80,46,0.25)",
  },
  tagText: {
    fontSize: 11,
    fontWeight: "800",
    color: DS.primary,
    letterSpacing: 1,
  },
  metaDate: { fontSize: 13, fontWeight: "500", color: DS.onSurfaceVariant },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.outlineVariant,
  },
  metaSource: {
    fontSize: 12,
    color: DS.onSurfaceVariant,
    marginTop: 6,
    marginBottom: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: "800",
    color: DS.onSurface,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginTop: 16,
    marginBottom: 12,
  },

  summaryCard: {
    backgroundColor: DS.surfaceContainerLow,
    borderRadius: Radius.lg,
    padding: 24,
    marginBottom: 32,
    gap: 12,
  },
  summaryHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  summaryTitle: { fontSize: 20, fontWeight: "700", color: DS.primary },
  summaryBody: { fontSize: 15, color: DS.onSurfaceVariant, lineHeight: 26 },

  kwSection: { gap: 12 },
  pointsSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  pointsAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
    backgroundColor: DS.primary,
  },
  pointsSectionTitle: { fontSize: 20, fontWeight: "700", color: DS.onSurface },
  kwRow: { flexDirection: "column", gap: 12 },
  kwChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: DS.surfaceContainerHighest,
    borderRadius: Radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: DS.outlineVariant,
  },
  kwNum: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: DS.primary,
    textAlign: "center",
    lineHeight: 34,
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
  kwText: { fontSize: 18, fontWeight: "700", color: DS.onSurface },

  shareBtn: {
    borderRadius: Radius.lg,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Shadow.strong,
  },
  shareBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
