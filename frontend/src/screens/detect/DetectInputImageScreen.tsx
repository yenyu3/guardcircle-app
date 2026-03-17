import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../../theme';
import { RootStackParamList } from '../../navigation';
import Button from '../../components/Button';
import Header from '../../components/Header';

export default function DetectInputImageScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [selected, setSelected] = useState(false);

  const mockSelect = () => setSelected(true);

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="上傳截圖" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <Text style={styles.hint}>上傳可疑對話或訊息的截圖，AI 會幫你分析內容</Text>

        {!selected ? (
          <View style={styles.pickArea}>
            <TouchableOpacity style={styles.pickBtn} onPress={mockSelect}>
              <Ionicons name="images-outline" size={32} color={Colors.primaryDark} />
              <Text style={styles.pickLabel}>從相簿選取</Text>
            </TouchableOpacity>
            <View style={styles.divider}><Text style={styles.dividerText}>或</Text></View>
            <TouchableOpacity style={styles.pickBtn} onPress={mockSelect}>
              <Ionicons name="camera-outline" size={32} color={Colors.primaryDark} />
              <Text style={styles.pickLabel}>立即拍照</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.preview}>
            <View style={styles.mockImage}>
              <Ionicons name="image" size={48} color={Colors.textMuted} />
              <Text style={styles.mockImageText}>截圖預覽</Text>
              <Text style={styles.mockImageSub}>screenshot_001.jpg</Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(false)} style={styles.reselect}>
              <Ionicons name="refresh" size={16} color={Colors.primaryDark} />
              <Text style={styles.reselectText}>重新選擇</Text>
            </TouchableOpacity>
          </View>
        )}

        <Button
          title="開始分析"
          onPress={() => navigation.navigate('Analyzing', { type: 'image', input: 'screenshot_001.jpg' })}
          size="large"
          disabled={!selected}
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
  pickArea: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  pickBtn: { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 28, alignItems: 'center', gap: 10, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed' },
  pickLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  divider: { alignItems: 'center' },
  dividerText: { fontSize: 13, color: Colors.textMuted },
  preview: { alignItems: 'center', gap: 12 },
  mockImage: { width: '100%', height: 200, backgroundColor: Colors.card, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mockImageText: { fontSize: 15, fontWeight: '600', color: Colors.textLight },
  mockImageSub: { fontSize: 12, color: Colors.textMuted },
  reselect: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reselectText: { fontSize: 14, color: Colors.primaryDark, fontWeight: '600' },
});
