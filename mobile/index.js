/**
 * Entry point: registers the root component as "main" so the native app can mount it.
 * If App or its dependencies fail to load, we register a fallback that shows the error.
 */
import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

let RootComponent;

try {
  RootComponent = require('./App').default;
} catch (err) {
  const message = err?.message ?? String(err);
  console.error('[index] App failed to load:', message, err);

  RootComponent = function AppLoadError() {
    return (
      <ScrollView contentContainerStyle={styles.errorContainer}>
        <Text style={styles.errorTitle}>App failed to load</Text>
        <Text style={styles.errorMessage}>{message}</Text>
        <Text style={styles.errorHint}>
          If you see "Tflite could not be found", run: npx expo run:android (or run:ios)
        </Text>
      </ScrollView>
    );
  };
}

registerRootComponent(RootComponent);

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#111',
  },
  errorTitle: {
    color: '#f44',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  errorMessage: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  errorHint: {
    color: '#888',
    fontSize: 12,
  },
});

