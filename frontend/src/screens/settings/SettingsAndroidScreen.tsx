// 通知授權設定頁面
import React, { useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius } from "../../theme";
import Header from "../../components/Header";
import Card from "../../components/Card";
import Button from "../../components/Button";

export default function SettingsAndroidScreen() {
  const navigation = useNavigation();
  const [granted, setGranted] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="通知授權設定" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Card style={styles.statusCard}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: granted ? Colors.safe : Colors.warning },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>通知存取權限</Text>
            <Text
              style={[
                styles.statusValue,
                { color: granted ? Colors.safe : Colors.warning },
              ]}
            >
              {granted ? "已授權" : "未授權"}
            </Text>
          </View>
          <Ionicons
            name={granted ? "checkmark-circle" : "alert-circle"}
            size={28}
            color={granted ? Colors.safe : Colors.warning}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>用途說明</Text>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark" size={18} color={Colors.safe} />
            <Text style={styles.infoText}>讀取通知文字進行本機詐騙分析</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="trash" size={18} color={Colors.safe} />
            <Text style={styles.infoText}>
              分析後本機立即刪除，不上傳至伺服器
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="lock-closed" size={18} color={Colors.safe} />
            <Text style={styles.infoText}>僅分析，不儲存通知原文</Text>
          </View>
        </Card>

        <View style={styles.actions}>
          {!granted ? (
            <Button
              title="前往系統設定授權"
              onPress={() => {
                Alert.alert("前往設定");
                setGranted(true);
              }}
              size="large"
            />
          ) : (
            <Button
              title="撤銷授權"
              onPress={() =>
                Alert.alert(
                  "撤銷授權",
                  "撤銷後將無法自動偵測通知中的詐騙訊息",
                  [
                    { text: "取消" },
                    {
                      text: "撤銷",
                      style: "destructive",
                      onPress: () => setGranted(false),
                    },
                  ],
                )
              }
              variant="secondary"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, gap: 14 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusTitle: { fontSize: 14, color: Colors.textLight },
  statusValue: { fontSize: 18, fontWeight: "700" },
  section: {},
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  infoText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },
  actions: {},
});
