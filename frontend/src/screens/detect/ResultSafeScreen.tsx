import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";

const BG = "#7BBF8E";
const CREAM = "#FFF5E6";

export default function ResultSafeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={52} color={BG} />
          </View>
          <Text style={styles.title}>安全</Text>
          <Text style={styles.desc}>如果還是不確定，{"\n"}可以詢問家人</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate("Main")}
            activeOpacity={0.85}
          >
            <Text style={[styles.primaryBtnText, { color: BG }]}>返回首頁</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => Alert.alert("已通知家人", "家人會盡快回覆你")}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>詢問家人</Text>
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
  title: { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: -1 },
  desc: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    lineHeight: 30,
    opacity: 0.95,
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
