import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { useAppStore } from '../store';

// Auth
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RoleSelectScreen from '../screens/auth/RoleSelectScreen';
import FamilyJoinScreen from '../screens/auth/FamilyJoinScreen';

// Tabs
import HomeScreen from '../screens/HomeScreen';
import DetectScreen from '../screens/DetectScreen';
import FamilyScreen from '../screens/FamilyScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
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
import FamilyManageScreen from '../screens/family/FamilyManageScreen';
import GuardianAlertScreen from '../screens/family/GuardianAlertScreen';

// Settings
import SettingsProfileScreen from '../screens/settings/SettingsProfileScreen';
import SettingsFamilyScreen from '../screens/settings/SettingsFamilyScreen';
import SettingsPrivacyScreen from '../screens/settings/SettingsPrivacyScreen';
import SettingsAndroidScreen from '../screens/settings/SettingsAndroidScreen';

// Other
import WeeklyReportScreen from '../screens/WeeklyReportScreen';
import KnowledgeCardScreen from '../screens/KnowledgeCardScreen';

export type RootStackParamList = {
  Splash: undefined;
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
  FamilyManage: undefined;
  GuardianAlert: { eventId: string };
  WeeklyReport: undefined;
  KnowledgeCard: { cardId?: string };
  SettingsProfile: undefined;
  SettingsFamily: undefined;
  SettingsPrivacy: undefined;
  SettingsAndroid: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const role = useAppStore((s) => s.currentUser.role);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.primaryDark,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { backgroundColor: Colors.white, borderTopColor: Colors.border, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, string> = {
            Home: 'home', Detect: 'shield-checkmark', Family: 'people', Notifications: 'notifications', Settings: 'settings',
          };
          return <Ionicons name={(icons[route.name] || 'ellipse') as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '首頁' }} />
      <Tab.Screen name="Detect" component={DetectScreen} options={{ tabBarLabel: '偵測' }} />
      <Tab.Screen name="Family" component={FamilyScreen} options={{ tabBarLabel: '家庭圈' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: '通知' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.bg } }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
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
        <Stack.Screen name="FamilyManage" component={FamilyManageScreen} />
        <Stack.Screen name="GuardianAlert" component={GuardianAlertScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} />
        <Stack.Screen name="KnowledgeCard" component={KnowledgeCardScreen} />
        <Stack.Screen name="SettingsProfile" component={SettingsProfileScreen} />
        <Stack.Screen name="SettingsFamily" component={SettingsFamilyScreen} />
        <Stack.Screen name="SettingsPrivacy" component={SettingsPrivacyScreen} />
        <Stack.Screen name="SettingsAndroid" component={SettingsAndroidScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
