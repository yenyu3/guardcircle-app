import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";

const THEME = {
  bg: "#276749",
  iconBg: "rgba(255,255,255,0.15)",
  iconColor: "#fff",
  primaryBtn: "#fff",
  primaryBtnText: "#276749",
  outlineBtnBorder: "rgba(255,255,255,0.5)",
  outlineBtnText: "#fff",
  text: "#fff",
  textSub: "rgba(255,255,255,0.75)",
};

export default function ResultSafeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>

        {/* ── Icon area ── */}
        <View style={styles.iconSection}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={52} color={THEME.iconColor} />
          </View>
        </View>

        {/* ── Text area ── */}
        <View style={styles.textSection}>
          <Text style={styles.title}>看起來安全</Text>
          <Text style={styles.desc}>
            未偵測到明顯詐騙特徵{"\n"}如仍有疑慮，可詢問家人
          </Text>
        </View>

        {/* ── Spacer (no detail bullets for safe) ── */}
        <View style={{ flex: 1 }} />

        {/* ── Actions ── */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Main")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>返回首頁</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => Alert.alert("已通知家人", "家人會盡快回覆你")}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>詢問家人</Text>
          </TouchableOpacity>

          <Text style={styles.helperText}>
            守護圈持續為你監測
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
