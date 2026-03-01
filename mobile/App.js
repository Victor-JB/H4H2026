/**
 * App.js
 *
 * Root component for the H4H Vision application.
 *
 * Responsibilities:
 *  - Loads persisted ESP32 configuration from AsyncStorage on startup.
 *  - Provides the configuration (and updater) to the entire component tree
 *    via Esp32ConfigContext.
 *  - Wraps the app in NavigationContainer and renders AppNavigator.
 */

import React, { useState, useEffect, createContext, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AppNavigator from './src/navigation/AppNavigator';
import { ESP32_DEFAULTS } from './src/services/ESP32Service';

// ---------------------------------------------------------------------------
// Esp32ConfigContext
//
// Provides { config, updateConfig } to all screens.
//   config       — current ESP32 settings object
//   updateConfig — function(newConfig) to update settings app-wide
// ---------------------------------------------------------------------------
export const Esp32ConfigContext = createContext({
  config: ESP32_DEFAULTS,
  updateConfig: () => {},
});

const STORAGE_KEY_ESP32_CONFIG = '@h4h_esp32_config';

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
export default function App() {
  const [esp32Config, setEsp32Config] = useState(ESP32_DEFAULTS);
  const [isReady, setIsReady] = useState(false);

  // Load persisted config from AsyncStorage on first mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_ESP32_CONFIG);
        if (stored) {
          const parsed = JSON.parse(stored);
          setEsp32Config((prev) => ({ ...prev, ...parsed }));
        }
      } catch (err) {
        console.warn('[App] Failed to load stored ESP32 config:', err);
      } finally {
        setIsReady(true);
      }
    })();
  }, []);

  const updateConfig = useCallback((newConfig) => {
    setEsp32Config((prev) => ({ ...prev, ...newConfig }));
  }, []);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1a73e8" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <Esp32ConfigContext.Provider value={{ config: esp32Config, updateConfig }}>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </Esp32ConfigContext.Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


