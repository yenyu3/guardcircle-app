import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import AppHeader from "../components/Header";
import { mockDailyChallenges } from "../mock";
import { useAppStore } from "../store";
import { Colors, Radius, Shadow } from "../theme";
import { DailyChallengeQuestion } from "../types";

function getDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.codePointAt(i) ?? 0;
    hash = (hash * 31 + code) >>> 0;
  }
  return hash;
}

function pickDailyQuestion(
  questions: DailyChallengeQuestion[],
  userId: string,
  dateKey: string,
) {
  if (questions.length === 0) return null;
  const seed = `${userId}-${dateKey}`;
  const index = hashString(seed) % questions.length;
  return questions[index];
}

function optionLetter(option: string) {
  const match = /^\(([A-Z])\)/.exec(option);
  return match?.[1] ?? option;
}

export default function DailyChallengeScreen() {
  const { currentUser, dailyChallengeResults, submitDailyChallengeResult } =
    useAppStore();
  const dateKey = getDateKey();

  const question = useMemo(
    () => pickDailyQuestion(mockDailyChallenges, currentUser.id, dateKey),
    [currentUser.id, dateKey],
  );

  const todayRecord = dailyChallengeResults.find(
    (r) => r.userId === currentUser.id && r.dateKey === dateKey,
  );

  const [selectedAnswer, setSelectedAnswer] = useState<string>(
    todayRecord?.selectedAnswer ?? "",
  );

  if (!question) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <AppHeader title="今日挑戰" />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>目前沒有可用的題目</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSubmitted = Boolean(todayRecord);
  const isCorrect = todayRecord?.isCorrect ?? false;
  const answer = question.answer;

  const handleSubmit = () => {
    if (!selectedAnswer || isSubmitted) return;
    submitDailyChallengeResult({
      dateKey,
      questionId: question.id,
      selectedAnswer,
      isCorrect: selectedAnswer === answer,
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="今日挑戰" />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillText}>{question.category}</Text>
          </View>
          <Text style={styles.dateText}>{dateKey}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.question}>{question.question}</Text>

          <View style={styles.optionsWrap}>
            {question.options.map((option) => {
              const letter = optionLetter(option);
              const picked = selectedAnswer === letter;
              const shouldHighlightCorrect = isSubmitted && letter === answer;
              const shouldHighlightWrongPick =
                isSubmitted && picked && letter !== answer;

              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionBtn,
                    picked && styles.optionBtnPicked,
                    shouldHighlightCorrect && styles.optionBtnCorrect,
                    shouldHighlightWrongPick && styles.optionBtnWrong,
                  ]}
                  onPress={() => !isSubmitted && setSelectedAnswer(letter)}
                  activeOpacity={0.85}
                  disabled={isSubmitted}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!isSubmitted && (
            <Button
              title="送出答案"
              onPress={handleSubmit}
              disabled={!selectedAnswer}
              style={styles.submitBtn}
            />
          )}
        </View>

        {isSubmitted && (
          <View
            style={[
              styles.resultCard,
              isCorrect ? styles.resultCardCorrect : styles.resultCardWrong,
            ]}
          >
            <View style={styles.resultTitleRow}>
              <Ionicons
                name={isCorrect ? "checkmark-circle" : "close-circle"}
                size={20}
                color={isCorrect ? "#15803d" : "#b91c1c"}
              />
              <Text
                style={[
                  styles.resultTitle,
                  isCorrect
                    ? styles.resultTitleCorrect
                    : styles.resultTitleWrong,
                ]}
              >
                {isCorrect ? "答對了！" : "答錯了"}
              </Text>
            </View>
            {!isCorrect && (
              <Text style={styles.answerText}>正確答案：{answer}</Text>
            )}
            <Text style={styles.explanationText}>{question.explanation}</Text>
            <Text style={styles.sourceText}>{question.source_title}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: 20, paddingBottom: 28, ...Platform.select({ web: { paddingBottom: 100 } }) },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 16, color: Colors.textLight },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  metaPill: {
    backgroundColor: "#ffdbca",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillText: { fontSize: 12, fontWeight: "700", color: Colors.primaryDark },
  dateText: { fontSize: 12, color: Colors.textMuted, fontWeight: "600" },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 20,
    marginBottom: 14,
    ...Shadow.card,
  },
  question: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.text,
    lineHeight: 31,
    marginBottom: 18,
  },
  optionsWrap: { gap: 10 },
  optionBtn: {
    backgroundColor: "#fcf2e3",
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#f3dfca",
  },
  optionBtnPicked: {
    borderColor: Colors.primaryDark,
    backgroundColor: "#f7e6d8",
  },
  optionBtnCorrect: {
    borderColor: "#22c55e",
    backgroundColor: "#dcfce7",
  },
  optionBtnWrong: {
    borderColor: "#ef4444",
    backgroundColor: "#fee2e2",
  },
  optionText: { fontSize: 15, color: Colors.text, lineHeight: 23 },
  submitBtn: { marginTop: 16, alignSelf: "flex-start" },
  resultCard: {
    borderRadius: Radius.lg,
    padding: 16,
    ...Shadow.card,
  },
  resultCardCorrect: {
    backgroundColor: "#eaf7ee",
    borderWidth: 1,
    borderColor: "#c9ecd4",
  },
  resultCardWrong: {
    backgroundColor: "#fdeaea",
    borderWidth: 1,
    borderColor: "#f5c8c8",
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  resultTitle: { fontSize: 18, fontWeight: "800" },
  resultTitleCorrect: { color: "#15803d" },
  resultTitleWrong: { color: "#b91c1c" },
  answerText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 22,
    marginBottom: 8,
  },
  sourceText: { fontSize: 12, color: Colors.textMuted },
});
