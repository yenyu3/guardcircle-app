import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation';
import { useAppStore } from './src/store';

export default function App() {
  const { hasFamilyCircle, startFamilyPolling, stopFamilyPolling } = useAppStore();

  useEffect(() => {
    if (!hasFamilyCircle) return;
    startFamilyPolling();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') startFamilyPolling();
      else stopFamilyPolling();
    });
    return () => {
      stopFamilyPolling();
      sub.remove();
    };
  }, [hasFamilyCircle]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FFF5E6" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
