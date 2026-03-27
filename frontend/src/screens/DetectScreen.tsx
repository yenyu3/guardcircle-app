import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import * as Clipboard from "expo-clipboard";
import { Audio } from "expo-av";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Modal,
  Animated,
  Easing,
  PanResponder,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Colors, Radius, Shadow } from "../theme";
import { useAppStore } from "../store";
import { RootStackParamList } from "../navigation";
import AppHeader from "../components/Header";
import { RiskLevel } from "../types";
import { useScrollRef } from "../navigation/ScrollRefContext";
import { useElderStyle } from "../hooks/useElderStyle";

type AttachmentType = "image" | "file" | "video" | "audio";
interface Attachment {
  type: AttachmentType;
  uri: string;
  name: string;
}

function detectInputTypes(text: string): string[] {
  const trimmed = text.trim();
  const types: string[] = [];
  const hasUrl = /https?:\/\/\S+/i.test(trimmed) || /(www\.\S+|\.com|\.tw|\.net|\.org)/i.test(trimmed);
  const hasPhone = /[\+]?[\d][\d\s\-\(\)]{6,14}[\d]/.test(trimmed);
  const isPureUrl = hasUrl && !hasPhone && /^https?:\/\/\S+$/i.test(trimmed);
  const isPurePhone = hasPhone && !hasUrl && /^[\+]?[\d\s\-\(\)]{7,15}$/.test(trimmed);
  if (hasUrl) types.push("url");
  if (hasPhone) types.push("phone");
  if (!isPureUrl && !isPurePhone) types.push("text");
  return types;
}

const RISK_META: Record<RiskLevel, { color: string; label: string }> = {
  high: { color: "#E97A7A", label: "高風險" },
  medium: { color: "#F5C842", label: "中風險" },
  safe: { color: "#7BBF8E", label: "安全" },
};

const INPUT_TYPE_LABEL: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  url: { icon: "link", label: "網址偵測", color: "#5C8FA8" },
  phone: { icon: "call", label: "電話偵測", color: "#7BBF8E" },
  text: { icon: "chatbubble", label: "文字偵測", color: "#E8935A" },
  image: { icon: "image", label: "圖片偵測", color: "#A0785A" },
  video: { icon: "videocam", label: "影音偵測", color: "#C0724A" },
  file: { icon: "document", label: "檔案偵測", color: "#8A7BAA" },
  audio: { icon: "mic", label: "語音偵測", color: "#5B8FA8" },
};

