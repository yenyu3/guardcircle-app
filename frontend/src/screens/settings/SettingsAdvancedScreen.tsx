import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';
import { Colors, Radius, Shadow } from '../../theme';

const DS = {
  primary: '#89502e',
  secondary: '#6e5b45',
  outlineVariant: '#d7c2b9',
};

const DEFAULT_KEYWORDS = ['投資', '解除分期', '帳號異常', '點數卡', '轉帳', '警察'];

export default function SettingsAdvancedScreen() {
  const navigation = useNavigation();

  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState('');
  const [dataConsent, setDataConsent] = useState(false);

  const handleAddKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw) return;
    if (keywords.includes(kw)) {
      Alert.alert('已存在', '此關鍵字已在黑名單中');
      return;
    }
    setKeywords([...keywords, kw]);
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="進階設定" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* 關鍵字黑名單 */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>關鍵字黑名單</Text>
          <Text style={styles.sectionDesc}>偵測到以下關鍵字時，將自動提高風險等級</Text>

          <View style={styles.tagWrap}>
            {keywords.map((kw) => (
              <View key={kw} style={styles.tag}>
                <Text style={styles.tagText}>{kw}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveKeyword(kw)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={14} color={DS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={styles.addRow}>
            <TextInput
              style={styles.addInput}
              placeholder="新增關鍵字"
              placeholderTextColor={Colors.textMuted}
              value={newKeyword}
              onChangeText={setNewKeyword}
              onSubmitEditing={handleAddKeyword}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddKeyword} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 資料授權 */}
        <View style={[styles.card, Shadow.card]}>
          <Text style={styles.sectionTitle}>資料授權</Text>
          <View style={styles.consentRow}>
            <View style={styles.consentLeft}>
              <View style={styles.consentIcon}>
                <Ionicons name="server-outline" size={18} color={DS.primary} />
              </View>
              <View style={styles.consentTextWrap}>
                <Text style={styles.consentLabel}>同意資料用於模型訓練</Text>
                <Text style={styles.consentDesc}>
                  允許將匿名化的偵測結果用於改善詐騙辨識模型，不包含個人識別資訊
                </Text>
              </View>
            </View>
            <Switch
              value={dataConsent}
              onValueChange={setDataConsent}
              trackColor={{ true: DS.primary, false: DS.outlineVariant }}
              thumbColor="#fff"
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40, gap: 16, paddingTop: 8 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: Colors.textMuted, marginBottom: 16, lineHeight: 18 },

  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: DS.primary + '18',
    borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tagText: { fontSize: 13, fontWeight: '600', color: DS.primary },

  addRow: { flexDirection: 'row', gap: 10 },
  addInput: {
    flex: 1, backgroundColor: Colors.bg,
    borderRadius: Radius.md, padding: 12,
    fontSize: 15, color: Colors.text,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  addBtn: {
    width: 46, height: 46, borderRadius: Radius.md,
    backgroundColor: DS.primary,
    alignItems: 'center', justifyContent: 'center',
  },

  consentRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
  },
  consentLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
  consentIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: DS.primary + '1A',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  consentTextWrap: { flex: 1 },
  consentLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  consentDesc: { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
});
