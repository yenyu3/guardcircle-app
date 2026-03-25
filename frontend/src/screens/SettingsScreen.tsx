import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation";
import { useScrollRef } from "../navigation/ScrollRefContext";
import { initScamProtection } from "../services/android/NotificationMonitor";
import { useAppStore } from "../store";
import { Colors, Radius, Shadow } from "../theme";

const roleLabel = {
  guardian: "守護者",
  gatekeeper: "守門人",
  solver: "識破者",
};

const avatarMap: Record<string, any> = {
  guardian_female: require("../public/guardian_w.png"),
  guardian_male: require("../public/guardian_m.png"),
  gatekeeper_female: require("../public/gatekeeper_w.png"),
  gatekeeper_male: require("../public/gatekeeper_m.png"),
  solver_female: require("../public/solver_w.png"),
  solver_male: require("../public/solver_m.png"),
};

const menuItems = [
  { icon: "person-outline", label: "個人資料", screen: "SettingsProfile" },
  {
    icon: "notifications-outline",
    label: "通知提醒設定",
    screen: "SettingsAndroid",
  },
  {
    icon: "lock-closed-outline",
    label: "隱私與安全",
    screen: "SettingsPrivacy",
  },
  { icon: "options-outline", label: "進階設定", screen: "SettingsAdvanced" },
] as const;

export default function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, logout, elderMode, toggleElderMode } = useAppStore();
  const scrollRef = useRef<ScrollView>(null);
  const { register } = useScrollRef();

  // Android Notification Listener Status
  const [isNotificationListenerEnabled, setIsNotificationListenerEnabled] =
    useState(false);

  const checkNotificationPermission = async () => {
    if (Platform.OS !== "android") return;
    try {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
      );
      setIsNotificationListenerEnabled(granted);
    } catch (e) {
      console.log("Notification Listener Check Failed:", e);
    }
  };

  useEffect(() => {
    checkNotificationPermission();
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        checkNotificationPermission();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const toggleNotificationListener = async () => {
    if (Platform.OS !== "android") {
      Alert.alert("不支援", "主動防護功能僅支援 Android 裝置");
      return;
    }
    await initScamProtection();
    checkNotificationPermission();
  };

  useFocusEffect(
    React.useCallback(() => {
      register("Settings", scrollRef);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const gender =
    currentUser.gender === "female"
      ? "female"
      : currentUser.gender === "male"
        ? "male"
        : null;
  const avatarKey = gender ? `${currentUser.role}_${gender}` : null;
  const avatarSrc = avatarKey ? avatarMap[avatarKey] : null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={styles.profileSection}>
          {avatarSrc ? (
            <Image source={avatarSrc} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={44} color={Colors.primaryDark} />
            </View>
          )}
          <Text style={styles.nickname}>{currentUser.nickname}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{roleLabel[currentUser.role]}</Text>
          </View>
        </View>

        {/* 長輩模式（只在 guardian 顯示）*/}
        {currentUser.role === "guardian" && (
          <>
            <Text style={styles.sectionLabel}>無障礙</Text>
            <View style={[styles.menuCard, Shadow.card, { marginBottom: 28 }]}>
              <View style={styles.elderRow}>
                <View style={styles.iconWrap}>
                  <Ionicons
                    name="text-outline"
                    size={20}
                    color={Colors.primaryDark}
                  />
                </View>
                <View style={styles.elderTextWrap}>
                  <Text style={styles.menuLabel}>長輩模式</Text>
                  <Text style={styles.menuSub}>放大字體與按鈕，方便閱讀</Text>
                </View>
                <Switch
                  value={elderMode}
                  onValueChange={toggleElderMode}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>
          </>
        )}

        {/* Section label */}
        <Text style={styles.sectionLabel}>帳戶與安全</Text>

        {/* Menu card */}
        <View style={[styles.menuCard, Shadow.card]}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                i < menuItems.length - 1 && styles.menuBorder,
              ]}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={Colors.primaryDark}
                />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Android Active Protection */}
        {Platform.OS === "android" && (
          <>
            <Text style={styles.sectionLabel}>主動防護</Text>
            <View style={[styles.menuCard, Shadow.card, { marginBottom: 28 }]}>
              <View style={styles.elderRow}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: Colors.danger + "1A" },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={Colors.danger}
                  />
                </View>
                <View style={styles.elderTextWrap}>
                  <Text style={styles.menuLabel}>即時簡訊偵測</Text>
                  <Text style={styles.menuSub}>
                    分析收到的簡訊，攔截潛在詐騙
                  </Text>
                </View>
                <Switch
                  value={isNotificationListenerEnabled}
                  onValueChange={toggleNotificationListener}
                  trackColor={{ false: Colors.border, true: Colors.danger }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>
          </>
        )}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert("登出", "確定要登出嗎？", [
              { text: "取消" },
              {
                text: "登出",
                style: "destructive",
                onPress: () => {
                  logout();
                  navigation.replace("Register");
                },
              },
            ])
          }
        >
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>登出帳號</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { width: 36, alignItems: "flex-start" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },
  headerRight: { width: 36 },

  container: { paddingHorizontal: 20, paddingBottom: 40 },

  profileSection: { alignItems: "center", paddingVertical: 24, gap: 8 },
  avatarImg: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: Colors.white,
    ...Shadow.strong,
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.white,
    ...Shadow.strong,
  },
  nickname: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 4,
  },
  rolePill: {
    backgroundColor: Colors.primary + "33",
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  roleText: { fontSize: 13, fontWeight: "600", color: Colors.primaryDark },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 4,
  },

  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    overflow: "hidden",
    marginBottom: 28,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    minHeight: 64,
    gap: 14,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.bg },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: Colors.text },
  menuSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  elderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    minHeight: 64,
  },
  elderTextWrap: {
    flex: 1,
    justifyContent: "center",
    flexShrink: 1,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#FDDEDE",
    ...Shadow.card,
    marginBottom: 20,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: Colors.danger },
});
