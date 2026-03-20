import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "../../components/Header";
import { useAppStore } from "../../store";
import { Colors, Radius, Shadow } from "../../theme";
import { Role } from "../../types";

const DS = {
  bg: "#fff8f1",
  primary: "#89502e",
  primaryContainer: "#ffb38a",
  secondary: "#6e5b45",
  onSurface: "#1f1b12",
  outlineVariant: "#d7c2b9",
};

const roleLabel: Record<Role, string> = {
  guardian: "守護者",
  gatekeeper: "守門人",
  solver: "識破者",
};

const avatarMap: Record<string, any> = {
  guardian_female: require("../../public/guardian_w.png"),
  guardian_male: require("../../public/guardian_m.png"),
  gatekeeper_female: require("../../public/gatekeeper_w.png"),
  gatekeeper_male: require("../../public/gatekeeper_m.png"),
  solver_female: require("../../public/solver_w.png"),
  solver_male: require("../../public/solver_m.png"),
};

const roleCards: { role: Role; titleEn: string; quote: string; img: any }[] = [
  {
    role: "guardian",
    titleEn: "Guardian",
    quote: "「我希望家人協助我確認可疑訊息。」",
    img: require("../../public/guardian.png"),
  },
  {
    role: "gatekeeper",
    titleEn: "Gatekeeper",
    quote: "「我想保護家人，監控家人的安全狀態。」",
    img: require("../../public/gatekeeper.png"),
  },
  {
    role: "solver",
    titleEn: "Solver",
    quote: "「我想快速識破詐騙，了解最新詐騙手法。」",
    img: require("../../public/solver.png"),
  },
];

const genderLabel: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

