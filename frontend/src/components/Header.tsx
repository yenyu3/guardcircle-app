import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import ShieldHeartIcon from './ShieldHeartIcon';
import { useAppStore } from '../store';
import { RootStackParamList } from '../navigation';

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
  rightElement?: React.ReactNode;
}

export default function AppHeader({ rightElement }: Props) {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { currentUser } = useAppStore();
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

  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <ShieldHeartIcon size={28} color={DS.primary} bgColor={DS.bg} />
        <Text style={styles.title}>GuardCircle</Text>
      </View>
      <View style={styles.right}>
        {rightElement ?? (
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            {avatarElement}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: DS.bg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: DS.primary, letterSpacing: -0.5 },
  right: {},
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#ebe1d3', alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 36, height: 36, borderRadius: 18,
  },
});
