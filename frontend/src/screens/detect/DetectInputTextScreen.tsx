import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import Button from '../../components/Button';
import Banner from '../../components/Banner';
import Header from '../../components/Header';

const KEYWORDS = ['匯款', '轉帳', '提款機', '保管費', '解除分期', '操作ATM', '手續費', '保證金'];

export default function DetectInputTextScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [text, setText] = useState('');
  const hasKeyword = KEYWORDS.some((k) => text.includes(k));
  const canSubmit = text.trim().length >= 10;

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="貼上可疑訊息" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>將可疑訊息完整貼上，守護圈會幫你分析</Text>

          {hasKeyword && (
            <Banner message="⚠️ 注意：這則訊息提到了可疑關鍵字，請特別小心" variant="danger" />
          )}

          <TextInput
            style={[styles.input, hasKeyword && styles.inputDanger]}
            placeholder="在這裡貼上可疑的訊息內容…"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.counter}>{text.length} / 2000</Text>

          <Button
            title="開始分析"
            onPress={() => navigation.navigate('Analyzing', { type: 'text', input: text })}
            size="large"
            disabled={!canSubmit}
            style={{ marginTop: 16 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  hint: { fontSize: 14, color: Colors.textLight, marginBottom: 14, lineHeight: 20 },
  input: { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16, fontSize: 16, color: Colors.text, borderWidth: 2, borderColor: Colors.border, minHeight: 200, lineHeight: 24 },
  inputDanger: { borderColor: Colors.danger },
  counter: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginTop: 6 },
});
