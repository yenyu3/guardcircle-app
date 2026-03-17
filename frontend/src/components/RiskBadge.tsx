import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Typography } from '../theme';
import { RiskLevel } from '../types';

interface Props { level: RiskLevel; score?: number; size?: 'sm' | 'md' | 'lg' }

const config = {
  safe:   { label: '安全', bg: Colors.safeBg,    text: Colors.safe,    border: Colors.safe },
  medium: { label: '中風險', bg: Colors.warningBg, text: Colors.warning, border: Colors.warning },
  high:   { label: '高風險', bg: Colors.dangerBg,  text: Colors.danger,  border: Colors.danger },
};

export default function RiskBadge({ level, score, size = 'md' }: Props) {
  const c = config[level];
  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 11 : 13;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.text, { color: c.text, fontSize }]}>
        {c.label}{score !== undefined ? ` ${score}分` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: Radius.full, borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  text: { fontWeight: '700' },
});
