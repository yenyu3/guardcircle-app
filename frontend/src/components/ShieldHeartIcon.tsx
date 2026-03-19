import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  size?: number;
  color?: string;
  bgColor?: string;
}

export default function ShieldHeartIcon({ size = 36, color = '#89502e', bgColor = '#fff8f1' }: Props) {
  const heartSize = Math.round(size * 0.39);
  const heartTop = Math.round(size * 0.28);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="shield" size={size} color={color} />
      <Ionicons name="heart" size={heartSize} color={bgColor} style={{ position: 'absolute', top: heartTop }} />
    </View>
  );
}
