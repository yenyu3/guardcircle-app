import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Image,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Radius } from "../../theme";
import { useAppStore } from "../../store";
import { Role } from "../../types";
import { RootStackParamList } from "../../navigation";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AppHeader from "../../components/Header";

const DS = {
  bg: "#fff8f1",
  surface: "#fcf2e3",
  cardBg: "#f1e7d8",
  cardSelected: "#ffffff",
  primary: "#89502e",
  primaryContainer: "#ffb38a",
  secondary: "#6e5b45",
  onSurface: "#1f1b12",
  outline: "#85736b",
  outlineVariant: "#d7c2b9",
  tertiary: "#146870",
  tertiaryContainer: "#88d0d8",
};

const roles: {
  role: Role;
  icon: keyof typeof Ionicons.glyphMap;
  titleZh: string;
  titleEn: string;
  quote: string;
  tagline: string;
  taglineIcon: keyof typeof Ionicons.glyphMap;
  imgColors: [string, string];
  imgIcon: keyof typeof Ionicons.glyphMap;
  img: any;
  iconColor: string;
  selectedBorder: string;
}[] = [
  {
    role: "guardian",
    icon: "shield-outline",
    titleZh: "守護者",
    titleEn: "Guardian",
    quote: '"我希望家人協助我確認可疑訊息。"',
    tagline: "感到安全與被守護",
    taglineIcon: "shield-outline",
    imgColors: ["#6aab7a", "#2d6e4e"],
    imgIcon: "people",
    img: require("../../public/guardian.png"),
    iconColor: DS.primary,
    selectedBorder: DS.primaryContainer,
  },
  {
    role: "gatekeeper",
    icon: "eye-outline",
    titleZh: "守門人",
    titleEn: "Gatekeeper",
    quote: '"我想保護家人，監控家人的安全狀態。"',
    tagline: "負責任且保持警覺",
    taglineIcon: "bar-chart-outline",
    imgColors: ["#2c2c2c", "#1a1a2e"],
    imgIcon: "phone-portrait-outline",
    img: require("../../public/gatekeeper.png"),
    iconColor: DS.outline,
    selectedBorder: DS.primaryContainer,
  },
  {
    role: "solver",
    icon: "bulb-outline",
    titleZh: "識破者",
    titleEn: "Solver",
    quote: '"我想快速識破詐騙，了解最新詐騙手法。"',
    tagline: "聰明且善於分析",
    taglineIcon: "bulb-outline",
    imgColors: ["#0d3d4a", "#0a2a35"],
    imgIcon: "analytics-outline",
    img: require("../../public/solver.png"),
    iconColor: DS.outline,
    selectedBorder: DS.primaryContainer,
  },
];

export default function RoleSelectScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { setRole, suggestedRole, saveAccount } = useAppStore();
  const password = useAppStore(
    (s) =>
      s.registeredAccounts.find((a) => a.phone === s.currentUser.phone)
        ?.password ?? "",
  );
  const [selected, setSelected] = useState<Role>(suggestedRole ?? "gatekeeper");

  const handleConfirm = () => {
    setRole(selected);
    saveAccount(password);
    navigation.replace("FamilyJoin");
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header — fixed, outside ScrollView */}
      <AppHeader />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleWrap}>
          <Text style={styles.title}>
            你想怎麼使用{"\n"}
            <Text style={styles.titleAccent}>守護圈？</Text>
          </Text>
          <Text style={styles.sub}>
            選擇最符合你的使用方式，之後可以在設定中切換。
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {roles.map((r) => {
            const active = selected === r.role;
            return (
              <TouchableOpacity
                key={r.role}
                onPress={() => setSelected(r.role)}
                activeOpacity={0.88}
                style={[
                  styles.card,
                  active && { borderColor: r.selectedBorder, borderWidth: 2 },
                ]}
              >
                {/* Image area */}
                <View style={styles.cardImg}>
                  <Image
                    source={r.img}
                    style={styles.cardImgPhoto}
                    resizeMode="cover"
                  />
                  {active && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </View>

                {/* Content */}
                <View style={styles.cardBody}>
                  <View style={styles.cardTitleRow}>
                    <View style={styles.titleWithIcon}>
                      <Text style={styles.roleTitle}>{r.titleZh}</Text>
                      <Ionicons
                        name={r.icon}
                        size={16}
                        color={active ? DS.primary : r.iconColor}
                      />
                    </View>
                  </View>
                  <Text style={styles.roleQuote}>{r.quote}</Text>
                  <View style={styles.taglineRow}>
                    <Ionicons
                      name={r.taglineIcon}
                      size={13}
                      color={active ? DS.primary : DS.outlineVariant}
                    />
                    <Text
                      style={[
                        styles.taglineText,
                        active && { color: DS.primary },
                      ]}
                    >
                      {r.tagline.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <LinearGradient
            colors={[DS.primary, DS.primaryContainer]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaText}>確認</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: DS.bg },

  header: {},
  headerBrand: {},
  headerTitle: {},
  avatar: {},

  scroll: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 60 : 40 },

  titleWrap: { marginTop: 12, marginBottom: 24 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: DS.onSurface,
    lineHeight: 38,
    marginBottom: 12,
  },
  titleAccent: { color: DS.primary },
  sub: { fontSize: 14, color: DS.secondary, lineHeight: 22 },
  suggestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: DS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  suggestText: { fontSize: 13, color: DS.primary, fontWeight: "600" },

  cards: { gap: 16, marginBottom: 32 },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    overflow: "hidden",
    flexDirection: "row",
    height: 140,
    shadowColor: "#1f1b12",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImg: {
    width: 100,
    overflow: "hidden",
  },
  cardImgPhoto: {
    width: 100,
    height: "100%",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: DS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 2, padding: 14, justifyContent: "center" },
  cardTitleRow: { marginBottom: 6 },
  titleWithIcon: { flexDirection: "row", alignItems: "center", gap: 6 },
  roleTitle: { fontSize: 17, fontWeight: "800", color: DS.onSurface },
  roleTitleEn: { fontSize: 12, fontWeight: "600", color: DS.outline },
  roleQuote: {
    fontSize: 12,
    color: DS.secondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  taglineRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  taglineText: {
    fontSize: 10,
    fontWeight: "700",
    color: DS.outlineVariant,
    letterSpacing: 1,
  },

  ctaBtn: {
    borderRadius: Radius.full,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: DS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  step: {
    textAlign: "center",
    fontSize: 13,
    color: DS.secondary,
    marginTop: 16,
  },

  footer: { alignItems: "center", marginTop: 40, gap: 12 },
  footerLine: {
    width: 48,
    height: 2,
    backgroundColor: "#ebe1d3",
    borderRadius: 1,
  },
  footerText: { fontSize: 12, color: DS.outline },
});
