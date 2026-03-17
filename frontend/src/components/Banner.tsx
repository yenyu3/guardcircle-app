import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '../theme';

interface Props { message: string; variant?: 'warning' | 'danger' | 'info' }

export default function Banner({ message, variant = 'warning' }: Props) {
  const bg = variant === 'danger' ? Colors.dangerBg : variant === 'info' ? Colors.safeBg : Colors.warningBg;
  const color = variant === 'danger' ? Colors.danger : variant === 'info' ? Colors.safe : Colors.warning;
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderLeftColor: color }]}>
      <Text style={[styles.text, { color }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { borderLeftWidth: 4, borderRadius: Radius.sm, padding: 12, marginBottom: 12 },
  text: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