export default function SettingsProfileScreen() {
  const navigation = useNavigation();
  const { currentUser, setUser, setRole } = useAppStore();

  const [nickname, setNickname] = useState(currentUser.nickname);
  const [roleModal, setRoleModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<Role>(currentUser.role);

  const screenHeight = Dimensions.get("window").height;
  const closeOffset = Math.max(380, screenHeight * 0.55);
  const dragCloseThreshold = Math.max(60, closeOffset * 0.16);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(closeOffset)).current;
  const handlePressAnim = useRef(new Animated.Value(0)).current;
  const currentSheetYRef = useRef(closeOffset);
  const dragStartRef = useRef(0);

  const gender =
    currentUser.gender === "female"
      ? "female"
      : currentUser.gender === "male"
        ? "male"
        : null;
  const avatarKey = gender ? `${currentUser.role}_${gender}` : null;
  const avatarSrc = avatarKey ? avatarMap[avatarKey] : null;

  const birthYear = currentUser.birthYear;
  const age = birthYear ? new Date().getFullYear() - birthYear : null;

  const handleSave = () => {
    setUser({ nickname });
    Alert.alert("已儲存");
    navigation.goBack();
  };

  const closeRoleSheet = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: closeOffset,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(handlePressAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setRoleModal(false);
      }
    });
  };

  const handleConfirmRole = () => {
    setRole(pendingRole);
    closeRoleSheet();
  };

  const openRoleSheet = () => {
    setPendingRole(currentUser.role);
    setRoleModal(true);
  };

  useEffect(() => {
    const sub = sheetTranslateY.addListener(({ value }) => {
      currentSheetYRef.current = value;
    });
    return () => {
      sheetTranslateY.removeListener(sub);
    };
  }, [sheetTranslateY]);

  useEffect(() => {
    if (!roleModal) {
      return;
    }

    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(closeOffset);

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, closeOffset, roleModal, sheetTranslateY]);

  const snapBackSheet = () => {
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(handlePressAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const isVerticalDrag =
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
          return (
            isVerticalDrag &&
            (gestureState.dy > 6 || currentSheetYRef.current > 0)
          );
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const isVerticalDrag =
            Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
          return (
            isVerticalDrag &&
            (gestureState.dy > 5 || currentSheetYRef.current > 0)
          );
        },
        onPanResponderGrant: () => {
          dragStartRef.current = currentSheetYRef.current;
          sheetTranslateY.stopAnimation((value) => {
            dragStartRef.current = value;
          });
          backdropOpacity.stopAnimation();
          Animated.timing(handlePressAnim, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderMove: (_, gestureState) => {
          const nextY = Math.max(0, dragStartRef.current + gestureState.dy);
          sheetTranslateY.setValue(nextY);
          const nextBackdrop = Math.max(0, 1 - nextY / (closeOffset * 0.8));
          backdropOpacity.setValue(Math.min(1, nextBackdrop));
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldClose =
            gestureState.dy > dragCloseThreshold || gestureState.vy > 0.5;
          if (shouldClose) {
            closeRoleSheet();
            return;
          }
          snapBackSheet();
        },
        onPanResponderTerminate: () => {
          snapBackSheet();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [
      backdropOpacity,
      closeOffset,
      dragCloseThreshold,
      handlePressAnim,
      sheetTranslateY,
    ],
  );

  const handleBarBackground = handlePressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [DS.outlineVariant, "#bda9a0"],
  });
  const handleBarScale = handlePressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="個人資料" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          {avatarSrc ? (
            <Image source={avatarSrc} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={44} color={Colors.primaryDark} />
            </View>
          )}
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>
              {roleLabel[currentUser.role]}
            </Text>
          </View>
        </View>

        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>基本資料</Text>

          <Text style={styles.label}>暱稱</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>電子郵件</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyText}>{currentUser.email || "—"}</Text>
          </View>

          <Text style={styles.label}>出生年份</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyText}>
              {birthYear ? `${birthYear} 年（${age} 歲）` : "—"}
            </Text>
          </View>

          <Text style={styles.label}>性別</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyText}>
              {currentUser.gender
                ? (genderLabel[currentUser.gender] ?? "—")
                : "—"}
            </Text>
          </View>
        </View>

        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>角色設定</Text>
          <View style={styles.roleRow}>
            <View>
              <Text style={styles.label}>目前角色</Text>
              <Text style={styles.roleValue}>
                {roleLabel[currentUser.role]}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeRoleBtn}
              onPress={openRoleSheet}
              activeOpacity={0.8}
            >
              <Text style={styles.changeRoleBtnText}>切換角色</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveBtnText}>儲存變更</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={roleModal}
        animationType="none"
        transparent
        onRequestClose={closeRoleSheet}
      >
        <View style={styles.modalContainer}>
          <Animated.View
            style={[styles.modalOverlay, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={closeRoleSheet}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.modalSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.modalDragZone}>
              <Animated.View
                style={[
                  styles.modalHandle,
                  {
                    backgroundColor: handleBarBackground,
                    transform: [{ scaleX: handleBarScale }],
                  },
                ]}
              />
              <Text style={styles.modalTitle}>選擇角色</Text>
              <Text style={styles.modalSub}>選擇最符合你的使用方式</Text>
            </View>

            <View style={styles.roleCards}>
              {roleCards.map((r) => {
                const active = pendingRole === r.role;
                return (
                  <TouchableOpacity
                    key={r.role}
                    style={[styles.roleCard, active && styles.roleCardActive]}
                    onPress={() => setPendingRole(r.role)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={r.img}
                      style={styles.roleCardImg}
                      resizeMode="cover"
                    />
                    {active && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    )}
                    <View style={styles.roleCardBody}>
                      <Text style={styles.roleCardTitle}>{r.titleEn}</Text>
                      <Text style={styles.roleCardQuote}>{r.quote}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmRole}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>確認</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 10 },
  avatarImg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: Colors.white,
    ...Shadow.strong,
  },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: Colors.white,
    ...Shadow.strong,
  },
  rolePill: {
    backgroundColor: Colors.primary + "33",
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  rolePillText: { fontSize: 13, fontWeight: "600", color: Colors.primaryDark },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  readonlyRow: {
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  readonlyText: { fontSize: 16, color: Colors.textLight },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  roleValue: { fontSize: 18, fontWeight: "700", color: Colors.text },
  changeRoleBtn: {
    backgroundColor: DS.primary + "1A",
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  changeRoleBtnText: { fontSize: 14, fontWeight: "600", color: DS.primary },

  saveBtn: {
    backgroundColor: DS.primary,
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
  modalSheet: {
    backgroundColor: DS.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 16,
  },
  modalDragZone: {
    paddingTop: 8,
    paddingBottom: 14,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.outlineVariant,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: DS.onSurface,
    marginBottom: 4,
  },
  modalSub: { fontSize: 14, color: DS.secondary, marginBottom: 20 },

  roleCards: { gap: 12, marginBottom: 24 },
  roleCard: {
    flexDirection: "row",
    height: 100,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    ...Shadow.card,
  },
  roleCardActive: { borderColor: DS.primaryContainer },
  roleCardImg: { width: 80, height: "100%" },
  checkBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  roleCardBody: { flex: 1, padding: 12, justifyContent: "center" },
  roleCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: DS.onSurface,
    marginBottom: 4,
  },
  roleCardQuote: { fontSize: 12, color: DS.secondary, lineHeight: 17 },

  confirmBtn: {
    backgroundColor: DS.primary,
    borderRadius: Radius.full,
    paddingVertical: 18,
    alignItems: "center",
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
