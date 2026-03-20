import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors } from '../theme';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace(isLoggedIn ? 'Main' : 'Register');
    }, 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark" size={56} color={Colors.primaryDark} />
        </View>
        <Text style={styles.appName}>守護圈</Text>
        <Text style={styles.sub}>GuardCircle</Text>
        <Text style={styles.tagline}>家人守護，詐騙遠離</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  logoWrap: { alignItems: 'center', gap: 8 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: Colors.primaryDark, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6,
  },
  appName: { fontSize: 36, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
  sub: { fontSize: 16, fontWeight: '600', color: Colors.primaryDark, letterSpacing: 3 },
  tagline: { fontSize: 14, color: Colors.textLight, marginTop: 8 },
});
