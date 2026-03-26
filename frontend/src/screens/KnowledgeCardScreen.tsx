import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import Card from "../components/Card";
import Header from "../components/Header";
import { mockKnowledgeCards } from "../mock";
import { RootStackParamList } from "../navigation";
import { Colors } from "../theme";

// 如果 mock 資料導入失敗時的備用資料
const localMockCards = [
  {
    id: "k1",
    scamType: "假投資群組",
    subtitle: "識別假冒老師帶單",
    content: `詐騙手法：...`,
    category: "投資詐騙",
    saved: false,
    signals: [
      "要求操作ATM或網銀",
      "聲稱帳戶異常需立即處理",
      "提供非官方客服電話",
    ],
    exampleScript:
      "「您好，我是台灣銀行風控部門，您的帳戶偵測到異常交易，為保護您的資產，請立即前往ATM操作解除分期，否則帳戶將在2小時內凍結。」",
    howToRespond:
      "立即掛斷，直接撥打銀行官方電話（背面號碼）確認，銀行絕不會要求你操作ATM。",
  },
];

export default function KnowledgeCardScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "KnowledgeCard">>();
  const params = route.params as { cardId?: string } | undefined;
  const cardId = params?.cardId || "k1";

  const allCards =
    mockKnowledgeCards && mockKnowledgeCards.length > 0
      ? mockKnowledgeCards
      : localMockCards;
  const card = allCards.find((c) => c.id === cardId) || allCards[0];
  const [saved, setSaved] = useState(card.saved);

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        title="知識卡"
        onBack={() => navigation.goBack()}
        rightIcon={saved ? "bookmark" : "bookmark-outline"}
        onRightPress={() => {
          setSaved(!saved);
          Alert.alert(saved ? "已取消收藏" : "已收藏");
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="bulb" size={28} color={Colors.primaryDark} />
          </View>
          <Text style={styles.scamType}>{card.scamType}</Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>3 個識別訊號</Text>
          {card.signals.map((s, i) => (
            <View key={i} style={styles.signalRow}>
              <View style={styles.signalNum}>
                <Text style={styles.signalNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.signalText}>{s}</Text>
            </View>
          ))}
        </Card>

        <Card variant="warning" style={styles.section}>
          <Text style={styles.sectionTitle}>常見話術範例</Text>
          <Text style={styles.scriptText}>「{card.exampleScript}」</Text>
        </Card>

        <Card variant="safe" style={styles.section}>
          <Text style={styles.sectionTitle}>建議如何回應</Text>
          <Text style={styles.responseText}>{card.howToRespond}</Text>
        </Card>

        <View style={styles.actions}>
          <Button
            title="分享給家人"
            onPress={() => Alert.alert("分享（Demo）")}
            variant="secondary"
          />
          <Button
            title="查看更多知識卡"
            onPress={() =>
              navigation.navigate("KnowledgeCard", { cardId: "k2" })
            }
            variant="ghost"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 40 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  scamType: { fontSize: 22, fontWeight: "800", color: Colors.text, flex: 1 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  signalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  signalNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  signalNumText: { fontSize: 12, fontWeight: "700", color: Colors.white },
  signalText: { fontSize: 14, color: Colors.text, flex: 1, lineHeight: 20 },
  scriptText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 22,
    fontStyle: "italic",
  },
  responseText: { fontSize: 14, color: Colors.text, lineHeight: 22 },
  actions: { gap: 10, marginTop: 8 },
});
