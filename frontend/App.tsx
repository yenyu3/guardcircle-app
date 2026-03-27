import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { AppState, Platform, View } from 'react-native';
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

  const isWeb = Platform.OS === 'web';

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FFF5E6" />
      {isWeb ? (
        <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#e8ddd5', height: '100dvh' as any, overflow: 'hidden' }}>
          <View style={{ width: '100%', maxWidth: 390, flex: 1, height: '100%', overflow: 'hidden' }}>
            <AppNavigator />
          </View>
        </View>
      ) : (
        <AppNavigator />
      )}
    </SafeAreaProvider>
  );
}
