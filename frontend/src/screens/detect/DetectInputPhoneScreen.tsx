import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function DetectInputPhoneScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [phone, setPhone] = useState('');

  const format = (v: string) => {
    const d = v.replace(/\D/g, '');
    if (d.length <= 4) return d;
    if (d.length <= 7) return d.slice(0, 4) + '-' + d.slice(4);
    return d.slice(0, 4) + '-' + d.slice(4, 7) + '-' + d.slice(7, 10);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="輸入電話號碼" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Text style={styles.hint}>輸入你收到的可疑電話號碼，查詢是否有詐騙紀錄</Text>

        <View style={styles.inputRow}>
          <View style={styles.areaCode}>
            <Text style={styles.areaText}>🇹🇼 +886</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="0912-345-678"
            value={phone}
            onChangeText={(t) => setPhone(format(t))}
            keyboardType="phone-pad"
            maxLength={12}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <Button
          title="開始分析"
          onPress={() => navigation.navigate('Analyzing', { type: 'phone', input: '+886 ' + phone })}
          size="large"
          disabled={phone.replace(/\D/g, '').length < 9}
          style={{ marginTop: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20 },
  hint: { fontSize: 14, color: Colors.textLight, marginBottom: 20, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  areaCode: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14 },
  areaText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  input: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, fontSize: 18, fontWeight: '600', color: Colors.text, borderWidth: 1.5, borderColor: Colors.border, letterSpacing: 1 },
});