export default function DetectScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser, events } = useAppStore();
  const isGuardian = currentUser.role === "guardian";
  const s = useElderStyle();
  const myEvents = events.filter((e) => e.userId === currentUser.id && !e.isMock);

  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const { register } = useScrollRef();

  const [infoModal, setInfoModal] = useState(false);
  const [clipboardModal, setClipboardModal] = useState(false);
  const [clipboardText, setClipboardText] = useState("");
  const screenHeight = Dimensions.get("window").height;
  const closeOffset = screenHeight * 0.6;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(closeOffset)).current;
  const currentSheetYRef = useRef(closeOffset);
  const dragStartRef = useRef(0);

  const closeSheet = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: closeOffset,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setInfoModal(false);
    });
  };

  useEffect(() => {
    const sub = sheetTranslateY.addListener(({ value }) => {
      currentSheetYRef.current = value;
    });
    return () => sheetTranslateY.removeListener(sub);
  }, [sheetTranslateY]);

  useEffect(() => {
    if (!infoModal) return;
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(closeOffset);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [infoModal]);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dy) > Math.abs(g.dx) && g.dy > 6,
        onPanResponderGrant: () => {
          sheetTranslateY.stopAnimation((v) => {
            dragStartRef.current = v;
          });
        },
        onPanResponderMove: (_, g) => {
          const nextY = Math.max(0, dragStartRef.current + g.dy);
          sheetTranslateY.setValue(nextY);
          backdropOpacity.setValue(
            Math.min(1, Math.max(0, 1 - nextY / (closeOffset * 0.8))),
          );
        },
        onPanResponderRelease: (_, g) => {
          if (g.dy > 80 || g.vy > 0.5) {
            closeSheet();
            return;
          }
          Animated.parallel([
            Animated.timing(sheetTranslateY, {
              toValue: 0,
              duration: 200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 160,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.timing(sheetTranslateY, {
              toValue: 0,
              duration: 200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
              toValue: 1,
              duration: 160,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]).start();
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [closeOffset],
  );

  const handleVoice = useCallback(async () => {
    if (isRecording) {
      const rec = recordingRef.current;
      recordingRef.current = null;
      setIsRecording(false);
      await rec?.stopAndUnloadAsync();
      const uri = rec?.getURI();
      if (uri) {
        setAttachments((prev) => [
          ...prev,
          { type: "audio", uri, name: "語音錄音.m4a" },
        ]);
      }
      return;
    }
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        alert("請到設定開啟麥克風權限，才能使用語音錄音功能。");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      console.error("[Voice] error:", e);
    }
  }, [isRecording]);

  useFocusEffect(
    React.useCallback(() => {
      register('Detect', scrollRef);
      scrollRef.current?.scrollTo({ y: 0, animated: false });

      Clipboard.getStringAsync().then((content) => {
        if (content.trim().length > 5) {
          setClipboardText(content.trim());
          setClipboardModal(true);
        }
      });

      return () => {
        setText("");
        setAttachments([]);
        setClipboardModal(false);
        if (recordingRef.current) {
          recordingRef.current.stopAndUnloadAsync();
          recordingRef.current = null;
        }
      };
    }, [])
  );

  const detectedTypes = text.trim() ? detectInputTypes(text) : [];
  const activeBadgeTypes: string[] =
    detectedTypes.length > 0
      ? detectedTypes
      : attachments.length > 0
      ? [attachments[0].type]
      : [];

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newItems: Attachment[] = result.assets.map((a) => ({
        type: a.type === "video" ? "video" : "image",
        uri: a.uri,
        name: a.fileName ?? (a.type === "video" ? "影片" : "圖片"),
      }));
      setAttachments((prev) => [...prev, ...newItems]);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled) {
      setAttachments((prev) => [
        ...prev,
        { type: "image", uri: result.assets[0].uri, name: "拍照" },
      ]);
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "video/*", "audio/*"],
      multiple: true,
    });
    if (!result.canceled) {
      const newItems: Attachment[] = result.assets.map((a) => ({
        type: a.mimeType?.startsWith("video") ? "video" : a.mimeType?.startsWith("audio") ? "audio" : "file",
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
    const firstAttachment = attachments[0];
    const hasImage = firstAttachment?.type === 'image';
    const type =
      attachments.length > 0 && !text.trim()
        ? firstAttachment.type
        : (detectedTypes[0] ?? "text");
    const types =
      attachments.length > 0 && !text.trim()
        ? [firstAttachment.type]
        : detectedTypes.length > 0 ? detectedTypes : ["text"];
    const input = text.trim() || firstAttachment?.name || "";
    const imageUri = hasImage ? firstAttachment.uri : undefined;
    const isMediaAttachment = firstAttachment && !hasImage;
    const attachmentUri = isMediaAttachment ? firstAttachment.uri : undefined;
    const attachmentName = isMediaAttachment ? firstAttachment.name : undefined;
    const mimeType = isMediaAttachment
      ? (() => {
          if (firstAttachment.type === 'video') return 'video/mp4';
          if (firstAttachment.type === 'audio') return 'audio/m4a';
          // file 類型：從副檔名推導
          const ext = firstAttachment.name.split('.').pop()?.toLowerCase();
          if (ext === 'pdf') return 'application/pdf';
          if (ext === 'mp4' || ext === 'mov') return 'video/mp4';
          if (ext === 'mp3') return 'audio/mpeg';
          if (ext === 'm4a') return 'audio/m4a';
          return 'application/octet-stream';
        })()
      : undefined;
    navigation.navigate("Analyzing", { type, types, input, imageUri, attachmentUri, attachmentName, mimeType });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ref={scrollRef}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, s.active && { fontSize: 32 * s.f }]}>偵測可疑內容</Text>
              <TouchableOpacity
                onPress={() => setInfoModal(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sub, s.active && { fontSize: 15 * s.f }]}>
              貼上訊息、網址、電話，或上傳圖片 / 檔案
            </Text>
          </View>

          {/* Input card */}
          <View style={[styles.inputCard, Shadow.card]}>
            {activeBadgeTypes.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ flexDirection: "row", gap: 6 }}>
                {activeBadgeTypes.map((t) => {
                  const info = INPUT_TYPE_LABEL[t];
                  if (!info) return null;
                  return (
                    <View
                      key={t}
                      style={[styles.typeBadge, { backgroundColor: info.color + "22" }]}
                    >
                      <Ionicons name={info.icon as any} size={13} color={info.color} />
                      <Text style={[styles.typeBadgeText, { color: info.color }]}>
                        {info.label}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {attachments.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.attachRow}
              >
                {attachments.map((a, i) => (
                  <View key={i} style={styles.attachItem}>
                    {a.type === "image" ? (
                      <Image
                        source={{ uri: a.uri }}
                        style={styles.attachImage}
                      />
                    ) : (
                      <View style={styles.attachFile}>
                        <Ionicons
                          name={a.type === "video" ? "videocam" : "document"}
                          size={22}
                          color={Colors.primaryDark}
                        />
                      </View>
                    )}
                    <Text style={styles.attachName} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <TouchableOpacity
                      style={styles.attachRemove}
                      onPress={() => removeAttachment(i)}
                    >
                      <Ionicons
                        name="close-circle"
                        size={18}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.textInputWrap}>
              <TextInput
                ref={inputRef}
                style={[styles.textInput, isGuardian && styles.textInputLarge, s.active && { fontSize: 22, minHeight: 240 }]}
                placeholder="貼上可疑訊息、網址或電話號碼…"
                placeholderTextColor={Colors.textMuted}
                multiline
                value={text}
                onChangeText={setText}
                textAlignVertical="top"
              />
              {text.length > 0 && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => { setText(""); setAttachments([]); }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.toolbar}>
              <TouchableOpacity
                style={styles.toolBtn}
                onPress={handlePickImage}
              >
                <Ionicons
                  name="image-outline"
                  size={22}
                  color={Colors.textLight}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={handleCamera}>
                <Ionicons
                  name="camera-outline"
                  size={22}
                  color={Colors.textLight}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn} onPress={handlePickFile}>
                <Ionicons
                  name="attach-outline"
                  size={22}
                  color={Colors.textLight}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toolBtn, isRecording && styles.toolBtnActive]}
                onPress={handleVoice}
              >
                <Ionicons
                  name={isRecording ? "mic" : "mic-outline"}
                  size={22}
                  color={isRecording ? "#E97A7A" : Colors.textLight}
                />
              </TouchableOpacity>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <LinearGradient
                colors={
                  canSubmit ? ["#89502e", "#ffb38a"] : ["#d4c4bb", "#e8ddd7"]
                }
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
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, s.active && { fontSize: 22 * s.f }]}>偵測紀錄</Text>
            {myEvents.length === 0 ? (
              <View style={styles.historyEmpty}>
                <Ionicons name="time-outline" size={s.active ? 26 : 20} color={Colors.textMuted} />
                <Text style={[styles.historyEmptyText, s.active && { fontSize: 17 * s.f }]}>暫無紀錄</Text>
              </View>
            ) : (
              myEvents.slice(0, 5).map((e) => {
                const risk = RISK_META[e.riskLevel];
                return (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.historyItem, s.active && { paddingVertical: 16, paddingHorizontal: 18 }]}
                    activeOpacity={0.75}
                    onPress={() => {
                      if (e.riskLevel === "high")
                        navigation.navigate("ResultHigh", {
                          scamType: e.scamType,
                          riskScore: e.riskScore,
                          riskFactors: e.riskFactors,
                          summary: e.summary,
                          readonly: true,
                        });
                      else if (e.riskLevel === "medium")
                        navigation.navigate("ResultMedium", {
                          scamType: e.scamType,
                          riskScore: e.riskScore,
                          riskFactors: e.riskFactors,
                          summary: e.summary,
                          readonly: true,
                        });
                      else navigation.navigate("ResultSafe");
                    }}
                  >
                    <View style={[styles.historyDot, { backgroundColor: risk.color }, s.active && { width: 14, height: 14, borderRadius: 7 }]} />
                    <View style={styles.historyContent}>
                      <Text style={[styles.historyInput, s.active && { fontSize: 17 * s.f }]} numberOfLines={1}>{e.input || e.type}</Text>
                      <Text style={[styles.historyMeta, s.active && { fontSize: 14 * s.f, marginTop: 4 }]}>{risk.label} · {e.createdAt}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={s.active ? 22 : 16} color={Colors.textMuted} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Clipboard Prompt Modal */}
      <Modal visible={clipboardModal} transparent animationType="fade" onRequestClose={() => setClipboardModal(false)}>
        <Pressable style={styles.clipOverlay} onPress={() => setClipboardModal(false)}>
          <View style={styles.clipCard}>
            <Ionicons name="clipboard-outline" size={28} color={Colors.primaryDark} />
            <Text style={styles.clipTitle}>偵測到剪貼簿內容</Text>
            <Text style={styles.clipPreview} numberOfLines={3}>{clipboardText}</Text>
            <View style={styles.clipBtns}>
              <TouchableOpacity style={styles.clipBtnSecondary} onPress={() => setClipboardModal(false)}>
                <Text style={styles.clipBtnSecondaryText}>略過</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.clipBtnPrimary}
                onPress={() => {
                  setClipboardModal(false);
                  setText(clipboardText);
                }}
              >
                <Text style={styles.clipBtnPrimaryText}>貼入並分析</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={infoModal}
        animationType="none"
        transparent
        onRequestClose={closeSheet}
      >
        <View style={styles.modalContainer}>
          <Animated.View
            style={[styles.modalOverlay, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={closeSheet}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
            {...sheetPanResponder.panHandlers}
          >
            <View style={styles.modalDragZone}>
              <View style={styles.modalHandle} />
              <Text style={[styles.modalTitle, s.active && { fontSize: 26 * s.f }]}>防詐偵測三步驟</Text>
            </View>
            {[
              {
                step: "1",
                icon: "clipboard-outline",
                title: "貼上可疑內容",
                desc: "將訊息、網址或電話貼入輸入框，或點圖示上傳圖片／檔案",
              },
              {
                step: "2",
                icon: "shield-checkmark-outline",
                title: "點擊開始偵測",
                desc: "點擊「開始偵測」，AI 自動識別類型並分析詐騙風險",
              },
              {
                step: "3",
                icon: "alert-circle-outline",
                title: "查看偵測結果",
                desc: "依風險等級查看結果，高風險請立即停止並回報",
              },
            ].map((item) => (
              <View key={item.step} style={[styles.tutorialItem, s.active && { paddingVertical: 22, paddingHorizontal: 20 }]}>
                <View style={[styles.tutorialStepBadge, s.active && { width: 38, height: 38, borderRadius: 19 }]}>
                  <Text style={[styles.tutorialStepText, s.active && { fontSize: 20 * s.f }]}>{item.step}</Text>
                </View>
                <View style={styles.tutorialContent}>
                  <View style={styles.tutorialItemHeader}>
                    <Text style={[styles.tutorialItemTitle, s.active && { fontSize: 22 * s.f }]}>{item.title}</Text>
                    <Ionicons
                      name={item.icon as any}
                      size={s.active ? 24 : 18}
                      color={Colors.primaryDark}
                    />
                  </View>
                  <Text style={[styles.tutorialItemDesc, s.active && { fontSize: 16 * s.f, lineHeight: 24 * s.f, marginTop: 4 }]}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 100 : 40 },
  hero: { marginTop: 8, marginBottom: 20 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: Colors.text,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 15,
    color: Colors.textLight,
    fontWeight: "500",
    marginTop: 6,
  },

  modalContainer: { flex: 1, justifyContent: "flex-end" },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  modalSheet: {
    backgroundColor: "#fff8f1",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 16,
  },
  modalDragZone: { paddingTop: 8, paddingBottom: 14 },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d7c2b9",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 4,
  },
  modalSub: { fontSize: 14, color: Colors.textLight, marginBottom: 8 },

  inputCard: {
    backgroundColor: "#f6edde",
    borderRadius: Radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: "#d7c2b926",
    gap: 10,
    ...Shadow.card,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 12, fontWeight: "700" },

  textInputWrap: { position: 'relative' },
  textInput: {
    fontSize: 16,
    color: Colors.text,
    minHeight: 180,
    maxHeight: 320,
    lineHeight: 24,
    paddingRight: 28,
  },
  textInputLarge: { fontSize: 19, minHeight: 220 },
  clearBtn: { position: 'absolute', top: 0, right: 0 },

  attachRow: { marginTop: 4 },
  attachItem: { width: 80, marginRight: 10, alignItems: "center" },
  attachImage: { width: 72, height: 72, borderRadius: Radius.md },
  attachFile: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
    backgroundColor: "#ffdbca",
    alignItems: "center",
    justifyContent: "center",
  },
  attachName: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: "center",
  },
  attachRemove: { position: "absolute", top: -4, right: -4 },

  toolbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 10,
    marginTop: 4,
    gap: 4,
  },
  toolBtn: { padding: 8, borderRadius: Radius.md },
  toolBtnActive: { backgroundColor: "#E97A7A22" },

  sendBtn: {
    borderRadius: Radius.full,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#89502e",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  sendBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  historySection: { marginTop: 28 },
  historyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
  },
  historyEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.lg,
  },
  historyEmptyText: { fontSize: 14, color: Colors.textMuted },

  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  historyDot: { width: 10, height: 10, borderRadius: 5 },
  historyContent: { flex: 1 },
  historyInput: { fontSize: 14, fontWeight: "600", color: Colors.text },
  historyMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  tutorialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tutorialStepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialStepText: { fontSize: 17, fontWeight: "800", color: "#fff" },
  tutorialIcon: { marginHorizontal: 2 },
  tutorialContent: { flex: 1 },
  tutorialItemHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  tutorialItemTitle: { fontSize: 19, fontWeight: "700", color: Colors.text },
  tutorialItemDesc: { fontSize: 14, color: Colors.textLight, marginTop: 2 },

  clipOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  clipCard: {
    backgroundColor: "#fff8f1",
    borderRadius: Radius.lg,
    padding: 24,
    width: "100%",
    alignItems: "center",
    gap: 10,
    ...Shadow.card,
  },
  clipTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  clipPreview: {
    fontSize: 13,
    color: Colors.textLight,
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.md,
    padding: 10,
    width: "100%",
    lineHeight: 20,
  },
  clipBtns: { flexDirection: "row", gap: 10, marginTop: 4, width: "100%" },
  clipBtnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  clipBtnSecondaryText: { fontSize: 14, fontWeight: "600", color: Colors.textLight },
  clipBtnPrimary: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
  },
  clipBtnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
