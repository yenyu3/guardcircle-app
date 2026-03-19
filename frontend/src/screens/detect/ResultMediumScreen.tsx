import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../../navigation";

const THEME = {
  bg: "#B89A6A",
  iconBg: "rgba(255,255,255,0.15)",
  iconColor: "#fff",
  primaryBtn: "#fff",
  primaryBtnText: "#B89A6A",
  outlineBtnBorder: "rgba(255,255,255,0.5)",
  outlineBtnText: "#fff",
  text: "#fff",
  textSub: "rgba(255,255,255,0.75)",
};

export default function ResultMediumScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle" size={52} color={THEME.iconColor} />
          </View>

          <Text style={styles.title}>注意</Text>

          <Text style={styles.desc}>這個內容有可疑特徵，請先確認再行動</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => Alert.alert("已通知家人", "家人會盡快回覆你")}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>聯絡家人確認</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => Linking.openURL("tel:165")}
            activeOpacity={0.85}
          >
            <Text style={styles.outlineBtnText}>撥打165反詐騙專線</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: THEME.iconBg,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 28,
  },
  title: {
    fontSize: 40,
    fontWeight: "900",
    color: THEME.text,
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 10,
  },
  desc: {
    fontSize: 16,
    fontWeight: "500",
    color: THEME.textSub,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 36,
  },
  primaryBtn: {
    backgroundColor: THEME.primaryBtn,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    alignSelf: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: THEME.primaryBtnText,
  },
  outlineBtn: {
    borderWidth: 2,
    borderColor: THEME.outlineBtnBorder,
    borderRadius: 999,
    paddingVertical: 18,
    alignItems: "center",
    alignSelf: "stretch",
  },
  outlineBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: THEME.outlineBtnText,
  },
});
