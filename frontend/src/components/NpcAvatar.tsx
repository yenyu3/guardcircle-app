import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';

const npcImages: Record<string, any> = {
  npc_m1: require('../public/npc_m1.png'),
  npc_m2: require('../public/npc_m2.png'),
  npc_m3: require('../public/npc_m3.png'),
  npc_w1: require('../public/npc_w1.png'),
  npc_w2: require('../public/npc_w2.png'),
  guardian_m: require('../public/guardian_m.png'),
  guardian_w: require('../public/guardian_w.png'),
  gatekeeper_m: require('../public/gatekeeper_m.png'),
  gatekeeper_w: require('../public/gatekeeper_w.png'),
  solver_m: require('../public/solver_m.png'),
  solver_w: require('../public/solver_w.png'),
};

/** 依 role + userId hash 自動分配 NPC 頭貼 key */
export function resolveAvatar(role: string, userId: string): string {
  const hash = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const suffix = hash % 2 === 0 ? 'm' : 'w';
  const base = role === 'guardian' ? 'guardian' : role === 'gatekeeper' ? 'gatekeeper' : 'solver';
  return `${base}_${suffix}`;
}

interface Props {
  avatar?: string;
  initials: string;
  size?: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
}

export default function NpcAvatar({
  avatar, initials, size = 52,
  color = Colors.primaryDark,
  borderColor = '#f9dec1',
  borderWidth = 2,
}: Props) {
  const src = avatar ? npcImages[avatar] : null;
  const radius = size / 2;

  if (src) {
    return (
      <Image
        source={src}
        style={{
          width: size, height: size, borderRadius: radius,
          borderWidth, borderColor,
        }}
      />
    );
  }

  return (
    <View style={[
      styles.fallback,
      { width: size, height: size, borderRadius: radius, backgroundColor: color + '33', borderWidth, borderColor },
    ]}>
      <Text style={[styles.text, { fontSize: size * 0.38, color }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});
