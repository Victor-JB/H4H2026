/**
 * LiveVisionScreen.tsx
 *
 * Main screen displaying the live camera feed from ESP32.
 */

import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Esp32ConfigContext } from '../../App';
import type { RootStackNavigationProp } from '../types/navigation';

export default function LiveVisionScreen() {
  const navigation = useNavigation<RootStackNavigationProp<'LiveVision'>>();
  const { config } = useContext(Esp32ConfigContext);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Vision</Text>
      <Text style={styles.subtitle}>ESP32 IP: {config.ip}:{config.port}</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Settings')}
      >
        <Text style={styles.buttonText}>Open Settings</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1a73e8',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
