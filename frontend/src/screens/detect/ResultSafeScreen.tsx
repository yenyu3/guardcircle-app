import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";
import { useElderStyle } from "../../hooks/useElderStyle";

const THEME = {
  bg: "#6FA882",
  iconBg: "rgba(255,255,255,0.15)",
  primaryBtn: "#fff",
  primaryBtnText: "#6FA882",
  outlineBtnBorder: "rgba(255,255,255,0.5)",
  outlineBtnText: "#fff",
  text: "#fff",
  textSub: "rgba(255,255,255,0.75)",
};

export default function ResultSafeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResultSafe">>();
  const summary = route.params?.summary;
  const s = useElderStyle();

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
            <Ionicons name="checkmark-circle" size={52} color="#fff" />
          </View>

          <Text style={[styles.title, s.active && { fontSize: 50 * s.f }]}>安全</Text>
          <Text style={[styles.desc, s.active && { fontSize: 19 * s.f, lineHeight: 28 * s.f }]}>{summary ?? '目前看起來安全，但仍建議保持警覺'}</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, s.active && { paddingVertical: 22 }]}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: "Main" }] })}
            activeOpacity={0.85}
          >
            <Ionicons name="home" size={s.active ? 22 : 18} color={THEME.primaryBtnText} style={{ marginRight: 6 }} />
            <Text style={[styles.primaryBtnText, s.active && { fontSize: 20 * s.f }]}>返回首頁</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, s.active && { paddingVertical: 22 }]}
            onPress={() => Alert.alert("已詢問家人確認", "家人會盡快回覆你")}
            activeOpacity={0.85}
          >
            <Ionicons name="people" size={s.active ? 22 : 18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={[styles.outlineBtnText, s.active && { fontSize: 20 * s.f }]}>詢問家人</Text>
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
  iconCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: THEME.iconBg, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", marginBottom: 28,
  },
  title: { fontSize: 40, fontWeight: "900", color: THEME.text, letterSpacing: -0.5, textAlign: "center", marginBottom: 10 },
  desc: { fontSize: 16, fontWeight: "500", color: THEME.textSub, textAlign: "center", lineHeight: 24, marginBottom: 32 },
  primaryBtn: {
    backgroundColor: THEME.primaryBtn, borderRadius: 999, paddingVertical: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "stretch", marginBottom: 12,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 12, elevation: 4,
  },
  primaryBtnText: { fontSize: 17, fontWeight: "800", color: THEME.primaryBtnText },
  outlineBtn: {
    borderWidth: 2, borderColor: THEME.outlineBtnBorder, borderRadius: 999,
    paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", alignSelf: "stretch",
  },
  outlineBtnText: { fontSize: 17, fontWeight: "800", color: THEME.outlineBtnText },
});
