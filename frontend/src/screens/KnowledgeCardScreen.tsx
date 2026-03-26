import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../theme';
import { RootStackParamList } from '../navigation';
import Header from '../components/Header';
import { StackNavigationProp } from '@react-navigation/stack';

export default function KnowledgeCardScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="知識卡" onBack={() => navigation.goBack()} />
      <View style={styles.empty}>
        <Text style={styles.emptyText}>知識卡功能即將推出</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: Colors.textMuted },
});
