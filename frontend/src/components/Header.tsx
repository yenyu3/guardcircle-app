import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import ShieldHeartIcon from './ShieldHeartIcon';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';
import { useElderStyle } from '../hooks/useElderStyle';

const DS = {
  bg: '#fff8f1',
  primary: '#89502e',
  outline: '#85736b',
};

const avatarMap: Record<string, any> = {
  guardian_female:  require('../public/guardian_w.png'),
  guardian_male:    require('../public/guardian_m.png'),
  gatekeeper_female: require('../public/gatekeeper_w.png'),
  gatekeeper_male:  require('../public/gatekeeper_m.png'),
  solver_female:    require('../public/solver_w.png'),
  solver_male:      require('../public/solver_m.png'),
};

interface Props {
  title?: string;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
}

export default function AppHeader({ title, onBack, rightIcon, onRightPress }: Props) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser } = useAppStore();
  const s = useElderStyle();
  const gender = currentUser.gender === 'female' ? 'female' : currentUser.gender === 'male' ? 'male' : null;
  const avatarKey = gender ? `${currentUser.role}_${gender}` : null;
  const avatarSrc = avatarKey ? avatarMap[avatarKey] : null;

  const avatarElement = avatarSrc ? (
    <Image source={avatarSrc} style={styles.avatarImg} />
  ) : (
    <View style={styles.avatar}>
      <Ionicons name="person" size={18} color={DS.outline} />
    </View>
  );

  if (title) {
    return (
      <View style={[styles.header, s.active && { paddingVertical: 12 * s.p }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack ?? (() => navigation.goBack())}>
          <Ionicons name="arrow-back" size={s.active ? 26 : 22} color={DS.primary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, s.active && { fontSize: 18 * s.f }]}>{title}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={onRightPress} disabled={!onRightPress}>
          {rightIcon ? <Ionicons name={rightIcon} size={s.active ? 26 : 22} color={DS.primary} /> : null}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.header, s.active && { paddingVertical: 12 * s.p }]}>
      <View style={styles.brand}>
        <ShieldHeartIcon size={s.active ? 34 : 28} color={DS.primary} bgColor={DS.bg} />
        <Text style={[styles.title, s.active && { fontSize: 20 * s.f }]}>GuardCircle</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Settings' } as any)} style={styles.avatarWrap}>
        {avatarElement}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: DS.bg,
  },
  pageTitle: { fontSize: 18, fontWeight: '700', color: DS.primary },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: DS.primary, letterSpacing: -0.5 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ebe1d3', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 36, height: 36, borderRadius: 18,
  },
});
