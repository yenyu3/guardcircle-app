import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";

const BG = "#E97A7A";
const CREAM = "#FFF5E6";

export default function ResultHighScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "ResultHigh">>();
  const { scamType, riskFactors, summary } = route.params;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        {/* Content */}
        <View style={styles.center}>
          {/* Shield icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="shield" size={80} color={CREAM} />
            <View style={styles.iconOverlay}>
              <Text style={styles.iconExclaim}>!</Text>
            </View>
          </View>

          <Text style={styles.title}>危險</Text>
          <Text style={styles.desc}>
            {summary || `這個訊息要求你${scamType}，\n很可能是詐騙`}
          </Text>

          {riskFactors.length > 0 && (
            <View style={styles.factorsWrap}>
              {riskFactors.slice(0, 2).map((f, i) => (
                <View key={i} style={styles.factorRow}>
                  <View style={styles.dot} />
                  <Text style={styles.factorText}>{f}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Main")}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: BG }]}>請勿轉帳</Text>
          </TouchableOpacity>

          <View style={styles.notifyRow}>
            <Ionicons
              name="information-circle"
              size={16}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.notifyText}>已通知家人，請等待協助</Text>
          </View>
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

  iconWrap: {
    width: 128,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconOverlay: { position: "absolute", top: 28, alignItems: "center" },
  iconExclaim: { fontSize: 52, fontWeight: "900", color: BG, lineHeight: 60 },

  title: { fontSize: 56, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  desc: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 30,
    opacity: 0.95,
  },

  factorsWrap: { gap: 10, alignSelf: "stretch", marginTop: 8 },
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

  notifyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  notifyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
});
