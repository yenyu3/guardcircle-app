import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ShieldHeartIcon from './ShieldHeartIcon';

const DS = {
  bg: '#fff8f1',
  primary: '#89502e',
  outline: '#85736b',
};

interface Props {
  rightElement?: React.ReactNode;
}

export default function AppHeader({ rightElement }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <ShieldHeartIcon size={28} color={DS.primary} bgColor={DS.bg} />
        <Text style={styles.title}>GuardCircle</Text>
      </View>
      <View style={styles.right}>
        {rightElement ?? (
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={DS.outline} />
          </View>
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
});
