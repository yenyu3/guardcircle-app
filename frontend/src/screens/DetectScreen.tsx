import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../theme';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';

const entries = [
  { key: 'text', icon: 'chatbubble-ellipses', label: '貼上文字 / 訊息', sub: '複製可疑訊息貼上分析', screen: 'DetectInputText' },
  { key: 'url', icon: 'link', label: '貼上網址', sub: '分析可疑連結是否安全', screen: 'DetectInputUrl' },
  { key: 'phone', icon: 'call', label: '輸入電話號碼', sub: '查詢電話是否有詐騙紀錄', screen: 'DetectInputPhone' },
  { key: 'image', icon: 'image', label: '上傳截圖', sub: '上傳對話截圖進行分析', screen: 'DetectInputImage' },
] as const;

export default function DetectScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser } = useAppStore();
  const isGuardian = currentUser.role === 'guardian';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, isGuardian && styles.titleLarge]}>偵測可疑內容</Text>
        <Text style={[styles.sub, isGuardian && styles.subLarge]}>選擇你想要確認的內容類型</Text>

        <View style={styles.grid}>
          {entries.map((e) => (
            <TouchableOpacity
              key={e.key}
              style={[styles.card, isGuardian && styles.cardLarge, Shadow.card]}
              onPress={() => navigation.navigate(e.screen as any)}
              activeOpacity={0.8}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={e.icon as any} size={isGuardian ? 32 : 26} color={Colors.primaryDark} />
              </View>
              <Text style={[styles.cardLabel, isGuardian && styles.cardLabelLarge]}>{e.label}</Text>
              {!isGuardian && <Text style={styles.cardSub}>{e.sub}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Mock share sheet entry */}
        <View style={styles.shareSection}>
          <Text style={styles.shareTitle}>從其他 App 分享過來</Text>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => navigation.navigate('Analyzing', { type: 'text', input: '模擬從其他App分享的內容' })}
          >
            <Ionicons name="share-social" size={18} color={Colors.primaryDark} />
            <Text style={styles.shareBtnText}>模擬分享入口（Demo）</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  titleLarge: { fontSize: 28 },
  sub: { fontSize: 14, color: Colors.textLight, marginBottom: 20 },
  subLarge: { fontSize: 17, marginBottom: 24 },
  grid: { gap: 14 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  cardLarge: { padding: 26 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1 },
  cardLabelLarge: { fontSize: 20 },
  cardSub: { fontSize: 12, color: Colors.textMuted, position: 'absolute', bottom: 12, right: 16 },
  shareSection: { marginTop: 28, alignItems: 'center' },
  shareTitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12 },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark },
});
