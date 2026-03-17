import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadow } from '../theme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'danger' | 'safe' | 'warning';
}

export default function Card({ children, style, variant = 'default' }: Props) {
  const bg = variant === 'danger' ? Colors.dangerBg
    : variant === 'safe' ? Colors.safeBg
    : variant === 'warning' ? Colors.warningBg
    : Colors.white;
  return (
    <View style={[styles.card, { backgroundColor: bg }, Shadow.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: 16 },
});
