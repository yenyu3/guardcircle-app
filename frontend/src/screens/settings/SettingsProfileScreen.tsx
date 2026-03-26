import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
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
import * as API from "../../api";
import { Colors, Radius, Shadow } from "../../theme";
import { Role } from "../../types";

const DS = {
  bg: "#fff8f1",
  surface: "#fcf2e3",
  inputBg: "#f1e7d8",
  primary: "#89502e",
  primaryContainer: "#ffb38a",
  secondary: "#6e5b45",
  onSurface: "#1f1b12",
  outline: "#85736b",
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
    titleEn: "守護者",
    quote: "「我希望家人協助我確認可疑訊息。」",
    img: require("../../public/guardian.png"),
  },
  {
    role: "gatekeeper",
    titleEn: "守門人",
    quote: "「我想保護家人，監控家人的安全狀態。」",
    img: require("../../public/gatekeeper.png"),
  },
  {
    role: "solver",
    titleEn: "識破者",
    quote: "「我想快速識破詐騙，了解最新詐騙手法。」",
    img: require("../../public/solver.png"),
  },
];

const genderLabel: Record<string, string> = {
  male: "男",
  female: "女",
  other: "其他",
};

function DropdownPicker({
  placeholder,
  value,
  options,
  onSelect,
}: {
  placeholder: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={14} color={DS.outline} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>{placeholder}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              style={{ maxHeight: 260 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, item === value && styles.pickerItemActive]}
                  onPress={() => { onSelect(item); setOpen(false); }}
                >
                  <Text style={[styles.pickerItemText, item === value && { color: DS.primary, fontWeight: "700" }]}>
                    {item}
                  </Text>
                  {item === value && <Ionicons name="checkmark" size={16} color={DS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
}
function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, "");
}

export default function SettingsProfileScreen() {
  const navigation = useNavigation();
  const { currentUser, setUser, setRole, apiPatchUser } = useAppStore();

  const [nickname, setNickname] = useState(currentUser.nickname);
  const [emergencyPhone, setEmergencyPhone] = useState(
    currentUser.emergencyPhone ? formatPhone(currentUser.emergencyPhone) : ""
  );

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const [birthYear, setBirthYear] = useState(currentUser.birthYear ? String(currentUser.birthYear) : "");
  const [birthMonth, setBirthMonth] = useState(currentUser.birthMonth ?? "");
  const [birthDay, setBirthDay] = useState(currentUser.birthDay ?? "");
  const daysInMonth = birthYear && birthMonth
    ? new Date(parseInt(birthYear), parseInt(birthMonth), 0).getDate() : 31;
  const days = Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, "0"));

  const [gender, setGender] = useState(
    currentUser.gender ? genderLabel[currentUser.gender] ?? "" : ""
  );

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

  const genderKey = currentUser.gender === "female" ? "female" : currentUser.gender === "male" ? "male" : null;
  const avatarKey = genderKey ? `${currentUser.role}_${genderKey}` : null;
  const avatarSrc = avatarKey ? avatarMap[avatarKey] : null;

  const handleSave = async () => {
    const genderMapped =
      gender === "男" ? "male" : gender === "女" ? "female" : gender === "其他" ? "other" : undefined;
    const birthday = birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth.padStart(2,'0')}-${birthDay.padStart(2,'0')}`
      : undefined;
    // 先更新本地 store
    setUser({
      nickname,
      emergencyPhone: stripPhone(emergencyPhone) || undefined,
      birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
      birthMonth: birthMonth || undefined,
      birthDay: birthDay || undefined,
      gender: genderMapped,
    });
    // 嘗試同步到後端
    try {
      const backendRole: API.BackendRole = pendingRole === 'solver' ? 'youth' : pendingRole;
      await apiPatchUser({
        nickname,
        contact_phone: stripPhone(emergencyPhone) || undefined,
        gender: genderMapped,
        birthday,
        role: backendRole,
      });
    } catch {
      // 後端不可用時僅更新本地，不影響使用者
    }
    Alert.alert("已儲存");
    navigation.goBack();
  };

  const closeRoleSheet = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: closeOffset, duration: 250, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(handlePressAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setRoleModal(false); });
  };

  const handleConfirmRole = () => { setRole(pendingRole); closeRoleSheet(); };
  const openRoleSheet = () => { setPendingRole(currentUser.role); setRoleModal(true); };

  useEffect(() => {
    const sub = sheetTranslateY.addListener(({ value }) => { currentSheetYRef.current = value; });
    return () => { sheetTranslateY.removeListener(sub); };
  }, [sheetTranslateY]);

  useEffect(() => {
    if (!roleModal) return;
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(closeOffset);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [backdropOpacity, closeOffset, roleModal, sheetTranslateY]);

  const snapBackSheet = () => {
    Animated.parallel([
      Animated.timing(sheetTranslateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(handlePressAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  };

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dy) > Math.abs(g.dx) && (g.dy > 6 || currentSheetYRef.current > 0),
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dy) > Math.abs(g.dx) && (g.dy > 5 || currentSheetYRef.current > 0),
        onPanResponderGrant: () => {
          dragStartRef.current = currentSheetYRef.current;
          sheetTranslateY.stopAnimation((v) => { dragStartRef.current = v; });
          backdropOpacity.stopAnimation();
          Animated.timing(handlePressAnim, { toValue: 1, duration: 120, useNativeDriver: true }).start();
        },
        onPanResponderMove: (_, g) => {
          const nextY = Math.max(0, dragStartRef.current + g.dy);
          sheetTranslateY.setValue(nextY);
          backdropOpacity.setValue(Math.min(1, Math.max(0, 1 - nextY / (closeOffset * 0.8))));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > dragCloseThreshold || g.vy > 0.5) { closeRoleSheet(); return; }
          snapBackSheet();
        },
        onPanResponderTerminate: () => snapBackSheet(),
        onPanResponderTerminationRequest: () => false,
      }),
    [backdropOpacity, closeOffset, dragCloseThreshold, handlePressAnim, sheetTranslateY],
  );

  const handleBarBackground = handlePressAnim.interpolate({ inputRange: [0, 1], outputRange: [DS.outlineVariant, "#bda9a0"] });
  const handleBarScale = handlePressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="個人資料" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          {avatarSrc ? (
            <Image source={avatarSrc} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={44} color={Colors.primaryDark} />
            </View>
          )}
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{roleLabel[currentUser.role]}</Text>
          </View>
        </View>

        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>基本資料</Text>

          {/* 手機號碼（唯讀） */}
          <Text style={styles.label}>手機號碼</Text>
          <View style={styles.readonlyRow}>
            <Text style={styles.readonlyText}>{currentUser.phone || "—"}</Text>
          </View>

          {/* 緊急連絡人手機號碼 */}
          <Text style={styles.label}>緊急連絡人手機號碼</Text>
          <TextInput
            style={styles.input}
            value={emergencyPhone}
            onChangeText={(t) => setEmergencyPhone(formatPhone(stripPhone(t)))}
            keyboardType="phone-pad"
            maxLength={12}
            placeholder="0912-345-678"
            placeholderTextColor={Colors.textMuted}
          />

          {/* 暱稱 / 性別 並排 */}
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>暱稱</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                maxLength={12}
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>性別</Text>
              <DropdownPicker
                placeholder="請選擇"
                value={gender}
                options={["男", "女", "其他"]}
                onSelect={setGender}
              />
            </View>
          </View>

          {/* 生日 */}
          <Text style={styles.label}>生日</Text>
          <View style={styles.birthRow}>
            <View style={{ flex: 2.5 }}>
              <DropdownPicker placeholder="年" value={birthYear} options={years} onSelect={setBirthYear} />
            </View>
            <View style={{ flex: 1.5 }}>
              <DropdownPicker placeholder="月" value={birthMonth} options={months} onSelect={setBirthMonth} />
            </View>
            <View style={{ flex: 1.5 }}>
              <DropdownPicker placeholder="日" value={birthDay} options={days} onSelect={setBirthDay} />
            </View>
          </View>
        </View>

        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>角色設定</Text>
          <View style={styles.roleRow}>
            <View>
              <Text style={styles.label}>目前角色</Text>
              <Text style={styles.roleValue}>{roleLabel[currentUser.role]}</Text>
            </View>
            <TouchableOpacity style={styles.changeRoleBtn} onPress={openRoleSheet} activeOpacity={0.8}>
              <Text style={styles.changeRoleBtnText}>切換角色</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>儲存變更</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={roleModal} animationType="none" transparent onRequestClose={closeRoleSheet}>
        <View style={styles.modalContainer}>
          <Animated.View style={[styles.modalOverlay, { opacity: backdropOpacity }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={closeRoleSheet} />
          </Animated.View>

          <Animated.View
            style={[styles.modalSheet, { transform: [{ translateY: sheetTranslateY }] }]}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.modalDragZone}>
              <Animated.View
                style={[styles.modalHandle, { backgroundColor: handleBarBackground, transform: [{ scaleX: handleBarScale }] }]}
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
                    <Image source={r.img} style={styles.roleCardImg} resizeMode="cover" />
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

            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmRole} activeOpacity={0.85}>
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
  avatarImg: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: Colors.white, ...Shadow.strong },
  avatarFallback: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.card,
    alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: Colors.white, ...Shadow.strong,
  },
  rolePill: { backgroundColor: Colors.primary + "33", borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 4 },
  rolePillText: { fontSize: 13, fontWeight: "600", color: Colors.primaryDark },

  card: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20, gap: 4 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", color: Colors.textMuted, marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 12,
    fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border,
  },
  readonlyRow: { backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 12, borderWidth: 1.5, borderColor: Colors.border },
  readonlyText: { fontSize: 16, color: Colors.textLight },

  row: { flexDirection: "row", gap: 12 },
  rowItem: { flex: 1 },
  birthRow: { flexDirection: "row", gap: 8 },

  picker: {
    backgroundColor: Colors.bg, borderRadius: Radius.md, padding: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderColor: Colors.border,
  },
  pickerValue: { fontSize: 16, color: Colors.text },
  pickerPlaceholder: { fontSize: 16, color: Colors.textMuted },

  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  pickerSheet: {
    width: "75%", backgroundColor: DS.surface, borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 20, elevation: 8,
  },
  pickerSheetTitle: { fontSize: 16, fontWeight: "700", color: DS.onSurface, marginBottom: 12, textAlign: "center" },
  pickerItem: { paddingVertical: 12, paddingHorizontal: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 10 },
  pickerItemActive: { backgroundColor: DS.inputBg },
  pickerItemText: { fontSize: 15, color: DS.secondary },

  roleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  roleValue: { fontSize: 18, fontWeight: "700", color: Colors.text },
  changeRoleBtn: { backgroundColor: DS.primary + "1A", borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  changeRoleBtnText: { fontSize: 14, fontWeight: "600", color: DS.primary },

  saveBtn: { backgroundColor: DS.primary, borderRadius: Radius.full, paddingVertical: 18, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0, 0, 0, 0.42)" },
  modalSheet: {
    backgroundColor: DS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.16, shadowRadius: 14, elevation: 16,
  },
  modalDragZone: { paddingTop: 8, paddingBottom: 14 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: DS.outlineVariant, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: DS.onSurface, marginBottom: 4 },
  modalSub: { fontSize: 14, color: DS.secondary, marginBottom: 20 },

  roleCards: { gap: 12, marginBottom: 24 },
  roleCard: {
    flexDirection: "row", height: 100, backgroundColor: "#fff",
    borderRadius: 16, borderWidth: 2, borderColor: "transparent", overflow: "hidden", ...Shadow.card,
  },
  roleCardActive: { borderColor: DS.primaryContainer },
  roleCardImg: { width: 80, height: "100%" },
  checkBadge: {
    position: "absolute", top: 8, left: 8, width: 20, height: 20,
    borderRadius: 10, backgroundColor: DS.primary, alignItems: "center", justifyContent: "center",
  },
  roleCardBody: { flex: 1, padding: 12, justifyContent: "center" },
  roleCardTitle: { fontSize: 15, fontWeight: "800", color: DS.onSurface, marginBottom: 4 },
  roleCardQuote: { fontSize: 12, color: DS.secondary, lineHeight: 17 },

  confirmBtn: { backgroundColor: DS.primary, borderRadius: Radius.full, paddingVertical: 18, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
