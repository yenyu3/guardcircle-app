import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Colors } from '../theme';
import { useAppStore } from '../store';

// Auth
import SplashScreen from '../screens/SplashScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import FamilyJoinScreen from '../screens/auth/FamilyJoinScreen';

// Tabs
import HomeScreen from '../screens/HomeScreen';
import DetectScreen from '../screens/DetectScreen';
import FamilyScreen from '../screens/FamilyScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Detect flow
import DetectInputTextScreen from '../screens/detect/DetectInputTextScreen';
import DetectInputUrlScreen from '../screens/detect/DetectInputUrlScreen';
import DetectInputPhoneScreen from '../screens/detect/DetectInputPhoneScreen';
import DetectInputImageScreen from '../screens/detect/DetectInputImageScreen';
import AnalyzingScreen from '../screens/detect/AnalyzingScreen';
import ResultScreen from '../screens/detect/ResultScreen';
import ResultHighScreen from '../screens/detect/ResultHighScreen';
import ResultMediumScreen from '../screens/detect/ResultMediumScreen';
import ResultSafeScreen from '../screens/detect/ResultSafeScreen';

// Family
import FamilyRecordScreen from '../screens/family/FamilyRecordScreen';
import FamilyEventDetailScreen from '../screens/family/FamilyEventDetailScreen';
import FamilyCreateScreen from '../screens/family/FamilyCreateScreen';
import FamilyInviteScreen from '../screens/family/FamilyInviteScreen';
import GuardianAlertScreen from '../screens/family/GuardianAlertScreen';

// Settings
import SettingsProfileScreen from '../screens/settings/SettingsProfileScreen';
import SettingsFamilyScreen from '../screens/settings/SettingsFamilyScreen';
import SettingsPrivacyScreen from '../screens/settings/SettingsPrivacyScreen';
import SettingsAndroidScreen from '../screens/settings/SettingsAndroidScreen';
import SettingsAdvancedScreen from '../screens/settings/SettingsAdvancedScreen';

// Other
import WeeklyReportScreen from '../screens/WeeklyReportScreen';
import KnowledgeCardScreen from '../screens/KnowledgeCardScreen';

export type RootStackParamList = {
  Splash: undefined;
  Register: undefined;
  Login: undefined;
  RoleSelect: undefined;
  FamilyJoin: undefined;
  Main: undefined;
  Settings: undefined;
  DetectInputText: undefined;
  DetectInputUrl: undefined;
  DetectInputPhone: undefined;
  DetectInputImage: undefined;
  Analyzing: { type: string; input: string };
  Result: { riskLevel: 'safe' | 'medium' | 'high'; scamType: string; riskScore: number; riskFactors: string[]; summary: string; hasFinancialKeyword?: boolean };
  ResultHigh: { scamType: string; riskScore: number; riskFactors: string[]; summary: string };
  ResultMedium: { scamType: string; riskScore: number; riskFactors: string[]; summary: string };
  ResultSafe: undefined;
  FamilyRecord: undefined;
  FamilyEventDetail: { eventId: string };
  FamilyCreate: undefined;
  FamilyInvite: undefined;
  GuardianAlert: { eventId: string };
  WeeklyReport: undefined;
  KnowledgeCard: { cardId?: string };
  SettingsProfile: undefined;
  SettingsFamily: undefined;
  SettingsPrivacy: undefined;
  SettingsAdvanced: undefined;
  SettingsAndroid: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

const TAB_ITEMS: Record<string, { label: string; icon: string; iconActive: string }> = {
  Home:     { label: '首頁',   icon: 'home-outline',     iconActive: 'home' },
  Detect:   { label: '偵測',   icon: 'radio-outline',    iconActive: 'radio' },
  Family:   { label: '家庭圈', icon: 'people-outline',   iconActive: 'people' },
  Settings: { label: '設定',   icon: 'settings-outline', iconActive: 'settings' },
} as const;

function CustomTabBar({ state, navigation }: any) {
  return (
    <View style={tabStyles.bar}>
      {state.routes.map((route: any, index: number) => {
        const item = TAB_ITEMS[route.name];
        if (!item) return null;
        const focused = state.index === index;
        return (
          <TouchableOpacity
            key={route.key}
            style={tabStyles.item}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.7}
          >
            <View style={[tabStyles.pill, focused && tabStyles.pillActive]}>
              <Ionicons
                name={(focused ? item.iconActive : item.icon) as any}
                size={24}
                color={focused ? Colors.primaryDark : '#a89080'}
              />
            </View>
            <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,248,241,0.92)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0d9c0',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    paddingHorizontal: 8,
    shadowColor: '#1f1b12',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 12,
  },
  item: { flex: 1, alignItems: 'center', gap: 4 },
  pill: { width: 52, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: '#ebe1d3' },
  label: { fontSize: 11, fontWeight: '600', color: '#a89080' },
  labelActive: { color: Colors.primaryDark },
});

function MainTabs() {
  const { currentUser } = useAppStore();
  const isGuardian = currentUser.role === 'guardian';

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Detect" component={DetectScreen} />
      {!isGuardian && <Tab.Screen name="Family" component={FamilyScreen} />}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="FamilyJoin" component={FamilyJoinScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="DetectInputText" component={DetectInputTextScreen} />
        <Stack.Screen name="DetectInputUrl" component={DetectInputUrlScreen} />
        <Stack.Screen name="DetectInputPhone" component={DetectInputPhoneScreen} />
        <Stack.Screen name="DetectInputImage" component={DetectInputImageScreen} />
        <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="ResultHigh" component={ResultHighScreen} />
        <Stack.Screen name="ResultMedium" component={ResultMediumScreen} />
        <Stack.Screen name="ResultSafe" component={ResultSafeScreen} />
        <Stack.Screen name="FamilyRecord" component={FamilyRecordScreen} />
        <Stack.Screen name="FamilyEventDetail" component={FamilyEventDetailScreen} />
        <Stack.Screen name="FamilyCreate" component={FamilyCreateScreen} />
        <Stack.Screen name="FamilyInvite" component={FamilyInviteScreen} />
        <Stack.Screen name="GuardianAlert" component={GuardianAlertScreen} />
        <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
        <Stack.Screen name="KnowledgeCard" component={KnowledgeCardScreen} />
        <Stack.Screen name="SettingsProfile" component={SettingsProfileScreen} />
        <Stack.Screen name="SettingsPrivacy" component={SettingsPrivacyScreen} />
        <Stack.Screen name="SettingsAdvanced" component={SettingsAdvancedScreen} />
        <Stack.Screen name="SettingsAndroid" component={SettingsAndroidScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
