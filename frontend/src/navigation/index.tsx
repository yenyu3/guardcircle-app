import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import React, { useEffect, useRef } from "react";
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppStore } from "../store";
import { Colors } from "../theme";
import { ScrollRefProvider, useScrollRef } from "./ScrollRefContext";

// Auth
import SplashScreen from "../screens/SplashScreen";
import FamilyJoinScreen from "../screens/auth/FamilyJoinScreen";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import RoleSelectScreen from "../screens/auth/RoleSelectScreen";

// Tabs
import DetectScreen from "../screens/DetectScreen";
import FamilyScreen from "../screens/FamilyScreen";
import HomeScreen from "../screens/HomeScreen";
import SettingsScreen from "../screens/SettingsScreen";

// Detect flow
import AnalyzingScreen from "../screens/detect/AnalyzingScreen";
import ResultHighScreen from "../screens/detect/ResultHighScreen";
import ResultMediumScreen from "../screens/detect/ResultMediumScreen";
import ResultSafeScreen from "../screens/detect/ResultSafeScreen";
import ResultScreen from "../screens/detect/ResultScreen";

// Family
import FamilyCreateScreen from "../screens/family/FamilyCreateScreen";
import FamilyEventDetailScreen from "../screens/family/FamilyEventDetailScreen";
import FamilyInviteScreen from "../screens/family/FamilyInviteScreen";
import FamilyRecordScreen from "../screens/family/FamilyRecordScreen";
import GuardianAlertScreen from "../screens/family/GuardianAlertScreen";
import HighRiskEventsScreen from "../screens/family/HighRiskEventsScreen";

// Settings
import SettingsAdvancedScreen from "../screens/settings/SettingsAdvancedScreen";
import SettingsAndroidScreen from "../screens/settings/SettingsAndroidScreen";
import SettingsPrivacyScreen from "../screens/settings/SettingsPrivacyScreen";
import SettingsProfileScreen from "../screens/settings/SettingsProfileScreen";
import QuickScanSettingsScreen from "../screens/settings/QuickScanSettingsScreen";

import ScamBriefScreen from "../screens/ScamBriefScreen";

// Other
import DailyChallengeScreen from "../screens/DailyChallengeScreen";
import WeeklyReportScreen from "../screens/WeeklyReportScreen";

// Services
import { consumePendingScreenshot, stopOverlay, startOverlay, isOverlayActive } from "../services/QuickScan";

