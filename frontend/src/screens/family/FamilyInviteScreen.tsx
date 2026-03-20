import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import Header from '../../components/Header';
import { useAppStore } from '../../store';

export default function FamilyInviteScreen() {
  const navigation = useNavigation();
  const { bindGuardian } = useAppStore();

  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = useRef<(TextInput | null)[]>([]);
  const [error, setError] = useState('');

  const handleDigit = (val: string, idx: number) => {
    const ch = val.replace(/[^0-9]/g, '').slice(-1);
    const next = [...digits]; next[idx] = ch; setDigits(next);
    setError('');
    if (ch && idx < 3) refs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0)
      refs.current[idx - 1]?.focus();
  };

  const complete = digits.every((d) => d !== '');

  const handleBind = () => {
    const code = digits.join('');
    if (code === '0000') { setError('配對碼錯誤，請確認後再試'); return; }
    const ok = bindGuardian(code);
    if (ok) {
      Alert.alert('綁定成功', '成員已成功加入守護圈');
      navigation.goBack();
    } else {
      setError('配對碼錯誤，請確認後再試');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="新增成員" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-add" size={40} color={Colors.primaryDark} />
        </View>
        <Text style={styles.title}>輸入配對碼</Text>
        <Text style={styles.desc}>請對方在 App 內產生 4 位配對碼{'\n'}輸入後即可加入守護圈</Text>

        <View style={styles.digitRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(r) => { refs.current[i] = r; }}
              style={[styles.digitBox, d && styles.digitBoxFilled, !!error && styles.digitBoxError]}
              value={d}
              onChangeText={(v) => handleDigit(v, i)}
              onKeyPress={(e) => handleKeyPress(e, i)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
            />
          ))}
        </View>

        {!!error && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable onPress={handleBind} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <View style={[styles.btn, !complete && styles.btnDisabled]}>
            <Text style={styles.btnText}>確認綁定</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 40 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryDark + '18',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  desc: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 24, marginBottom: 36 },
  digitRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  digitBox: {
    width: 64, height: 72, borderRadius: 16,
    backgroundColor: Colors.white, fontSize: 32, fontWeight: '800', color: Colors.primaryDark,
    borderWidth: 2, borderColor: Colors.border, textAlign: 'center',
  },
  digitBoxFilled: { borderColor: Colors.primaryDark },
  digitBoxError: { borderColor: Colors.danger, backgroundColor: '#fff5f5' },
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  errorText: { fontSize: 14, color: Colors.danger, fontWeight: '600' },
  btn: {
    backgroundColor: Colors.primaryDark, borderRadius: Radius.full,
    paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center', marginTop: 12,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
