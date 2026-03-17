import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import { RootStackParamList } from '../../navigation';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function DetectInputUrlScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [url, setUrl] = useState('');

  const normalized = url && !url.startsWith('http') ? 'https://' + url : url;
  let domain = '';
  try { domain = new URL(normalized).hostname; } catch {}

  const handleSubmit = () => {
    const final = normalized || url;
    navigation.navigate('Analyzing', { type: 'url', input: final });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="貼上可疑網址" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Text style={styles.hint}>貼上你收到的可疑連結，我們會幫你確認是否安全</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="https://example.com"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={styles.pasteBtn} onPress={() => setUrl('tw-bank-secure-login.xyz/verify')}>
            <Ionicons name="clipboard-outline" size={20} color={Colors.primaryDark} />
          </TouchableOpacity>
        </View>

        {domain ? (
          <View style={styles.preview}>
            <Ionicons name="globe-outline" size={16} color={Colors.textLight} />
            <Text style={styles.previewText}>網域：{domain}</Text>
          </View>
        ) : null}

        <Button title="開始分析" onPress={handleSubmit} size="large" disabled={!url} style={{ marginTop: 24 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20 },
  hint: { fontSize: 14, color: Colors.textLight, marginBottom: 16, lineHeight: 20 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, fontSize: 15, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },
  pasteBtn: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: Colors.safeBg, borderRadius: Radius.sm, padding: 10 },
  previewText: { fontSize: 13, color: Colors.textLight },
});
