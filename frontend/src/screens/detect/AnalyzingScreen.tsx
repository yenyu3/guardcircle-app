import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import { mockDetectResults } from '../../mock';

const STEPS = ['Gogolook 資料庫查詢', 'AI 語意分析中', '產生風險報告'];

export default function AnalyzingScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Analyzing'>>();
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })).start();

    const timers = [
      setTimeout(() => setStep(1), 1200),
      setTimeout(() => setStep(2), 2400),
      setTimeout(() => setStep(3), 3600),
      setTimeout(() => {
        // Randomly pick result for demo
        const input = route.params?.input || '';
        const hasHigh = input.includes('ATM') || input.includes('解除分期') || input.includes('bank-secure');
        const hasMedium = input.includes('包裹') || input.includes('物流') || input.includes('點擊');
        const result = hasHigh ? mockDetectResults.high : hasMedium ? mockDetectResults.medium : mockDetectResults.safe;
        if (result.riskLevel === 'high') {
          navigation.replace('ResultHigh', { scamType: result.scamType, riskScore: result.riskScore, riskFactors: result.riskFactors, summary: result.summary });
        } else {
          navigation.replace('Result', { ...result, riskLevel: result.riskLevel as 'safe' | 'medium' });
        }
      }, 4200),
    ];
    const slowTimer = setTimeout(() => setSlow(true), 10000);
    return () => { timers.forEach(clearTimeout); clearTimeout(slowTimer); };
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <SafeAreaView style={styles.safe}>
      <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
        <Ionicons name="close" size={24} color={Colors.textLight} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.primaryDark} />
        </Animated.View>
        <Text style={styles.title}>分析中…</Text>

        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, step > i && styles.stepDotDone, step === i && styles.stepDotActive]}>
                {step > i && <Ionicons name="checkmark" size={12} color={Colors.white} />}
              </View>
              <Text style={[styles.stepText, step > i && styles.stepTextDone]}>{s}</Text>
            </View>
          ))}
        </View>

        {slow && (
          <Text style={styles.slowText}>仍在分析中，請稍候⋯截圖分析需要更多時間</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  cancel: { position: 'absolute', top: 56, right: 20, padding: 8, zIndex: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 },
  spinner: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  steps: { gap: 16, width: '100%' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.safe },
  stepText: { fontSize: 15, color: Colors.textMuted },
  stepTextDone: { color: Colors.text, fontWeight: '600' },
  slowText: { fontSize: 13, color: Colors.textLight, textAlign: 'center', lineHeight: 20 },
});
