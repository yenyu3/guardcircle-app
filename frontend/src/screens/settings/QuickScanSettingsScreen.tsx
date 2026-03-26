import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Platform,
  Alert,
  AppState,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Shadow } from "../../theme";
import Header from "../../components/Header";
import Card from "../../components/Card";
import Button from "../../components/Button";
import {
  canDrawOverlays,
  requestOverlayPermission,
  startOverlay,
  stopOverlay,
  isOverlayActive,
  quickScanPlatform,
} from "../../services/QuickScan";

export default function QuickScanSettingsScreen() {
  const navigation = useNavigation();
  const isAndroid = Platform.OS === "android";
  const [overlayPermission, setOverlayPermission] = useState(false);
  const [overlayActive, setOverlayActive] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!isAndroid) return;
    const [perm, active] = await Promise.all([
      canDrawOverlays(),
      isOverlayActive(),
    ]);
    setOverlayPermission(perm);
    setOverlayActive(active && perm);
  }, [isAndroid]);

  useFocusEffect(
    useCallback(() => {
      checkStatus();
    }, [checkStatus])
  );

  // Re-check when app comes back from settings
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkStatus();
    });
    return () => sub.remove();
  }, [checkStatus]);

  const handleToggleOverlay = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        if (!overlayPermission) {
          Alert.alert(
            "需要懸浮視窗權限",
            "請在系統設定中允許 GuardCircle 顯示在其他應用程式上方",
            [
              { text: "取消" },
              {
                text: "前往設定",
                onPress: () => requestOverlayPermission(),
              },
            ]
          );
          setLoading(false);
          return;
        }
        const ok = await startOverlay();
        setOverlayActive(ok);
      } else {
        await stopOverlay();
        setOverlayActive(false);
      }
    } catch {
      Alert.alert("錯誤", "操作失敗，請重試");
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="快速掃描" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        {/* Android: Overlay Bubble */}
        {isAndroid && (
          <>
            <Card style={styles.statusCard}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: overlayActive
                      ? Colors.safe
                      : Colors.textMuted,
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusTitle}>懸浮掃描球</Text>
                <Text
                  style={[
                    styles.statusValue,
                    {
                      color: overlayActive ? Colors.safe : Colors.textMuted,
                    },
                  ]}
                >
                  {overlayActive ? "已啟用" : "未啟用"}
                </Text>
              </View>
              <Switch
                value={overlayActive}
                onValueChange={handleToggleOverlay}
                disabled={loading}
                trackColor={{ false: Colors.border, true: Colors.safe }}
                thumbColor={Colors.white}
              />
            </Card>

            {!overlayPermission && (
              <Card variant="warning" style={styles.permCard}>
                <View style={styles.permRow}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={Colors.warning}
                  />
                  <Text style={styles.permText}>
                    尚未授權「顯示在其他應用程式上方」權限
                  </Text>
                </View>
                <Button
                  title="前往授權"
                  onPress={() => requestOverlayPermission()}
                  size="normal"
                  variant="secondary"
                  style={{ marginTop: 12 }}
                />
              </Card>
            )}

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>使用說明</Text>
              {[
                {
                  icon: "ellipse",
                  text: "啟用後，畫面邊緣會出現懸浮掃描球",
                },
                {
                  icon: "scan",
                  text: "點擊掃描球，自動擷取當前畫面進行分析",
                },
                {
                  icon: "move",
                  text: "長按拖曳可移動掃描球位置",
                },
                {
                  icon: "shield-checkmark",
                  text: "AI 即時偵測畫面中的可疑詐騙內容",
                },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <Ionicons
                    name={item.icon as any}
                    size={18}
                    color={Colors.primaryDark}
                  />
                  <Text style={styles.infoText}>{item.text}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        {/* iOS: Share Extension */}
        {!isAndroid && (
          <>
            <Card style={styles.section}>
              <View style={styles.iosHeader}>
                <View style={styles.iosIconWrap}>
                  <Ionicons
                    name="share-outline"
                    size={28}
                    color={Colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.iosTitle}>分享表單掃描</Text>
                  <Text style={styles.iosSubtitle}>
                    已自動安裝，可直接使用
                  </Text>
                </View>
                <View style={[styles.statusDot, { backgroundColor: Colors.safe }]} />
              </View>
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>使用說明</Text>
              {[
                {
                  step: "1",
                  text: "在 LINE、Safari 等 App 中選取可疑訊息或網址",
                },
                {
                  step: "2",
                  text: "點擊「分享」按鈕，選擇「守護圈掃描」",
                },
                {
                  step: "3",
                  text: "內容會自動傳送到守護圈進行 AI 詐騙分析",
                },
              ].map((item, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{item.step}</Text>
                  </View>
                  <Text style={styles.stepText}>{item.text}</Text>
                </View>
              ))}
            </Card>

            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>支援的 App</Text>
              <View style={styles.appRow}>
                {["LINE", "Safari", "訊息", "Mail", "Chrome"].map((app) => (
                  <View key={app} style={styles.appChip}>
                    <Text style={styles.appChipText}>{app}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </>
        )}

        {/* Privacy note */}
        <Card style={styles.section}>
          <View style={styles.infoRow}>
            <Ionicons name="lock-closed" size={18} color={Colors.safe} />
            <Text style={styles.infoText}>
              所有分析皆在本機執行，不上傳任何畫面或訊息至伺服器
            </Text>
          </View>
        </Card>
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

  permCard: {},
  permRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  permText: { fontSize: 14, color: Colors.text, flex: 1 },

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

  // iOS
  iosHeader: { flexDirection: "row", alignItems: "center", gap: 14 },
  iosIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cardLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iosTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  iosSubtitle: { fontSize: 13, color: Colors.safe, fontWeight: "600", marginTop: 2 },

  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  stepText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },

  appRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  appChip: {
    backgroundColor: Colors.cardLight,
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  appChipText: { fontSize: 13, fontWeight: "600", color: Colors.primaryDark },
});
