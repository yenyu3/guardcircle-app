import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '../theme';

interface Props {
  message: string;
  variant?: 'warning' | 'danger' | 'info';
  onPress?: () => void;
  style?: object;
}

const variantConfig = {
  info:    { bg: '#fdf6ec', border: '#e8d5b7', text: Colors.text,      iconBg: '#f0e0c4', icon: 'people-outline' as const,              iconColor: Colors.primaryDark },
  warning: { bg: Colors.warningBg, border: Colors.warning, text: Colors.textLight, iconBg: '#fef3c7', icon: 'alert-circle-outline' as const, iconColor: Colors.warning },
  danger:  { bg: Colors.dangerBg,  border: '#E97A7A',      text: Colors.textLight, iconBg: '#fee2e2', icon: 'warning-outline' as const,       iconColor: '#E97A7A' },
};

export default function Banner({ message, variant = 'warning', onPress, style }: Props) {
  const { bg, border, text, iconBg, icon, iconColor } = variantConfig[variant];
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.banner, { backgroundColor: bg, borderColor: border }, style]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.text, { color: text }]}>{message}</Text>
      {onPress && <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: Radius.xl, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
