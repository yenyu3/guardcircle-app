import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";

const THEME = {
  bg: "#B7791F",
  bgLight: "#D97706",
  iconBg: "rgba(255,255,255,0.15)",
  iconColor: "#fff",
  primaryBtn: "#fff",
  primaryBtnText: "#B7791F",
  outlineBtnBorder: "rgba(255,255,255,0.5)",
  outlineBtnText: "#fff",
  text: "#fff",
  textSub: "rgba(255,255,255,0.75)",
  factorBg: "rgba(255,255,255,0.12)",
  factorText: "rgba(255,255,255,0.9)",
  dot: "rgba(255,255,255,0.6)",
};

export default function ResultMediumScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResultMedium">>();
  const { riskFactors, summary } = route.params;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* ── Icon area ── */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={52} color={THEME.iconColor} />
          </View>
        </View>

        {/* ── Text area ── */}
        <View style={styles.textSection}>
          <Text style={styles.title}>請謹慎確認</Text>
          <Text style={styles.desc}>
            {summary || "偵測到可疑特徵，建議先向家人確認再行動"}
          </Text>
        </View>

        {/* ── Detail bullets ── */}
        {riskFactors.length > 0 && (
          <View style={styles.detailSection}>
            {riskFactors.slice(0, 3).map((f, i) => (
              <View key={i} style={styles.factorRow}>
                <View style={styles.dot} />
                <Text style={styles.factorText}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Spacer ── */}
        <View style={{ flex: 1 }} />

        {/* ── Actions ── */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Alert.alert("已通知家人", "家人會盡快回覆你")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>通知家人協助確認</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => navigation.navigate("Main")}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>返回首頁</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            如有疑慮，可撥打 165 反詐騙專線
          </Text>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  safe: { flex: 1, paddingHorizontal: 32, paddingTop: 48, paddingBottom: 32 },

  // Icon
  iconSection: { alignItems: "center", marginBottom: 32 },
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: THEME.iconBg,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)",
  },

  // Text
  textSection: { alignItems: "center", marginBottom: 24, gap: 12 },
  title: { fontSize: 36, fontWeight: "900", color: THEME.text, letterSpacing: -0.5, textAlign: "center" },
  desc: { fontSize: 16, fontWeight: "500", color: THEME.textSub, textAlign: "center", lineHeight: 24 },

  // Detail
  detailSection: {
    backgroundColor: THEME.factorBg,
    borderRadius: 16, padding: 20, gap: 12, marginBottom: 16,
  },
  factorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.dot },
  factorText: { fontSize: 14, fontWeight: "600", color: THEME.factorText, flex: 1 },

  // Actions
  actionSection: { gap: 16 },
  primaryBtn: {
    backgroundColor: THEME.primaryBtn, borderRadius: 999,
    paddingVertical: 18, alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  primaryBtnText: { fontSize: 17, fontWeight: "800", color: THEME.primaryBtnText },
  outlineBtn: {
    borderWidth: 2, borderColor: THEME.outlineBtnBorder,
    borderRadius: 999, paddingVertical: 18, alignItems: "center",
  },
  outlineBtnText: { fontSize: 17, fontWeight: "700", color: THEME.outlineBtnText },
  helperText: { fontSize: 13, color: THEME.textSub, textAlign: "center", fontWeight: "500" },
});
