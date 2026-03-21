import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Image, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Radius, Shadow } from '../theme';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';
import AppHeader from '../components/Header';
import { RiskLevel } from '../types';

type AttachmentType = 'image' | 'file' | 'video';
interface Attachment {
  type: AttachmentType;
  uri: string;
  name: string;
}

function detectInputType(text: string): 'url' | 'phone' | 'text' {
  const trimmed = text.trim();
  if (/^https?:\/\//i.test(trimmed) || /(www\.|\.com|\.tw|\.net|\.org)/i.test(trimmed)) return 'url';
  if (/^[\+]?[\d\s\-\(\)]{7,15}$/.test(trimmed)) return 'phone';
  return 'text';
}

const RISK_META: Record<RiskLevel, { color: string; label: string }> = {
  high:   { color: '#E97A7A', label: '高風險' },
  medium: { color: '#F5C842', label: '中風險' },
  safe:   { color: '#7BBF8E', label: '安全' },
};

const INPUT_TYPE_LABEL: Record<string, { icon: string; label: string; color: string }> = {
  url:   { icon: 'link',       label: '網址偵測', color: '#5C8FA8' },
  phone: { icon: 'call',       label: '電話偵測', color: '#7BBF8E' },
  text:  { icon: 'chatbubble', label: '文字偵測', color: '#E8935A' },
  image: { icon: 'image',      label: '圖片偵測', color: '#A0785A' },
  video: { icon: 'videocam',   label: '影音偵測', color: '#C0724A' },
  file:  { icon: 'document',   label: '檔案偵測', color: '#8A7BAA' },
};

export default function DetectScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, events } = useAppStore();
  const isGuardian = currentUser.role === 'guardian';
  const myEvents = events.filter((e) => e.userId === currentUser.id);

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setText('');
        setAttachments([]);
      };
    }, [])
  );

  const detectedType = text.trim() ? detectInputType(text) : null;
  const activeBadgeType: string | null =
    detectedType ?? (attachments.length > 0 ? attachments[0].type : null);
  const typeInfo = activeBadgeType ? INPUT_TYPE_LABEL[activeBadgeType] : null;

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newItems: Attachment[] = result.assets.map((a) => ({
        type: a.type === 'video' ? 'video' : 'image',
        uri: a.uri,
        name: a.fileName ?? (a.type === 'video' ? '影片' : '圖片'),
      }));
      setAttachments((prev) => [...prev, ...newItems]);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setAttachments((prev) => [
        ...prev,
        { type: 'image', uri: result.assets[0].uri, name: '拍照' },
      ]);
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'video/*', 'audio/*'],
      multiple: true,
    });
    if (!result.canceled) {
      const newItems: Attachment[] = result.assets.map((a) => ({
        type: a.mimeType?.startsWith('video') ? 'video' : 'file',
        uri: a.uri,
        name: a.name,
      }));
      setAttachments((prev) => [...prev, ...newItems]);
    }
  };

  const removeAttachment = (index: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  const canSubmit = text.trim().length > 0 || attachments.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const type = attachments.length > 0 && !text.trim() ? 'image' : (detectedType ?? 'text');
    const input = text.trim() || attachments[0]?.name || '';
    navigation.navigate('Analyzing', { type, input });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={[styles.title, isGuardian && styles.titleLarge]}>偵測可疑內容</Text>
            <Text style={[styles.sub, isGuardian && styles.subLarge]}>
              貼上訊息、網址、電話，或上傳圖片 / 檔案
            </Text>
          </View>

          {/* Input card */}
          <View style={[styles.inputCard, Shadow.card]}>
            {typeInfo && (
              <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '22' }]}>
                <Ionicons name={typeInfo.icon as any} size={13} color={typeInfo.color} />
                <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>{typeInfo.label}</Text>
              </View>
            )}

            {attachments.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachRow}>
                {attachments.map((a, i) => (
                  <View key={i} style={styles.attachItem}>
                    {a.type === 'image' ? (
                      <Image source={{ uri: a.uri }} style={styles.attachImage} />
                    ) : (
                      <View style={styles.attachFile}>
                        <Ionicons
                          name={a.type === 'video' ? 'videocam' : 'document'}
                          size={22}
                          color={Colors.primaryDark}
                        />
                      </View>
                    )}
                    <Text style={styles.attachName} numberOfLines={1}>{a.name}</Text>
                    <TouchableOpacity style={styles.attachRemove} onPress={() => removeAttachment(i)}>
                      <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <TextInput
              ref={inputRef}
              style={[styles.textInput, isGuardian && styles.textInputLarge]}
              placeholder="貼上可疑訊息、網址或電話號碼…"
              placeholderTextColor={Colors.textMuted}
              multiline
              value={text}
              onChangeText={setText}
              textAlignVertical="top"
            />

            <View style={styles.toolbar}>
              <TouchableOpacity style={styles.toolBtn} onPress={handlePickImage}>
                <Ionicons name="image-outline" size={22} color={Colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={handleCamera}>
                <Ionicons name="camera-outline" size={22} color={Colors.textLight} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={handlePickFile}>
                <Ionicons name="attach-outline" size={22} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LinearGradient
                colors={canSubmit ? ['#89502e', '#ffb38a'] : ['#d4c4bb', '#e8ddd7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendBtn}
              >
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.sendBtnText}>開始偵測</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* History */}
          {myEvents.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>偵測紀錄</Text>
              {myEvents.slice(0, 5).map((e) => {
                const risk = RISK_META[e.riskLevel];
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={styles.historyItem}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (e.riskLevel === 'high') navigation.navigate('ResultHigh', { scamType: e.scamType, riskScore: e.riskScore, riskFactors: e.riskFactors, summary: e.summary });
                      else if (e.riskLevel === 'medium') navigation.navigate('ResultMedium', { scamType: e.scamType, riskScore: e.riskScore, riskFactors: e.riskFactors, summary: e.summary });
                      else navigation.navigate('ResultSafe');
                    }}
                  >
                    <View style={[styles.historyDot, { backgroundColor: risk.color }]} />
                    <View style={styles.historyContent}>
                      <Text style={styles.historyInput} numberOfLines={1}>{e.input || e.type}</Text>
                      <Text style={styles.historyMeta}>{risk.label} · {e.createdAt}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* How to use */}
          <View style={styles.tutorialSection}>
            <Text style={styles.tutorialTitle}>防詐偵測三步驟</Text>
            {[
              { step: '1', icon: 'clipboard-outline', title: '貼上可疑內容', desc: '將可疑訊息、網址或電話號碼貼入輸入框' },
              { step: '2', icon: 'shield-checkmark-outline', title: '點擊開始偵測', desc: 'AI 自動識別類型並分析詐騙風險' },
              { step: '3', icon: 'alert-circle-outline', title: '查看偵測結果', desc: '根據風險等級決定是否需要進一步處理' },
            ].map((item) => (
              <View key={item.step} style={styles.tutorialItem}>
                <View style={styles.tutorialStepBadge}>
                  <Text style={styles.tutorialStepText}>{item.step}</Text>
                </View>
                <View style={styles.tutorialContent}>
                  <View style={styles.tutorialItemHeader}>
                    <Text style={styles.tutorialItemTitle}>{item.title}</Text>
                    <Ionicons name={item.icon as any} size={18} color={Colors.primaryDark} />
                  </View>
                  <Text style={styles.tutorialItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Share entry */}
          <View style={styles.shareSection}>
            <Text style={styles.shareTitle}>從其他 App 分享過來</Text>
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={() => navigation.navigate('Analyzing', {
                type: 'text',
                input: '您好，我是台灣銀行客服，您的帳戶有異常交易，請立即操作ATM解除分期付款，否則將凍結帳戶。',
              })}
            >
              <Ionicons name="share-social" size={18} color={Colors.primaryDark} />
              <Text style={styles.shareBtnText}>模擬分享入口（Demo）</Text>
            </TouchableOpacity>
          </View>

          {/* Result preview (test) */}
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>結果頁面預覽（測試用）</Text>
            <View style={styles.previewRow}>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: '#E97A7A' }]}
                onPress={() => navigation.navigate('ResultHigh', { scamType: '假冒銀行', riskScore: 92, riskFactors: ['要求轉帳', '偽造官方身份'], summary: '這個訊息要求你轉帳，很可能是詐騙' })}
              >
                <Text style={styles.previewBtnText}>🔴 高風險</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: '#F5C842' }]}
                onPress={() => navigation.navigate('ResultMedium', { scamType: '可疑訊息', riskScore: 55, riskFactors: ['要求提供個人資料'], summary: '此訊息含有可疑特徵' })}
              >
                <Text style={styles.previewBtnText}>🟡 中風險</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewBtn, { backgroundColor: '#7BBF8E' }]}
                onPress={() => navigation.navigate('ResultSafe')}
              >
                <Text style={styles.previewBtnText}>🟢 安全</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: 40 },
  hero: { marginTop: 28, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: Colors.text, marginBottom: 6, letterSpacing: -0.5 },
  titleLarge: { fontSize: 38 },
  sub: { fontSize: 15, color: Colors.textLight, fontWeight: '500' },
  subLarge: { fontSize: 18 },

  inputCard: {
    backgroundColor: '#fcf2e3',
    borderRadius: Radius.xl,
    padding: 16,
    gap: 10,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700' },

  textInput: {
    fontSize: 16, color: Colors.text,
    minHeight: 180, maxHeight: 320,
    lineHeight: 24,
  },
  textInputLarge: { fontSize: 19, minHeight: 220 },

  attachRow: { marginTop: 4 },
  attachItem: { width: 80, marginRight: 10, alignItems: 'center' },
  attachImage: { width: 72, height: 72, borderRadius: Radius.md },
  attachFile: {
    width: 72, height: 72, borderRadius: Radius.md,
    backgroundColor: '#ffdbca', alignItems: 'center', justifyContent: 'center',
  },
  attachName: { fontSize: 11, color: Colors.textLight, marginTop: 4, textAlign: 'center' },
  attachRemove: { position: 'absolute', top: -4, right: -4 },

  toolbar: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 10, marginTop: 4, gap: 4,
  },
  toolBtn: { padding: 8, borderRadius: Radius.md },

  sendBtn: {
    borderRadius: Radius.full, paddingVertical: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#89502e', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
  },
  sendBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  historySection: { marginTop: 28 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fcf2e3', borderRadius: Radius.lg,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyContent: { flex: 1 },
  historyInput: { fontSize: 14, fontWeight: '600', color: Colors.text },
  historyMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  tutorialSection: { marginTop: 28 },
  tutorialTitle: { fontSize: 18, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  tutorialItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fcf2e3', borderRadius: Radius.lg,
    paddingVertical: 18, paddingHorizontal: 16, marginBottom: 8,
  },
  tutorialStepBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primaryDark,
    alignItems: 'center', justifyContent: 'center',
  },
  tutorialStepText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  tutorialIcon: { marginHorizontal: 2 },
  tutorialContent: { flex: 1 },
  tutorialItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tutorialItemTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  tutorialItemDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  shareSection: { marginTop: 28, alignItems: 'center' },
  shareTitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fcf2e3', borderRadius: Radius.full, paddingHorizontal: 20, paddingVertical: 12 },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primaryDark },

  previewSection: { marginTop: 32 },
  previewLabel: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
  previewRow: { flexDirection: 'row', gap: 10 },
  previewBtn: { flex: 1, borderRadius: Radius.lg, paddingVertical: 14, alignItems: 'center' },
  previewBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
