import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '../theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'normal' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const GRAD_START = '#89502e';
const GRAD_END   = '#ffb38a';

export default function Button({ title, onPress, variant = 'primary', size = 'normal', disabled, loading, style }: Props) {
  const height = size === 'large' ? 60 : 48;
  const fontSize = size === 'large' ? 18 : 16;

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled || loading}
        style={[{ opacity: disabled ? 0.45 : 1 }, style]}
      >
        <LinearGradient
          colors={[GRAD_START, GRAD_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.btn, { height }]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={[styles.text, { color: '#fff', fontSize }]}>{title}</Text>
          }
        </LinearGradient>
      </Pressable>
    );
  }

  const bg = variant === 'danger' ? Colors.danger
    : variant === 'secondary' ? Colors.card
    : 'transparent';
  const textColor = variant === 'ghost' ? Colors.primary : variant === 'secondary' ? Colors.text : Colors.white;
  const borderColor = variant === 'ghost' ? Colors.primary : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn,
        { backgroundColor: bg, height, borderColor, borderWidth: variant === 'ghost' ? 1.5 : 0, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={textColor} />
        : <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  text: { fontWeight: '700', letterSpacing: 0.3 },
});