export type RootStackParamList = {
  Splash: undefined;
  Register: undefined;
  Login: undefined;
  RoleSelect: undefined;
  FamilyJoin: undefined;
  Main: undefined;
  Settings: undefined;
  Analyzing: {
    type: string;
    input: string;
    imageUri?: string;
    attachmentUri?: string;
  };
  Result: {
    riskLevel: "safe" | "medium" | "high";
    scamType: string;
    riskScore: number;
    riskFactors: string[];
    summary: string;
    reason?: string;
    hasFinancialKeyword?: boolean;
  };
  ResultHigh: {
    scamType: string;
    riskScore: number;
    riskFactors: string[];
    summary: string;
    reason?: string;
    readonly?: boolean;
    originalInput?: string;
    imageUri?: string;
    attachmentUri?: string;
  };
  ResultMedium: {
    scamType: string;
    riskScore: number;
    riskFactors: string[];
    summary: string;
    reason?: string;
    readonly?: boolean;
    originalInput?: string;
    imageUri?: string;
    attachmentUri?: string;
  };
  ResultSafe: { reason?: string } | undefined;
  FamilyRecord: undefined;
  FamilyEventDetail: { eventId: string };
  FamilyCreate: undefined;
  FamilyInvite: undefined;
  GuardianAlert: { eventId: string };
  HighRiskEvents: undefined;
  ScamBrief: undefined;
  WeeklyReport: undefined;
  DailyChallenge: undefined;
  KnowledgeCard: { cardId: string };
  SettingsProfile: undefined;
  SettingsFamily: undefined;
  SettingsPrivacy: undefined;
  SettingsAdvanced: undefined;
  SettingsAndroid: undefined;
  QuickScanSettings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TAB_ITEMS: Record<
  string,
  { label: string; icon: string; iconActive: string }
> = {
  Home: { label: "首頁", icon: "home-outline", iconActive: "home" },
  Detect: { label: "偵測", icon: "radio-outline", iconActive: "radio" },
  Family: { label: "家庭圈", icon: "people-outline", iconActive: "people" },
  Settings: { label: "設定", icon: "settings-outline", iconActive: "settings" },
} as const;

function CustomTabBar({ state, navigation }: any) {
  const { scrollToTop } = useScrollRef();
  const lastPressTime = useRef<Record<string, number>>({});
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        tabStyles.bar,
        {
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      {state.routes.map((route: any, index: number) => {
        const item = TAB_ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        return (
          <TouchableOpacity
            key={route.key}
            style={tabStyles.item}
            onPress={() => {
              const now = Date.now();
              const last = lastPressTime.current[route.name] ?? 0;
              if (focused && now - last < 400) {
                scrollToTop(route.name);
              } else {
                navigation.navigate(route.name);
              }
              lastPressTime.current[route.name] = now;
            }}
            activeOpacity={0.7}
          >
            <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
              <Ionicons
                name={(focused ? item.iconActive : item.icon) as any}
                size={24}
                color={focused ? Colors.primaryDark : "#a89080"}
              />
            </View>
            <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,248,241,0.92)",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderTopColor: "#f0d9c0",
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingHorizontal: 8,
    shadowColor: "#1f1b12",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  item: { flex: 1, alignItems: "center", gap: 4 },
  pill: {
    width: 52,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: { backgroundColor: "#ebe1d3" },
  label: { fontSize: 11, fontWeight: "600", color: "#a89080" },
  labelActive: { color: Colors.primaryDark },
});

function MainTabs() {
  const { currentUser } = useAppStore();
  const isGuardian = currentUser.role === "guardian";

  return (
    <ScrollRefProvider>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Detect" component={DetectScreen} />
        {!isGuardian && <Tab.Screen name="Family" component={FamilyScreen} />}
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </ScrollRefProvider>
  );
}

const linking = {
  prefixes: ["guardcircle://"],
  config: {
    screens: {
      Analyzing: {
        path: "quickscan",
        parse: {
          type: (type: string) => type || "text",
          // iOS Share Extension sends "content" param; map to "input"
          input: (_: string) => "",
        },
      },
    },
  },
  // Custom URL parser to map "content" → "input"
  getStateFromPath: (path: string) => {
    const url = new URL("guardcircle://" + path);
    if (url.pathname === "/quickscan" || path.startsWith("quickscan")) {
      const params = new URLSearchParams(url.search || path.split("?")[1] || "");
      const type = params.get("type") || "text";
      const content = params.get("content") || "";
      return {
        routes: [
          {
            name: "Analyzing",
            params: {
              type,
              input: decodeURIComponent(content),
            },
          },
        ],
      };
    }
    return undefined;
  },
};

function QuickScanIntentHandler({ navigationRef }: { navigationRef: React.RefObject<any> }) {
  // Track whether the user has enabled the overlay (so we know to restore it)
  const overlayEnabled = React.useRef(false);

  // Auto-hide bubble when app is in foreground, show when in background
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const sub = AppState.addEventListener("change", async (state) => {
      try {
        if (state === "active") {
          // App came to foreground — hide bubble (not needed inside our app)
          const active = await isOverlayActive();
          if (active) {
            overlayEnabled.current = true;
            stopOverlay();
          }
        } else if (state === "background" && overlayEnabled.current) {
          // App went to background — restore bubble
          startOverlay();
        }
      } catch {
        // ignore
      }
    });

    return () => sub.remove();
  }, []);

  // Poll for pending screenshots
  useEffect(() => {
    if (Platform.OS !== "android") return;

    let mounted = true;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const checkPending = async () => {
      if (!mounted) return;
      try {
        const screenshotPath = await consumePendingScreenshot();
        if (screenshotPath && navigationRef.current) {
          // Found a pending screenshot — navigate to analysis
          overlayEnabled.current = true; // keep tracking so it restores later
          navigationRef.current.navigate("Analyzing", {
            type: "image",
            input: "快速掃描擷取",
            imageUri: "file://" + screenshotPath,
          });
        }
      } catch {
        // ignore
      }
    };

    pollTimer = setInterval(checkPending, 1500);
    setTimeout(checkPending, 800);

    return () => {
      mounted = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [navigationRef]);

  return null;
}

export default function AppNavigator() {
  const navigationRef = useRef<any>(null);

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <QuickScanIntentHandler navigationRef={navigationRef} />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: Colors.bg },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="FamilyJoin" component={FamilyJoinScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="ResultHigh" component={ResultHighScreen} />
        <Stack.Screen name="ResultMedium" component={ResultMediumScreen} />
        <Stack.Screen name="ResultSafe" component={ResultSafeScreen} />
        <Stack.Screen name="FamilyRecord" component={FamilyRecordScreen} />
        <Stack.Screen
          name="FamilyEventDetail"
          component={FamilyEventDetailScreen}
        />
        <Stack.Screen name="FamilyCreate" component={FamilyCreateScreen} />
        <Stack.Screen name="FamilyInvite" component={FamilyInviteScreen} />
        <Stack.Screen name="GuardianAlert" component={GuardianAlertScreen} />
        <Stack.Screen name="HighRiskEvents" component={HighRiskEventsScreen} />
        <Stack.Screen name="ScamBrief" component={ScamBriefScreen} />
        <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
        <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} />
        <Stack.Screen
          name="SettingsProfile"
          component={SettingsProfileScreen}
        />
        <Stack.Screen
          name="SettingsPrivacy"
          component={SettingsPrivacyScreen}
        />
        <Stack.Screen
          name="SettingsAdvanced"
          component={SettingsAdvancedScreen}
        />
        <Stack.Screen
          name="SettingsAndroid"
          component={SettingsAndroidScreen}
        />
        <Stack.Screen
          name="QuickScanSettings"
          component={QuickScanSettingsScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
