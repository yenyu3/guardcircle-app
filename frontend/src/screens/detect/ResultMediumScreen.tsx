import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";

const BG = "#F5C842";
const CREAM = "#FFF5E6";

export default function ResultMediumScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResultMedium">>();
  const { riskFactors, summary } = route.params;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning-outline" size={52} color={BG} />
          </View>
          <Text style={styles.title}>注意</Text>

          {riskFactors.length > 0 && (
            <View style={styles.factorsWrap}>
              {riskFactors.slice(0, 3).map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <View style={styles.dot} />
                  <Text style={styles.factorText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Alert.alert("已通知家人", "家人會盡快回覆你")}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: BG }]}>
              聯絡家人確認
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => Alert.alert("撥打 165")}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>撥打 165 反詐騙專線</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -1,
    lineHeight: 50,
  },
  factorsWrap: { gap: 10, alignSelf: "stretch", marginTop: 4 },
  factorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  factorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    opacity: 0.9,
    flex: 1,
  },
  actions: { gap: 14, paddingBottom: 8 },
  primaryBtn: {
    backgroundColor: CREAM,
    borderRadius: 999,
    paddingVertical: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: { fontSize: 22, fontWeight: "900" },
  outlineBtn: {
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 999,
    paddingVertical: 20,
    alignItems: "center",
  },
  outlineBtnText: { fontSize: 20, fontWeight: "900", color: "#fff" },
});
