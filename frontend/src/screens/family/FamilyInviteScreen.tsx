import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../../theme';
import Header from '../../components/Header';
import { useAppStore } from '../../store';

export default function FamilyInviteScreen() {
  const navigation = useNavigation();
  const { apiAddFamilyMember } = useAppStore();

  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const complete = phone.trim().length === 10;

  const handleAdd = async () => {
    if (!complete) return;
    setError('');
    setLoading(true);
    try {
      await apiAddFamilyMember(phone.trim());
      Alert.alert('新增成功', '成員已成功加入守護圈');
      navigation.goBack();
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      if (status === 404) setError('找不到此手機號碼的使用者');
      else if (status === 400) setError('請確認手機號碼格式');
      else setError('新增失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Header title="新增成員" onBack={() => navigation.goBack()} />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="person-add" size={40} color={Colors.primaryDark} />
        </View>
        <Text style={styles.title}>輸入手機號碼</Text>
        <Text style={styles.desc}>{`請輸入對方的手機號碼
確認後即可加入守護圈`}</Text>

        <TextInput
          style={[styles.input, !!error && styles.inputError]}
          value={phone}
          onChangeText={(v) => { setPhone(v.replace(/[^0-9]/g, '')); setError(''); }}
          placeholder="0912345678"
          placeholderTextColor={Colors.textLight}
          keyboardType="phone-pad"
          maxLength={10}
          autoCorrect={false}
        />

        {!!error && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle" size={16} color={Colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Pressable onPress={handleAdd} disabled={!complete || loading} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
          <View style={[styles.btn, (!complete || loading) && styles.btnDisabled]}>
            <Text style={styles.btnText}>{loading ? '新增中...' : '確認新增'}</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 40 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryDark + '18',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  desc: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 24, marginBottom: 36 },
  input: {
    width: '100%', height: 56, borderRadius: 16,
    backgroundColor: Colors.white, fontSize: 18, color: Colors.primaryDark,
    borderWidth: 2, borderColor: Colors.border, paddingHorizontal: 16,
    marginBottom: 12,
  },
  inputError: { borderColor: Colors.danger, backgroundColor: '#fff5f5' },
  errorWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 },
  errorText: { fontSize: 14, color: Colors.danger, fontWeight: '600' },
  btn: {
    backgroundColor: Colors.primaryDark, borderRadius: Radius.full,
    paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center', marginTop: 12,
  },
  btnDisabled: { opacity: 0.45 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
